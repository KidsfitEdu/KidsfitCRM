using System.Data;
using System.Text.Json;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed record ReturnSchoolContractRequest(string? Reason);
public sealed record ResubmitSchoolContractRequest(long? EvidenceId);

/// <summary>
/// Manager contract workflow. Authorization and scope are enforced in SQL, not by the UI.
/// File evidence is retained across revisions; a forwarded case is visible to CHECKEE.
/// </summary>
public static class ManagerContractEndpoints
{
    public static void MapManagerContractOperations(this RouteGroupBuilder group)
    {
        group.MapGet("/school-contracts/reviews", List).RequireAuthorization(Permissions.SchoolContractReview);
        group.MapGet("/school-contracts/{id:long}/review-detail", Detail).RequireAuthorization(Permissions.ChannelSalesView);
        group.MapPost("/school-contracts/{id:long}/request-revision", ReturnForRevision)
            .RequireAuthorization(Permissions.SchoolContractReview);
        group.MapPost("/school-contracts/{id:long}/resubmit", Resubmit)
            .RequireAuthorization(Permissions.ChannelSalesReportContract);
    }

    private static IQueryable<SalesContract> ManagerScope(KidsfitDbContext db, ChannelSalesAccess access) =>
        db.SalesContracts.Where(c => c.RequiresSchoolVerification &&
            (access.All || (access.Organization && access.OrganizationIds.Contains(c.OwnerOrganizationId))));

    private static async Task<IResult> List(HttpContext http, KidsfitDbContext db,
        string? search, string? status, int? page, int? page_size, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var query = ManagerScope(db, access).AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            var selected = status.Trim().ToUpperInvariant();
            if (selected is not ("PENDING_REVIEW" or "MANAGER_REVIEWED" or "NEEDS_REVISION" or "PENDING_KIDSFIT" or "ACTIVE" or "CANCELLED"))
                throw ApiValidationException.For("status", "Trạng thái hợp đồng không hợp lệ.");
            query = query.Where(x => x.Status == selected);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(x => x.ContractCode.Contains(term)
                || db.ChannelCustomers.Any(c => c.Id == x.CustomerId && c.DisplayName.Contains(term))
                || db.Users.Any(u => u.Id == x.OwnerUserId && u.Name.Contains(term)));
        }
        var number = Math.Max(1, page ?? 1);
        var size = Math.Clamp(page_size ?? 20, 1, 100);
        var total = await query.CountAsync(ct);
        var rows = await (from contract in query
                          join school in db.ChannelCustomers.AsNoTracking() on contract.CustomerId equals school.Id
                          join owner in db.Users.AsNoTracking() on contract.OwnerUserId equals owner.Id
                          orderby (contract.Status == "PENDING_REVIEW" ? 0 : contract.Status == "NEEDS_REVISION" ? 1 : 2),
                                  contract.CreatedAt descending, contract.Id descending
                          select new
                          {
                              id = contract.Id,
                              school_name = school.DisplayName,
                              sales_name = owner.Name,
                              contract_code = contract.ContractCode,
                              total_value = contract.TotalValue,
                              status = contract.Status,
                              can_review = contract.Status == "PENDING_REVIEW" && access.Has(Permissions.SchoolContractReview)
                                  && (access.All || access.OrganizationIds.Contains(contract.OwnerOrganizationId)),
                              can_return = contract.Status == "PENDING_REVIEW" && access.Has(Permissions.SchoolContractReview)
                                  && (access.All || access.OrganizationIds.Contains(contract.OwnerOrganizationId)),
                          })
                         .Skip((number - 1) * size).Take(size).ToArrayAsync(ct);
        return Results.Ok(new { data = rows, total, page = number, page_size = size });
    }

    private static async Task<IResult> Detail(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var scoped = access.Has(Permissions.SchoolContractReview) ? ManagerScope(db, access) : access.Contracts(db);
        var contract = await (from c in scoped.AsNoTracking().Where(x => x.Id == id && x.RequiresSchoolVerification)
                              join customer in db.ChannelCustomers.AsNoTracking() on c.CustomerId equals customer.Id
                              join owner in db.Users.AsNoTracking() on c.OwnerUserId equals owner.Id
                              select new {
                                  id = c.Id, c.ContractCode, c.SignedOn, c.EffectiveOn, c.TotalValue,
                                  c.Status, c.ServicePlan, c.StudentCount, c.EvidenceReference, c.SchoolUnitIdsJson,
                                  c.ManagerReviewedAt, c.VerifiedAt, c.OwnerUserId, c.OwnerOrganizationId, c.ReportedByUserId,
                                  school_name = customer.DisplayName, school_address = customer.Address,
                                  school_province = customer.Province, sales_name = owner.Name
                              }).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();

        var files = await db.FinancialEvidences.AsNoTracking()
            .Where(x => x.ContractId == id && x.Kind == "CONTRACT" && x.AttachedAt != null)
            .OrderByDescending(x => x.AttachedAt)
            .Select(x => new { id = x.Id, file_name = x.FileName, mime_type = x.MimeType, created_at = x.CreatedAt })
            .ToArrayAsync(ct);
        var installments = await db.RevenueSchedules.AsNoTracking().Where(x => x.ContractId == id)
            .OrderBy(x => x.DueOn).Select(x => new { due_on = x.DueOn, amount = x.AmountDue, status = x.Status }).ToArrayAsync(ct);
        var unitIds = JsonSerializer.Deserialize<long[]>(contract.SchoolUnitIdsJson ?? "[]") ?? [];
        var units = await db.SchoolUnits.AsNoTracking().Where(x => unitIds.Contains(x.Id))
            .Select(x => new { id = x.Id, name = x.Name }).ToArrayAsync(ct);
        var history = await (from r in db.ReconciliationCases.AsNoTracking().Where(r => r.ContractId == id)
                             join e in db.ReconciliationEvents.AsNoTracking() on r.Id equals e.ReconciliationCaseId
                             join actor in db.Users.AsNoTracking() on e.ActorUserId equals actor.Id
                             orderby e.CreatedAt, e.Id
                             select new { event_type = e.EventType, reason = e.Reason, created_at = e.CreatedAt, actor_name = actor.Name })
                            .ToArrayAsync(ct);
        return Results.Ok(new {
            data = new {
                contract.id, contract.ContractCode, contract.SignedOn, contract.EffectiveOn,
                contract.TotalValue, contract.Status, contract.ServicePlan, contract.StudentCount,
                contract.EvidenceReference, contract.ManagerReviewedAt, contract.VerifiedAt,
                contract.school_name, contract.school_address, contract.school_province, contract.sales_name,
                can_review = contract.Status == "PENDING_REVIEW" && access.Has(Permissions.SchoolContractReview)
                    && (access.All || (access.CanManageOrganization(contract.OwnerOrganizationId)
                        && contract.OwnerUserId != access.UserId)),
                can_resubmit = contract.Status == "NEEDS_REVISION" && access.Has(Permissions.ChannelSalesReportContract)
                    && (contract.OwnerUserId == access.UserId || contract.ReportedByUserId == access.UserId)
            },
            evidence = files, installments, school_units = units, history
        });
    }

    private static async Task<IResult> ReturnForRevision(long id, ReturnSchoolContractRequest request,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var reason = Validation.Required(request.Reason, "reason", "Vui lòng nhập lý do yêu cầu bổ sung.", 2000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var contract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.Has(Permissions.SchoolContractReview)
            || !access.CanManageOrganization(contract.OwnerOrganizationId)
            || !await ManagerScope(db, access).AnyAsync(x => x.Id == id, ct))
            throw new KeyNotFoundException();
        if (contract.Status != "PENDING_REVIEW") throw new ApiConflictException("Chỉ trả bổ sung hồ sơ đang chờ Quản lý.");
        var now = DateTime.UtcNow;
        contract.Status = "NEEDS_REVISION";
        contract.UpdatedAt = now;
        var reconciliation = await db.ReconciliationCases.SingleOrDefaultAsync(x => x.ContractId == id, ct);
        if (reconciliation is not null)
        {
            reconciliation.Status = "AWAITING_MANAGER";
            reconciliation.UpdatedAt = now;
            db.ReconciliationEvents.Add(new ReconciliationEvent { ReconciliationCaseId = reconciliation.Id,
                ActorUserId = http.UserId(), EventType = "MANAGER_REQUESTED_REVISION", Reason = reason, CreatedAt = now, UpdatedAt = now });
        }
        Audit.Add(db, http.UserId(), "REQUEST_SCHOOL_CONTRACT_REVISION", nameof(SalesContract), id,
            new { status = "PENDING_REVIEW" }, new { contract.Status, reason }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.Ok(new { message = "Đã trả hồ sơ để Sales bổ sung." });
    }

    private static async Task<IResult> Resubmit(long id, ResubmitSchoolContractRequest request,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!request.EvidenceId.HasValue) throw ApiValidationException.For("evidence_id", "Cần tải lại file hợp đồng bổ sung.");
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var contract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.Has(Permissions.ChannelSalesReportContract)
            || !await access.Contracts(db).AnyAsync(x => x.Id == id, ct)
            || (contract.OwnerUserId != http.UserId() && contract.ReportedByUserId != http.UserId()))
            throw new KeyNotFoundException();
        if (contract.Status != "NEEDS_REVISION") throw new ApiConflictException("Hợp đồng không ở bước cần bổ sung.");
        var evidence = await db.FinancialEvidences.FromSqlInterpolated($"SELECT * FROM financial_evidences WHERE id = {request.EvidenceId.Value} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (evidence.Kind != "CONTRACT" || evidence.ContractId.HasValue || evidence.AttachedAt.HasValue
            || evidence.UploadedByUserId != http.UserId()) throw new KeyNotFoundException();
        var now = DateTime.UtcNow;
        evidence.ContractId = id;
        evidence.AttachedAt = now;
        evidence.UpdatedAt = now;
        contract.Status = "PENDING_REVIEW";
        contract.ManagerReviewedAt = null;
        contract.ManagerReviewedByUserId = null;
        contract.UpdatedAt = now;
        var reconciliation = await db.ReconciliationCases.SingleOrDefaultAsync(x => x.ContractId == id, ct);
        if (reconciliation is not null)
        {
            reconciliation.Status = "AWAITING_MANAGER";
            reconciliation.UpdatedAt = now;
            db.ReconciliationEvents.Add(new ReconciliationEvent { ReconciliationCaseId = reconciliation.Id,
                ActorUserId = http.UserId(), EventType = "SALES_RESUBMITTED", CreatedAt = now, UpdatedAt = now });
        }
        Audit.Add(db, http.UserId(), "RESUBMIT_SCHOOL_CONTRACT", nameof(SalesContract), id,
            new { status = "NEEDS_REVISION" }, new { contract.Status, evidence_id = evidence.Id }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.Ok(new { message = "Đã bổ sung hợp đồng, chuyển lại Quản lý kiểm tra." });
    }
}

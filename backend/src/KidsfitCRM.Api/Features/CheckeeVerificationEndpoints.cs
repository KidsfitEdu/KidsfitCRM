using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>
/// CHECKEE-only read model. Uses the existing reconciliation workflow and event history;
/// verification writes still go through ChannelSalesActions.Reconcile.
/// </summary>
internal static class CheckeeVerificationEndpoints
{
    internal static void Map(RouteGroupBuilder group)
    {
        group.MapGet("/checkee/verifications", List).RequireAuthorization(Permissions.ChannelSalesReconcile);
        group.MapGet("/checkee/verifications/{id:long}", Detail).RequireAuthorization(Permissions.ChannelSalesReconcile);
    }

    private static IQueryable<Domain.ReconciliationCase> Scope(KidsfitDbContext db, ChannelSalesAccess access)
    {
        // A CHECKEE membership sees only its own organization's handed-off cases,
        // never all contracts merely because it holds a customer-view permission.
        return db.ReconciliationCases.AsNoTracking()
            .Where(r => access.OrganizationIds.Contains(r.CheckeeOrganizationId))
            .Where(r => db.SalesContracts.Any(c => c.Id == r.ContractId
                && (!c.RequiresSchoolVerification ||
                    (c.ManagerReviewedAt != null
                     && c.Status != "PENDING_REVIEW"
                     && c.Status != "NEEDS_REVISION"))));
    }

    internal static async Task<IResult> List(HttpContext http, KidsfitDbContext db,
        string? search, string? status, int? page, int? page_size, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesReconcile)) return Results.Forbid();

        var scoped = Scope(db, access);
        var summary = new
        {
            pending = await scoped.CountAsync(r => r.Status == "PENDING", ct),
            feedback = await scoped.CountAsync(r => r.Status == "DISPUTED", ct),
            confirmed = await scoped.CountAsync(r => r.Status == "CONFIRMED", ct)
        };
        var query = scoped;
        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            var selected = status.Trim().ToUpperInvariant();
            if (selected is not ("PENDING" or "DISPUTED" or "CONFIRMED"))
                throw ApiValidationException.For("status", "Trạng thái xác minh không hợp lệ.");
            query = query.Where(r => r.Status == selected);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            if (term.Length > 150) throw ApiValidationException.For("search", "Từ khóa tìm kiếm tối đa 150 ký tự.");
            query = query.Where(r => db.SalesContracts.Any(c => c.Id == r.ContractId
                    && (c.ContractCode.Contains(term)
                        || db.Users.Any(u => u.Id == c.OwnerUserId && u.Name.Contains(term))))
                || db.ChannelCustomers.Any(c => c.Id == r.CustomerId && c.DisplayName.Contains(term)));
        }

        var number = Math.Clamp(page ?? 1, 1, 100_000);
        var size = Math.Clamp(page_size ?? 20, 1, 100);
        var total = await query.CountAsync(ct);
        var rows = await (from reconciliation in query
                          join customer in db.ChannelCustomers.AsNoTracking() on reconciliation.CustomerId equals customer.Id
                          join contract in db.SalesContracts.AsNoTracking() on reconciliation.ContractId equals contract.Id
                          join owner in db.Users.AsNoTracking() on contract.OwnerUserId equals owner.Id
                          orderby (reconciliation.Status == "PENDING" ? 0 : 1),
                                  reconciliation.OpenedAt descending, reconciliation.Id descending
                          select new
                          {
                              id = reconciliation.Id,
                              contract_id = reconciliation.ContractId,
                              school_name = customer.DisplayName,
                              sales_name = owner.Name,
                              contract_code = contract.ContractCode,
                              signed_on = contract.SignedOn,
                              received_at = db.ReconciliationEvents
                                  .Where(e => e.ReconciliationCaseId == reconciliation.Id && e.EventType == "MANAGER_FORWARDED")
                                  .OrderByDescending(e => e.CreatedAt).Select(e => (DateTime?)e.CreatedAt).FirstOrDefault(),
                              status = reconciliation.Status,
                              can_verify = reconciliation.Status == "PENDING",
                              can_feedback = reconciliation.Status == "PENDING"
                          }).Skip((number - 1) * size).Take(size).ToArrayAsync(ct);

        return Results.Ok(new { data = rows, total, page = number, page_size = size, summary });
    }

    internal static async Task<IResult> Detail(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesReconcile)) return Results.Forbid();

        var item = await (from reconciliation in Scope(db, access).Where(r => r.Id == id)
                          join contract in db.SalesContracts.AsNoTracking() on reconciliation.ContractId equals contract.Id
                          join customer in db.ChannelCustomers.AsNoTracking() on reconciliation.CustomerId equals customer.Id
                          join owner in db.Users.AsNoTracking() on contract.OwnerUserId equals owner.Id
                          select new
                          {
                              id = reconciliation.Id,
                              contract_id = contract.Id,
                              contract_code = contract.ContractCode,
                              school_name = customer.DisplayName,
                              school_address = customer.Address,
                              school_province = customer.Province,
                              sales_name = owner.Name,
                              signed_on = contract.SignedOn,
                              total_value = contract.TotalValue,
                              service_plan = contract.ServicePlan,
                              student_count = contract.StudentCount,
                              evidence_reference = contract.EvidenceReference,
                              contract_status = contract.Status,
                              reconciliation_status = reconciliation.Status,
                              dispute_reason = reconciliation.DisputeReason,
                              can_verify = reconciliation.Status == "PENDING",
                              can_feedback = reconciliation.Status == "PENDING"
                          }).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();

        var evidence = await db.FinancialEvidences.AsNoTracking()
            .Where(f => f.ContractId == item.contract_id && f.Kind == "CONTRACT" && f.AttachedAt != null)
            .OrderByDescending(f => f.AttachedAt)
            .Select(f => new { id = f.Id, file_name = f.FileName, mime_type = f.MimeType, created_at = f.CreatedAt })
            .ToArrayAsync(ct);
        var installments = await db.RevenueSchedules.AsNoTracking()
            .Where(s => s.ContractId == item.contract_id)
            .OrderBy(s => s.DueOn)
            .Select(s => new { due_on = s.DueOn, amount = s.AmountDue, status = s.Status })
            .ToArrayAsync(ct);
        var history = await (from e in db.ReconciliationEvents.AsNoTracking()
                             join actor in db.Users.AsNoTracking() on e.ActorUserId equals actor.Id
                             where e.ReconciliationCaseId == id
                             orderby e.CreatedAt, e.Id
                             select new { event_type = e.EventType, reason = e.Reason,
                                 created_at = e.CreatedAt, actor_name = actor.Name })
                            .ToArrayAsync(ct);

        return Results.Ok(new { data = item, evidence, installments, history });
    }
}

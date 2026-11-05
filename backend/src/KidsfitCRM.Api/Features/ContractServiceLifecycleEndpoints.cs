using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed record SubmitServiceTermRequest(DateOnly StartOn, DateOnly EndOn, string? BillingCycle, string? EvidenceReference);
public sealed record ReviewServiceTermRequest(bool Approve, string? Reason = null);

/// <summary>Independent annual service periods; neither submission nor renewal changes 5-year ownership.</summary>
public static class ContractServiceLifecycleEndpoints
{
    public static void Map(RouteGroupBuilder group)
    {
        group.MapGet("/contract-lifecycle/contracts", Contracts).RequireAuthorization();
        group.MapGet("/contract-lifecycle/terms", List).RequireAuthorization();
        group.MapPost("/contracts/{id:long}/service-terms", Submit).RequireAuthorization(Permissions.ChannelSalesReportContract);
        group.MapPost("/contract-lifecycle/terms/{id:long}/manager-review", ManagerReview)
            .RequireAuthorization(Permissions.SchoolContractReview);
        group.MapPost("/contract-lifecycle/terms/{id:long}/checkee-review", CheckeeReview)
            .RequireAuthorization(Permissions.ChannelSalesReconcile);
        group.MapGet("/contract-lifecycle/alerts", Alerts).RequireAuthorization();
        group.MapPost("/contract-lifecycle/alerts/{id:long}/read", ReadAlert).RequireAuthorization();
        group.MapGet("/contract-lifecycle/overview", Overview).RequireAuthorization();
    }

    private static IQueryable<SalesContract> ReadableContracts(KidsfitDbContext db, ChannelSalesAccess access)
    {
        if (access.Has(Permissions.ChannelSalesReconcile))
        {
            var checkeeIds = db.ReconciliationCases.Where(r => access.OrganizationIds.Contains(r.CheckeeOrganizationId))
                .Select(r => r.ContractId);
            return db.SalesContracts.Where(c => checkeeIds.Contains(c.Id));
        }
        if (!access.Has(Permissions.ChannelSalesView) &&
            !access.Has(Permissions.ChannelSalesCommissionView) &&
            !access.Has(Permissions.SchoolSupportManage))
            throw new KeyNotFoundException();
        return access.Contracts(db);
    }

    private static async Task<IResult> Contracts(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var scoped = ReadableContracts(db, access).Where(c => c.VerifiedAt != null && c.Status == "ACTIVE");
        var rows = await scoped.OrderByDescending(c => c.VerifiedAt).Take(100)
            .Select(c => new {
                id = c.Id, customer_id = c.CustomerId, contract_code = c.ContractCode,
                school_name = db.ChannelCustomers.Where(x => x.Id == c.CustomerId)
                    .Select(x => x.DisplayName).FirstOrDefault(),
                owner_user_id = c.OwnerUserId, signed_on = c.SignedOn,
                protection_until = db.CustomerProtections.Where(p => p.ContractId == c.Id &&
                    p.SourceType == "CONTRACT" && p.Status == "ACTIVE")
                    .Select(p => (DateTime?)p.EffectiveUntil).FirstOrDefault(),
                service_end_on = db.ContractServiceTerms.Where(t => t.CustomerId == c.CustomerId && t.Status == "ACTIVE")
                    .OrderByDescending(t => t.EndOn).Select(t => (DateOnly?)t.EndOn).FirstOrDefault()
            }).ToArrayAsync(ct);
        return Results.Ok(new { data = rows });
    }

    private static async Task<IResult> List(long? contract_id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var scopedContracts = ReadableContracts(db, access).Select(x => x.Id);
        var terms = db.ContractServiceTerms.AsNoTracking().Where(x => scopedContracts.Contains(x.ContractId));
        if (contract_id.HasValue) terms = terms.Where(x => x.ContractId == contract_id.Value);
        var rows = await terms.OrderByDescending(x => x.StartOn).ThenByDescending(x => x.Id).Take(100)
            .Select(x => new { id = x.Id, contract_id = x.ContractId, customer_id = x.CustomerId,
                term_number = x.TermNumber, start_on = x.StartOn, end_on = x.EndOn,
                billing_cycle = x.BillingCycle, status = x.Status, evidence_reference = x.EvidenceReference,
                verified_at = x.VerifiedAt }).ToArrayAsync(ct);
        return Results.Ok(new { data = rows });
    }

    internal static async Task<IResult> Submit(long id, SubmitServiceTermRequest request,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var cycle = (request.BillingCycle ?? "").Trim().ToUpperInvariant();
        if (cycle is not ("MONTHLY" or "YEARLY")) throw ApiValidationException.For("billing_cycle", "Chọn thanh toán theo tháng hoặc năm.");
        if (request.EndOn < request.StartOn || request.EndOn >= request.StartOn.AddYears(1))
            throw ApiValidationException.For("end_on", "Một kỳ dịch vụ phải có thời hạn hợp lệ, tối đa một năm.");
        var evidence = Validation.Required(request.EvidenceReference, "evidence_reference", "Cần mã hồ sơ/phụ lục tái ký để CHECKEE xác minh.", 500);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        // Match the lifecycle sweep and approach registration lock order: customer, then contract.
        // This serializes renewal submission with a concurrent 12-month release decision.
        var customerId = await db.SalesContracts.AsNoTracking().Where(c => c.Id == id)
            .Select(c => (long?)c.CustomerId).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        _ = await db.ChannelCustomers.FromSqlInterpolated(
            $"SELECT * FROM channel_customers WHERE id = {customerId} FOR UPDATE").SingleOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException();
        var contract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!await access.Contracts(db).AnyAsync(x => x.Id == id && x.OwnerUserId == access.UserId, ct)
            || contract.Status != "ACTIVE" || contract.VerifiedAt == null)
            throw new KeyNotFoundException();
        // Once the five-year cycle ends, the old Sales must register again through
        // the normal contention-safe approach -> Manager -> CHECKEE -> KIDSFIT workflow.
        if (!await db.CustomerProtections.AnyAsync(p => p.CustomerId == contract.CustomerId &&
            p.ContractId == contract.Id && p.OwnerUserId == access.UserId &&
            p.SourceType == "CONTRACT" && p.Status == "ACTIVE" && p.EffectiveUntil > DateTime.UtcNow, ct))
            throw new ApiConflictException("Quyền bảo vệ 5 năm đã kết thúc. Vui lòng đăng ký tiếp cận lại trước khi nộp kỳ hợp đồng mới.");
        var existing = await db.ContractServiceTerms.Where(x => x.ContractId == id).OrderByDescending(x => x.TermNumber).ToListAsync(ct);
        if (existing.Any(x => x.Status is "PENDING_MANAGER" or "PENDING_CHECKEE"))
            throw new ApiConflictException("Đã có kỳ dịch vụ đang chờ duyệt hoặc xác minh.");
        if (existing.Any(x => x.Status == "ACTIVE" && request.StartOn <= x.EndOn && request.EndOn >= x.StartOn))
            throw new ApiConflictException("Kỳ dịch vụ trùng thời hạn đã được CHECKEE xác minh.");
        var now = DateTime.UtcNow;
        var term = new ContractServiceTerm {
            ContractId = id, CustomerId = contract.CustomerId,
            TermNumber = (existing.Count == 0 ? 0 : existing.Max(x => x.TermNumber)) + 1,
            StartOn = request.StartOn, EndOn = request.EndOn, BillingCycle = cycle,
            Status = "PENDING_MANAGER", EvidenceReference = evidence,
            SubmittedByUserId = access.UserId, CreatedAt = now, UpdatedAt = now
        };
        db.ContractServiceTerms.Add(term);
        await db.SaveChangesAsync(ct);
        db.ContractServiceEvents.Add(new ContractServiceEvent {
            CustomerId = contract.CustomerId, ServiceTermId = term.Id, ActorUserId = access.UserId,
            Kind = "TERM_SUBMITTED", Reason = "Sales gửi kỳ sử dụng phần mềm chờ Quản lý kiểm tra.",
            CreatedAt = now, UpdatedAt = now
        });
        Audit.Add(db, access.UserId, "SUBMIT_SERVICE_TERM", nameof(ContractServiceTerm), term.Id, null,
            new { term.ContractId, term.StartOn, term.EndOn, term.BillingCycle, term.Status }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.Created($"/api/channel-sales/contract-lifecycle/terms?contract_id={id}", new { data = new { id = term.Id } });
    }

    internal static async Task<IResult> ManagerReview(long id, ReviewServiceTermRequest request,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var term = await db.ContractServiceTerms.FromSqlInterpolated($"SELECT * FROM contract_service_terms WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        var contract = await db.SalesContracts.SingleOrDefaultAsync(x => x.Id == term.ContractId, ct) ?? throw new KeyNotFoundException();
        var directManager = await db.OrganizationMemberships.AnyAsync(m =>
            m.UserId == contract.OwnerUserId && m.OrganizationId == contract.OwnerOrganizationId &&
            m.ManagerUserId == access.UserId && (m.Status == "ACTIVE" || m.Status == "SUSPENDED"), ct);
        if (!directManager && !access.All) throw new KeyNotFoundException();
        if (contract.OwnerUserId == access.UserId || term.Status != "PENDING_MANAGER")
            throw new ApiConflictException("Yêu cầu không thể duyệt ở trạng thái hiện tại.");
        var now = DateTime.UtcNow;
        term.Status = request.Approve ? "PENDING_CHECKEE" : "REJECTED"; term.UpdatedAt = now;
        var reason = request.Approve ? "Quản lý chuyển CHECKEE xác minh." :
            Validation.Required(request.Reason, "reason", "Cần nhập lý do từ chối.", 2000);
        db.ContractServiceEvents.Add(new ContractServiceEvent {
            CustomerId = term.CustomerId, ServiceTermId = term.Id, ActorUserId = access.UserId,
            Kind = request.Approve ? "MANAGER_FORWARDED" : "MANAGER_REJECTED", Reason = reason,
            CreatedAt = now, UpdatedAt = now
        });
        Audit.Add(db, access.UserId, "REVIEW_SERVICE_TERM", nameof(ContractServiceTerm), term.Id,
            new { status = "PENDING_MANAGER" }, new { term.Status, reason }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return Results.Ok(new { success = true, status = term.Status });
    }

    internal static async Task<IResult> CheckeeReview(long id, ReviewServiceTermRequest request,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!await db.OrganizationMemberships.AnyAsync(m => m.UserId == access.UserId && m.Status == "ACTIVE" &&
            db.Organizations.Any(o => o.Id == m.OrganizationId && o.Code == "CHECKEE" && o.Status == "ACTIVE"), ct))
            throw new KeyNotFoundException();
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var term = await db.ContractServiceTerms.FromSqlInterpolated($"SELECT * FROM contract_service_terms WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (term.Status != "PENDING_CHECKEE") throw new ApiConflictException("Kỳ dịch vụ không chờ CHECKEE xác minh.");
        var checkeeScope = await db.ReconciliationCases.AnyAsync(r => r.ContractId == term.ContractId &&
            access.OrganizationIds.Contains(r.CheckeeOrganizationId) && r.Status == "CONFIRMED", ct);
        if (!checkeeScope) throw new KeyNotFoundException();
        if (request.Approve && await db.ContractServiceTerms.AnyAsync(x => x.CustomerId == term.CustomerId &&
                x.Id != term.Id && x.Status == "ACTIVE" && x.StartOn <= term.EndOn && x.EndOn >= term.StartOn, ct))
            throw new ApiConflictException("Kỳ dịch vụ đã được xác minh trùng thời hạn.");
        var now = DateTime.UtcNow;
        term.Status = request.Approve ? "ACTIVE" : "REJECTED";
        term.VerifiedAt = request.Approve ? now : null;
        term.VerifiedByUserId = request.Approve ? access.UserId : null;
        term.UpdatedAt = now;
        var reason = request.Approve ? "CHECKEE xác nhận kỳ sử dụng hợp lệ; không gia hạn quyền bảo vệ Sales." :
            Validation.Required(request.Reason, "reason", "Cần nhập lý do từ chối xác minh.", 2000);
        db.ContractServiceEvents.Add(new ContractServiceEvent {
            CustomerId = term.CustomerId, ServiceTermId = term.Id, ActorUserId = access.UserId,
            Kind = request.Approve ? "TERM_VERIFIED" : "TERM_REJECTED", Reason = reason,
            CreatedAt = now, UpdatedAt = now
        });
        Audit.Add(db, access.UserId, "VERIFY_SERVICE_TERM", nameof(ContractServiceTerm), term.Id,
            new { status = "PENDING_CHECKEE" }, new { term.Status, term.VerifiedAt, reason }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return Results.Ok(new { success = true, status = term.Status });
    }

    private static async Task<IResult> Alerts(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var scopedCustomers = ReadableContracts(db, access).Select(x => x.CustomerId);
        var mine = db.ContractLifecycleAlerts.AsNoTracking().Where(x =>
            x.RecipientUserId == access.UserId && scopedCustomers.Contains(x.CustomerId));
        var count = await mine.CountAsync(x => x.ReadAt == null, ct);
        var rows = await mine.OrderByDescending(x => x.CreatedAt).Take(100)
            .Select(x => new { x.Id, x.Kind, x.CustomerId, x.ServiceTermId, x.DeadlineOn, x.ReadAt, x.CreatedAt,
                school_name = db.ChannelCustomers.Where(c => c.Id == x.CustomerId).Select(c => c.DisplayName).FirstOrDefault() })
            .ToArrayAsync(ct);
        return Results.Ok(new { unread_count = count, data = rows });
    }

    private static async Task<IResult> ReadAlert(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var scope = ReadableContracts(db, access).Select(x => x.CustomerId);
        var mine = db.ContractLifecycleAlerts.Where(x => x.Id == id && x.RecipientUserId == access.UserId &&
            scope.Contains(x.CustomerId));
        if (!await mine.AnyAsync(ct)) throw new KeyNotFoundException();
        await mine.Where(x => x.ReadAt == null)
            .ExecuteUpdateAsync(x => x.SetProperty(n => n.ReadAt, DateTime.UtcNow).SetProperty(n => n.UpdatedAt, DateTime.UtcNow), ct);
        return Results.Ok(new { success = true });
    }

    private static async Task<IResult> Overview(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var ids = ReadableContracts(db, access).Select(c => c.Id);
        var today = ChannelSalesValidation.BusinessDate(DateTime.UtcNow);
        var terms = db.ContractServiceTerms.AsNoTracking().Where(t => ids.Contains(t.ContractId) && t.Status == "ACTIVE");
        return Results.Ok(new { data = new {
            active_terms = await terms.CountAsync(t => t.StartOn <= today && t.EndOn >= today, ct),
            expiring_30_days = await terms.CountAsync(t => t.EndOn >= today && t.EndOn <= today.AddDays(30), ct),
            expired_terms = await terms.CountAsync(t => t.EndOn < today, ct),
            awaiting_verification = await db.ContractServiceTerms.CountAsync(t => ids.Contains(t.ContractId) &&
                (t.Status == "PENDING_MANAGER" || t.Status == "PENDING_CHECKEE"), ct)
        } });
    }
}

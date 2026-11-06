using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>
/// KC-02: Sales sends yearly renewal directly to Accounting.
/// This feature never calls CHECKEE, changes the original contract/ownership,
/// creates payment schedules or accrues commissions.
/// </summary>
public static class ContractRenewalEndpoints
{
    public sealed record SubmitRequest(string? IdempotencyKey, DateOnly? SignedOn,
        DateOnly? ServiceStartOn, DateOnly? ServiceEndOn, string? PaymentCycle,
        decimal TotalValue, long? EvidenceId);
    public sealed record DecisionRequest(string? Reason);

    public static void Map(RouteGroupBuilder channel)
    {
        channel.MapGet("/contracts/{contractId:long}/renewals", Mine).RequireAuthorization(Permissions.ContractRenewalSubmit);
        channel.MapPost("/contracts/{contractId:long}/renewals", Submit).RequireAuthorization(Permissions.ContractRenewalSubmit);
        channel.MapPost("/renewals/{id:long}/resubmit", Resubmit).RequireAuthorization(Permissions.ContractRenewalSubmit);
        channel.MapGet("/accounting/renewals", Queue).RequireAuthorization(Permissions.ContractRenewalReview);
        channel.MapGet("/accounting/renewals/{id:long}", Detail).RequireAuthorization(Permissions.ContractRenewalReview);
        channel.MapPost("/accounting/renewals/{id:long}/request-info", RequestInfo).RequireAuthorization(Permissions.ContractRenewalReview);
        channel.MapPost("/accounting/renewals/{id:long}/reject", Reject).RequireAuthorization(Permissions.ContractRenewalConfirm);
        channel.MapPost("/accounting/renewals/{id:long}/confirm", Confirm).RequireAuthorization(Permissions.ContractRenewalConfirm);
    }

    private static async Task<SalesContract> Source(KidsfitDbContext db, ChannelSalesAccess access,
        long contractId, bool sales, CancellationToken ct)
    {
        var contract = await access.Contracts(db).AsNoTracking().SingleOrDefaultAsync(x => x.Id == contractId, ct)
            ?? throw new KeyNotFoundException();
        if (contract.VerifiedAt is null || contract.Status != "ACTIVE" ||
            await db.ContractCancellations.AnyAsync(x => x.ContractId == contractId, ct))
            throw new ApiConflictException("Chỉ được tái ký hợp đồng gốc đã xác minh và đang hợp lệ.");
        if (sales && (contract.OwnerUserId != access.UserId ||
            !await db.CustomerProtections.AnyAsync(p => p.ContractId == contractId
                && p.OwnerUserId == access.UserId && p.OwnerOrganizationId == contract.OwnerOrganizationId
                && p.SourceType == "CONTRACT" && p.Status == "ACTIVE"
                && p.EffectiveFrom <= DateTime.UtcNow && p.EffectiveUntil > DateTime.UtcNow, ct)))
            throw new KeyNotFoundException();
        if (!sales && !access.CanManageOrganization(contract.OwnerOrganizationId))
            throw new KeyNotFoundException();
        return contract;
    }

    private static void Validate(SubmitRequest request)
    {
        if (!request.SignedOn.HasValue) throw ApiValidationException.For("signed_on", "Thiếu ngày ký hợp đồng tái ký.");
        if (request.SignedOn.Value > ChannelSalesValidation.BusinessDate(DateTime.UtcNow))
            throw ApiValidationException.For("signed_on", "Ngày ký không được trong tương lai.");
        if (!request.ServiceStartOn.HasValue || !request.ServiceEndOn.HasValue)
            throw ApiValidationException.For("service_start_on", "Cần ngày bắt đầu và kết thúc theo hợp đồng đã ký.");
        if (request.ServiceStartOn.Value > request.ServiceEndOn.Value)
            throw ApiValidationException.For("service_end_on", "Ngày kết thúc phải từ ngày bắt đầu.");
        if ((request.PaymentCycle ?? "").Trim().ToUpperInvariant() is not ("MONTHLY" or "YEARLY"))
            throw ApiValidationException.For("payment_cycle", "Chỉ hỗ trợ thanh toán theo tháng hoặc theo năm.");
        ChannelSalesValidation.WholeDong(request.TotalValue, "total_value");
        if (!request.EvidenceId.HasValue) throw ApiValidationException.For("evidence_id", "Bắt buộc đính kèm hợp đồng tái ký đã ký.");
    }

    private static async Task<FinancialEvidence> Proof(KidsfitDbContext db, long? evidenceId,
        long actorId, CancellationToken ct)
    {
        if (!evidenceId.HasValue) throw ApiValidationException.For("evidence_id", "Thiếu file hợp đồng tái ký.");
        var proof = await db.FinancialEvidences.FromSqlInterpolated(
            $"SELECT * FROM financial_evidences WHERE id = {evidenceId.Value} FOR UPDATE").SingleOrDefaultAsync(ct);
        if (proof is null || proof.Kind != "RENEWAL" || proof.UploadedByUserId != actorId
            || proof.AttachedAt.HasValue || proof.ContractRenewalId.HasValue || proof.ContractId.HasValue)
            throw new KeyNotFoundException();
        return proof;
    }

    private static void Event(KidsfitDbContext db, ContractRenewal r, long actorId, string kind,
        string? reason = null)
    {
        db.ContractRenewalEvents.Add(new ContractRenewalEvent
        {
            ContractRenewalId = r.Id, ActorUserId = actorId, EventType = kind,
            Reason = reason, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        });
    }

    public static async Task<IResult> Submit(long contractId, SubmitRequest request,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var source = await Source(db, access, contractId, true, ct);
        Validate(request);
        var key = Validation.Required(request.IdempotencyKey, "idempotency_key", "Thiếu khóa chống gửi trùng.", 120);
        var fingerprint = ChannelSalesValidation.Fingerprint(request, contractId);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        // Serialize creation against concurrent submissions for the same signed contract.
        await db.SalesContracts.FromSqlInterpolated(
            $"SELECT * FROM sales_contracts WHERE id = {contractId} FOR UPDATE").SingleAsync(ct);
        await Source(db, access, contractId, true, ct);
        var old = await db.ContractRenewals.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (old is not null)
        {
            if (old.SubmittedByUserId != access.UserId || old.ContractId != contractId || old.RequestFingerprint != fingerprint)
                throw new ApiConflictException("Khóa chống trùng đã được sử dụng cho nội dung khác.");
            return Results.Ok(new { data = new { id = old.Id } });
        }
        if (await db.ContractRenewals.AnyAsync(x => x.ContractId == contractId
            && (x.Status == "PENDING_ACCOUNTING" || x.Status == "NEEDS_INFO" || x.Status == "DRAFT"), ct))
            throw new ApiConflictException("Hợp đồng đang có hồ sơ tái ký chờ xử lý.");
        if (await db.ContractRenewals.AnyAsync(x => x.ContractId == contractId && x.Status == "CONFIRMED"
            && x.ServiceStartOn <= request.ServiceEndOn && x.ServiceEndOn >= request.ServiceStartOn, ct))
            throw new ApiConflictException("Kỳ dịch vụ đã có hồ sơ tái ký được xác nhận.");
        // Do not silently infer an end date or rewrite the original contract's legacy term.
        var latest = await db.ContractRenewals.Where(x => x.ContractId == contractId && x.Status == "CONFIRMED")
            .OrderByDescending(x => x.ServiceEndOn).Select(x => (DateOnly?)x.ServiceEndOn).FirstOrDefaultAsync(ct);
        var priorEnd = latest ?? source.ServiceEndOn;
        if (!priorEnd.HasValue)
            throw new ApiConflictException("Hợp đồng gốc chưa có hạn dịch vụ đáng tin cậy; Kế toán cần hoàn thiện KC-01 trước.");
        if (request.ServiceStartOn <= priorEnd.Value)
            throw ApiValidationException.For("service_start_on", "Kỳ mới không được chồng lấn kỳ dịch vụ trước.");
        var proof = await Proof(db, request.EvidenceId, access.UserId, ct);
        var no = (await db.ContractRenewals.Where(x => x.ContractId == contractId).MaxAsync(x => (int?)x.RenewalNo, ct) ?? 0) + 1;
        var now = DateTime.UtcNow;
        var renewal = new ContractRenewal
        {
            ContractId = contractId, RenewalNo = no, IdempotencyKey = key,
            RequestFingerprint = fingerprint, SubmittedByUserId = access.UserId,
            SignedOn = request.SignedOn.Value, ServiceStartOn = request.ServiceStartOn.Value,
            ServiceEndOn = request.ServiceEndOn.Value,
            PaymentCycle = request.PaymentCycle!.Trim().ToUpperInvariant(),
            TotalValue = request.TotalValue, Status = "PENDING_ACCOUNTING",
            SubmittedAt = now, CreatedAt = now, UpdatedAt = now
        };
        db.ContractRenewals.Add(renewal);
        await db.SaveChangesAsync(ct);
        proof.ContractRenewalId = renewal.Id; proof.AttachedAt = now; proof.UpdatedAt = now;
        Event(db, renewal, access.UserId, "SUBMITTED");
        Audit.Add(db, access.UserId, "SUBMIT_CONTRACT_RENEWAL", nameof(ContractRenewal), renewal.Id,
            null, new { renewal.ContractId, renewal.ServiceStartOn, renewal.ServiceEndOn, renewal.TotalValue }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.Created($"/api/channel-sales/accounting/renewals/{renewal.Id}", new { data = new { id = renewal.Id } });
    }

    public static async Task<IResult> Resubmit(long id, SubmitRequest request,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        Validate(request);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var renewal = await db.ContractRenewals.FromSqlInterpolated(
            $"SELECT * FROM contract_renewals WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException();
        await Source(db, access, renewal.ContractId, true, ct);
        if (renewal.SubmittedByUserId != access.UserId) throw new KeyNotFoundException();
        if (renewal.Status != "NEEDS_INFO")
            throw new ApiConflictException("Chỉ hồ sơ được yêu cầu bổ sung mới được gửi lại.");
        if (await db.ContractRenewals.AnyAsync(x => x.Id != id && x.ContractId == renewal.ContractId
            && x.Status == "CONFIRMED" && x.ServiceStartOn <= request.ServiceEndOn &&
                x.ServiceEndOn >= request.ServiceStartOn, ct))
            throw new ApiConflictException("Kỳ dịch vụ đã được xác nhận.");
        var proof = await Proof(db, request.EvidenceId, access.UserId, ct);
        var now = DateTime.UtcNow;
        renewal.SignedOn = request.SignedOn!.Value;
        renewal.ServiceStartOn = request.ServiceStartOn!.Value;
        renewal.ServiceEndOn = request.ServiceEndOn!.Value;
        renewal.PaymentCycle = request.PaymentCycle!.Trim().ToUpperInvariant();
        renewal.TotalValue = request.TotalValue;
        renewal.Status = "PENDING_ACCOUNTING";
        renewal.SubmittedAt = now;
        renewal.DecisionReason = null;
        renewal.ReviewedAt = null; renewal.ReviewedByUserId = null; renewal.UpdatedAt = now;
        proof.ContractRenewalId = renewal.Id; proof.AttachedAt = now; proof.UpdatedAt = now;
        Event(db, renewal, access.UserId, "RESUBMITTED");
        Audit.Add(db, access.UserId, "RESUBMIT_CONTRACT_RENEWAL", nameof(ContractRenewal), renewal.Id, null,
            new { renewal.ServiceStartOn, renewal.ServiceEndOn, renewal.TotalValue }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.Ok(new { data = new { id = renewal.Id } });
    }

    public static async Task<IResult> Mine(long contractId, HttpContext http,
        KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        await Source(db, access, contractId, true, ct);
        var rows = await db.ContractRenewals.AsNoTracking().Where(x => x.ContractId == contractId
            && x.SubmittedByUserId == access.UserId)
            .OrderByDescending(x => x.RenewalNo)
            .Select(x => new { x.Id, x.RenewalNo, x.SignedOn, x.ServiceStartOn, x.ServiceEndOn,
                x.PaymentCycle, x.TotalValue, x.Status, x.DecisionReason, x.SubmittedAt }).ToArrayAsync(ct);
        return Results.Ok(new { data = rows });
    }

    private static IQueryable<ContractRenewal> ScopedAccounting(KidsfitDbContext db, ChannelSalesAccess access)
        => db.ContractRenewals.Where(x => access.Contracts(db).Any(c => c.Id == x.ContractId)
            && (access.All || (access.Organization && access.OrganizationIds.Contains(
                db.SalesContracts.Where(c => c.Id == x.ContractId).Select(c => c.OwnerOrganizationId).FirstOrDefault()))));

    public static async Task<IResult> Queue(HttpContext http, KidsfitDbContext db,
        string? search, string? status, int? page, int? page_size, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ContractRenewalReview)) return Results.Forbid();
        var query = ScopedAccounting(db, access).AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
        {
            var normalized = status.Trim().ToUpperInvariant();
            if (normalized is not ("PENDING_ACCOUNTING" or "NEEDS_INFO" or "REJECTED" or "CONFIRMED"))
                throw ApiValidationException.For("status", "Trạng thái không hợp lệ.");
            query = query.Where(x => x.Status == normalized);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim();
            query = query.Where(x => db.SalesContracts.Any(c => c.Id == x.ContractId
                && (c.ContractCode.Contains(value) ||
                    db.ChannelCustomers.Any(s => s.Id == c.CustomerId && s.DisplayName.Contains(value)) ||
                    db.Users.Any(u => u.Id == c.OwnerUserId && u.Name.Contains(value)))));
        }
        var pn = Math.Max(1, page ?? 1);
        var size = Math.Clamp(page_size ?? 20, 1, 100);
        var total = await query.CountAsync(ct);
        var rows = await (from r in query
            join c in db.SalesContracts on r.ContractId equals c.Id
            join school in db.ChannelCustomers on c.CustomerId equals school.Id
            join owner in db.Users on c.OwnerUserId equals owner.Id
            orderby r.CreatedAt descending, r.Id descending
            select new { id = r.Id, contract_id = c.Id, contract_code = c.ContractCode,
                school_name = school.DisplayName, owner_name = owner.Name,
                r.RenewalNo, r.SignedOn, r.ServiceStartOn, r.ServiceEndOn, r.PaymentCycle,
                r.TotalValue, r.Status, r.SubmittedAt }).Skip((pn-1)*size).Take(size).ToArrayAsync(ct);
        return Results.Ok(new { data = rows, total, page = pn, page_size = size });
    }

    public static async Task<IResult> Detail(long id, HttpContext http,
        KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ContractRenewalReview)) return Results.Forbid();
        var renewal = await (from r in ScopedAccounting(db, access).AsNoTracking()
            join c in db.SalesContracts on r.ContractId equals c.Id
            join school in db.ChannelCustomers on c.CustomerId equals school.Id
            join owner in db.Users on c.OwnerUserId equals owner.Id
            where r.Id == id
            select new { data = new { r.Id, r.ContractId, c.ContractCode, school_name = school.DisplayName,
                owner_name = owner.Name, r.RenewalNo, r.SignedOn, r.ServiceStartOn, r.ServiceEndOn,
                r.PaymentCycle, r.TotalValue, r.Status, r.DecisionReason, r.SubmittedAt,
                source_service_start_on = c.ServiceStartOn, source_service_end_on = c.ServiceEndOn,
                source_total_value = c.TotalValue } }).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        var evidence = await db.FinancialEvidences.AsNoTracking().Where(x => x.ContractRenewalId == id && x.AttachedAt != null)
            .OrderBy(x => x.CreatedAt).Select(x => new { id = x.Id, file_name = x.FileName,
                uploaded_at = x.CreatedAt }).ToArrayAsync(ct);
        var events = await (from e in db.ContractRenewalEvents.AsNoTracking()
            join u in db.Users.AsNoTracking() on e.ActorUserId equals u.Id
            where e.ContractRenewalId == id
            orderby e.CreatedAt, e.Id
            select new { event_type = e.EventType, actor_name = u.Name, e.Reason, e.CreatedAt }).ToArrayAsync(ct);
        return Results.Ok(new { renewal.data, evidence, events });
    }

    private static async Task<IResult> Decide(long id, string action, string? reason,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(action is "CONFIRMED" or "REJECTED"
                ? Permissions.ContractRenewalConfirm : Permissions.ContractRenewalReview)) return Results.Forbid();
        if (action is "NEEDS_INFO" or "REJECTED")
            reason = Validation.Required(reason, "reason", "Cần nhập lý do xử lý.", 1000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var renewal = await db.ContractRenewals.FromSqlInterpolated(
            $"SELECT * FROM contract_renewals WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException();
        var source = await Source(db, access, renewal.ContractId, false, ct);
        if (renewal.Status != "PENDING_ACCOUNTING")
            throw new ApiConflictException("Hồ sơ không còn ở trạng thái chờ Kế toán.");
        if (action == "CONFIRMED")
        {
            if (!await db.FinancialEvidences.AnyAsync(x => x.ContractRenewalId == id &&
                x.Kind == "RENEWAL" && x.AttachedAt != null, ct))
                throw new ApiConflictException("Thiếu hợp đồng tái ký đã ký.");
            if (await db.ContractRenewals.AnyAsync(x => x.Id != id && x.ContractId == renewal.ContractId &&
                x.Status == "CONFIRMED" && x.ServiceStartOn <= renewal.ServiceEndOn &&
                x.ServiceEndOn >= renewal.ServiceStartOn, ct))
                throw new ApiConflictException("Kỳ dịch vụ đã có tái ký được xác nhận.");
            var latest = await db.ContractRenewals.AsNoTracking().Where(x => x.ContractId == renewal.ContractId
                && x.Status == "CONFIRMED").OrderByDescending(x => x.ServiceEndOn)
                .Select(x => (DateOnly?)x.ServiceEndOn).FirstOrDefaultAsync(ct);
            var preceding = latest ?? source.ServiceEndOn;
            if (!preceding.HasValue || renewal.ServiceStartOn <= preceding.Value)
                throw new ApiConflictException("Kỳ tái ký không hợp lệ hoặc chồng kỳ dịch vụ trước.");
        }
        var previous = renewal.Status;
        var now = DateTime.UtcNow;
        renewal.Status = action;
        renewal.DecisionReason = reason;
        renewal.ReviewedAt = now;
        renewal.ReviewedByUserId = access.UserId;
        renewal.UpdatedAt = now;
        Event(db, renewal, access.UserId, action, reason);
        Audit.Add(db, access.UserId, "REVIEW_CONTRACT_RENEWAL", nameof(ContractRenewal),
            id, new { status = previous }, new { status = action, reason }, http);
        // No source contract mutation, no new CHECKEE case, no revenue/commission/protection entries.
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.Ok(new { data = new { id, status = action } });
    }

    public static Task<IResult> RequestInfo(long id, DecisionRequest request, HttpContext http,
        KidsfitDbContext db, CancellationToken ct) => Decide(id, "NEEDS_INFO", request.Reason, http, db, ct);
    public static Task<IResult> Reject(long id, DecisionRequest request, HttpContext http,
        KidsfitDbContext db, CancellationToken ct) => Decide(id, "REJECTED", request.Reason, http, db, ct);
    public static Task<IResult> Confirm(long id, HttpContext http,
        KidsfitDbContext db, CancellationToken ct) => Decide(id, "CONFIRMED", null, http, db, ct);
}

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
        decimal TotalValue, long? EvidenceId, string? GapReason = null);
    public sealed record DecisionRequest(string? Reason);

    // A service year includes its first day and ends the day before its next calendar anniversary.
    // This follows the established KC-01 demo convention, including leap-year transitions.
    private static void ValidateYearAndGap(DateOnly start, DateOnly end, DateOnly? previousEnd, string? gapReason)
    {
        if (end != start.AddYears(1).AddDays(-1))
            throw ApiValidationException.For("service_end_on", "Kỳ dịch vụ phải có thời hạn một năm lịch tính từ ngày bắt đầu.");
        if (!previousEnd.HasValue)
            throw new ApiConflictException("Không xác định được ngày kết thúc kỳ dịch vụ trước; Kế toán cần hoàn thiện dữ liệu KC-01.");
        if (start <= previousEnd.Value)
            throw ApiValidationException.For("service_start_on", "Kỳ tái ký không được chồng lấn kỳ dịch vụ trước.");
        if (start > previousEnd.Value.AddDays(1) && string.IsNullOrWhiteSpace(gapReason))
            throw ApiValidationException.For("gap_reason", "Kỳ dịch vụ có khoảng trống; vui lòng nhập lý do gián đoạn.");
        if (!string.IsNullOrWhiteSpace(gapReason) && gapReason.Trim().Length > 1000)
            throw ApiValidationException.For("gap_reason", "Lý do gián đoạn tối đa 1000 ký tự.");
    }

    private static async Task<DateOnly?> PriorConfirmedEnd(KidsfitDbContext db, long contractId, DateOnly? sourceEnd, CancellationToken ct)
    {
        var latest = await db.ContractRenewals.AsNoTracking()
            .Where(x => x.ContractId == contractId && x.Status == "CONFIRMED")
            .OrderByDescending(x => x.ServiceEndOn)
            .Select(x => (DateOnly?)x.ServiceEndOn).FirstOrDefaultAsync(ct);
        return latest ?? sourceEnd;
    }

    public static void Map(RouteGroupBuilder channel)
    {
        channel.MapGet("/renewals/eligible", Eligible).RequireAuthorization(Permissions.ContractRenewalSubmit);
        channel.MapGet("/renewals/mine", MineList).RequireAuthorization(Permissions.ContractRenewalSubmit);
        channel.MapGet("/renewals/mine/schools", MineSchools).RequireAuthorization(Permissions.ContractRenewalSubmit);
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
        var now = DateTime.UtcNow;
        if (sales)
        {
            if (contract.OwnerUserId != access.UserId) throw new KeyNotFoundException();
            var protections = await db.CustomerProtections.AsNoTracking()
                .Where(p => p.ContractId == contractId && p.OwnerUserId == access.UserId
                    && p.OwnerOrganizationId == contract.OwnerOrganizationId
                    && p.SourceType == "CONTRACT" && p.Status == "ACTIVE"
                    && p.EffectiveFrom <= now)
                .OrderByDescending(p => p.EffectiveUntil).ToArrayAsync(ct);
            var current = protections.Any(p => p.EffectiveUntil > now);
            var oldEnd = protections.FirstOrDefault()?.EffectiveUntil;
            var latestServiceEnd = await PriorConfirmedEnd(db, contractId, contract.ServiceEndOn, ct);
            var supplement = oldEnd.HasValue && latestServiceEnd.HasValue
                && ProtectionRenewalPolicy.ReservationApplies(now, oldEnd.Value, latestServiceEnd.Value);
            if (!current && !supplement) throw new KeyNotFoundException();
            if (!current)
            {
                var gap = await ServiceInterruptionService.AssessAsync(db, contract.CustomerId,
                    ContractExpiryAlertService.BusinessDate(now), now, ct);
                if (gap is null || gap.Assessment.Status is
                        (ServiceInterruptionPolicy.AssessmentStatus.ThresholdReached
                        or ServiceInterruptionPolicy.AssessmentStatus.HistoricalThresholdRequiresReview
                        or ServiceInterruptionPolicy.AssessmentStatus.MissingServiceTerm)
                    || await db.ServiceInterruptionEvents.AnyAsync(e =>
                        e.ContractId == contractId && e.Status == "RELEASED", ct)
                    || await db.CustomerProtections.AnyAsync(p => p.CustomerId == contract.CustomerId
                        && p.Status == "ACTIVE" && p.OwnerUserId != access.UserId
                        && p.EffectiveFrom <= now && p.EffectiveUntil > now, ct))
                    throw new KeyNotFoundException();
            }
        }
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
        if (request.ServiceStartOn.HasValue && request.ServiceEndOn.HasValue &&
            request.ServiceEndOn.Value != request.ServiceStartOn.Value.AddYears(1).AddDays(-1))
            throw ApiValidationException.For("service_end_on", "Kỳ dịch vụ phải có thời hạn một năm lịch tính từ ngày bắt đầu.");
        if (!string.IsNullOrWhiteSpace(request.GapReason) && request.GapReason.Trim().Length > 1000)
            throw ApiValidationException.For("gap_reason", "Lý do gián đoạn tối đa 1000 ký tự.");
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
        var priorEnd = await PriorConfirmedEnd(db, contractId, source.ServiceEndOn, ct);
        ValidateYearAndGap(request.ServiceStartOn!.Value, request.ServiceEndOn!.Value, priorEnd, request.GapReason);
        var proof = await Proof(db, request.EvidenceId, access.UserId, ct);
        var no = (await db.ContractRenewals.Where(x => x.ContractId == contractId).MaxAsync(x => (int?)x.RenewalNo, ct) ?? 0) + 1;
        var now = DateTime.UtcNow;
        var renewal = new ContractRenewal
        {
            ContractId = contractId, RenewalNo = no, IdempotencyKey = key,
            RequestFingerprint = fingerprint, SubmittedByUserId = access.UserId,
            SignedOn = request.SignedOn!.Value, ServiceStartOn = request.ServiceStartOn!.Value,
            ServiceEndOn = request.ServiceEndOn!.Value,
            PaymentCycle = request.PaymentCycle!.Trim().ToUpperInvariant(),
            TotalValue = request.TotalValue, GapReason = string.IsNullOrWhiteSpace(request.GapReason) ? null : request.GapReason.Trim(),
            Status = "PENDING_ACCOUNTING",
            SubmittedAt = now, CreatedAt = now, UpdatedAt = now
        };
        db.ContractRenewals.Add(renewal);
        await db.SaveChangesAsync(ct);
        proof.ContractRenewalId = renewal.Id; proof.AttachedAt = now; proof.UpdatedAt = now;
        Event(db, renewal, access.UserId, "SUBMITTED");
        Audit.Add(db, access.UserId, "SUBMIT_CONTRACT_RENEWAL", nameof(ContractRenewal), renewal.Id,
            null, new { renewal.ContractId, renewal.ServiceStartOn, renewal.ServiceEndOn, renewal.GapReason, renewal.TotalValue }, http);
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
        var source = await Source(db, access, renewal.ContractId, true, ct);
        if (renewal.SubmittedByUserId != access.UserId) throw new KeyNotFoundException();
        if (renewal.Status != "NEEDS_INFO")
            throw new ApiConflictException("Chỉ hồ sơ được yêu cầu bổ sung mới được gửi lại.");
        if (await db.ContractRenewals.AnyAsync(x => x.Id != id && x.ContractId == renewal.ContractId
            && x.Status == "CONFIRMED" && x.ServiceStartOn <= request.ServiceEndOn &&
                x.ServiceEndOn >= request.ServiceStartOn, ct))
            throw new ApiConflictException("Kỳ dịch vụ đã được xác nhận.");
        var preceding = await PriorConfirmedEnd(db, renewal.ContractId, source.ServiceEndOn, ct);
        ValidateYearAndGap(request.ServiceStartOn!.Value, request.ServiceEndOn!.Value, preceding, request.GapReason);
        var proof = await Proof(db, request.EvidenceId, access.UserId, ct);
        var now = DateTime.UtcNow;
        renewal.GapReason = string.IsNullOrWhiteSpace(request.GapReason) ? null : request.GapReason.Trim();
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
            new { renewal.ServiceStartOn, renewal.ServiceEndOn, renewal.GapReason, renewal.TotalValue }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.Ok(new { data = new { id = renewal.Id } });
    }

    public static async Task<IResult> Eligible(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ContractRenewalSubmit)) return Results.Forbid();
        var now = DateTime.UtcNow;
        var contracts = await (from c in access.Contracts(db).AsNoTracking()
            join school in db.ChannelCustomers.AsNoTracking() on c.CustomerId equals school.Id
            where c.OwnerUserId == access.UserId && c.Status == "ACTIVE" && c.VerifiedAt != null
                && !db.ContractCancellations.Any(cancel => cancel.ContractId == c.Id)
                && db.CustomerProtections.Any(p => p.ContractId == c.Id
                    && p.OwnerUserId == access.UserId && p.OwnerOrganizationId == c.OwnerOrganizationId
                    && p.SourceType == "CONTRACT" && p.Status == "ACTIVE" && p.EffectiveFrom <= now
                    && p.EffectiveUntil.AddDays(ProtectionRenewalPolicy.PriorityDays) > now)
            orderby c.ServiceEndOn, c.Id
            select new { id = c.Id, contract_code = c.ContractCode, school_name = school.DisplayName,
                source_end_on = c.ServiceEndOn,
                latest_end_on = db.ContractRenewals.Where(r => r.ContractId == c.Id && r.Status == "CONFIRMED")
                    .OrderByDescending(r => r.ServiceEndOn).Select(r => (DateOnly?)r.ServiceEndOn).FirstOrDefault(),
                pending = db.ContractRenewals.Any(r => r.ContractId == c.Id &&
                    (r.Status == "PENDING_ACCOUNTING" || r.Status == "NEEDS_INFO")) })
            .Take(200).ToArrayAsync(ct);
        var visible = new List<object>();
        foreach (var item in contracts)
        {
            // A recent protection expiry is eligible only when the old service period
            // also expired at that boundary. It never gives another Sales access.
            var dates = await db.CustomerProtections.AsNoTracking()
                .Where(p => p.ContractId == item.id && p.OwnerUserId == access.UserId
                    && p.SourceType == "CONTRACT" && p.Status == "ACTIVE")
                .OrderByDescending(p => p.EffectiveUntil).Select(p => p.EffectiveUntil)
                .Take(1).ToArrayAsync(ct);
            if (dates.Length == 0) continue;
            var end = item.latest_end_on ?? item.source_end_on;
            if (dates[0] <= now && (!end.HasValue ||
                !ProtectionRenewalPolicy.ReservationApplies(now, dates[0], end.Value)))
                continue;
            if (dates[0] <= now && await db.ServiceInterruptionEvents.AnyAsync(e =>
                e.ContractId == item.id && e.Status == "RELEASED", ct)) continue;
            visible.Add(item);
        }
        return Results.Ok(new { data = visible });
    }

    /// <summary>All historical renewal submissions of the logged-in Sales, independently of current eligibility.</summary>
    public static async Task<IResult> MineList(HttpContext http, KidsfitDbContext db,
        long? customerId, string? search, string? status, int? page, int? pageSize, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ContractRenewalSubmit)) return Results.Forbid();
        var query = from renewal in db.ContractRenewals.AsNoTracking()
            join contract in access.Contracts(db).AsNoTracking() on renewal.ContractId equals contract.Id
            join school in db.ChannelCustomers.AsNoTracking() on contract.CustomerId equals school.Id
            where renewal.SubmittedByUserId == access.UserId && contract.OwnerUserId == access.UserId
            select new { renewal, contract, school };
        if (customerId.HasValue)
        {
            if (customerId.Value <= 0) throw ApiValidationException.For("customerId", "Trường không hợp lệ.");
            query = query.Where(x => x.contract.CustomerId == customerId.Value);
        }
        var normalizedStatus = status?.Trim().ToUpperInvariant();
        if (!string.IsNullOrEmpty(normalizedStatus) && normalizedStatus != "ALL")
        {
            if (normalizedStatus is not ("PENDING_ACCOUNTING" or "NEEDS_INFO" or "CONFIRMED" or "REJECTED"))
                throw ApiValidationException.For("status", "Trạng thái tái ký không hợp lệ.");
            query = query.Where(x => x.renewal.Status == normalizedStatus);
        }
        var keyword = search?.Trim() ?? "";
        if (keyword.Length > 190) throw ApiValidationException.For("search", "Từ khóa tối đa 190 ký tự.");
        if (keyword.Length > 0)
        {
            var matchingNumber = int.TryParse(keyword, out var renewalNo) ? renewalNo : -1;
            query = query.Where(x => x.school.DisplayName.Contains(keyword)
                || x.contract.ContractCode.Contains(keyword)
                || x.renewal.RenewalNo == matchingNumber);
        }
        var p = Math.Max(1, page ?? 1);
        var size = Math.Clamp(pageSize ?? 20, 1, 50);
        var total = await query.CountAsync(ct);
        var data = await query.OrderByDescending(x => x.renewal.CreatedAt).ThenByDescending(x => x.renewal.Id)
            .Skip((p - 1) * size).Take(size)
            .Select(x => new {
                x.renewal.Id, x.renewal.ContractId, customer_id = x.contract.CustomerId,
                contract_code = x.contract.ContractCode,
                school_name = x.school.DisplayName, x.renewal.RenewalNo, x.renewal.SignedOn,
                x.renewal.ServiceStartOn, x.renewal.ServiceEndOn, x.renewal.PaymentCycle,
                x.renewal.TotalValue, x.renewal.Status, x.renewal.DecisionReason,
                x.renewal.GapReason, x.renewal.SubmittedAt
            }).ToArrayAsync(ct);
        return Results.Ok(new { data, total, page = p, page_size = size });
    }

    /// <summary>Distinct schools with historical Sales renewal submissions, for the list filter.</summary>
    public static async Task<IResult> MineSchools(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ContractRenewalSubmit)) return Results.Forbid();
        var schools = await (from renewal in db.ContractRenewals.AsNoTracking()
            join contract in access.Contracts(db).AsNoTracking() on renewal.ContractId equals contract.Id
            join school in db.ChannelCustomers.AsNoTracking() on contract.CustomerId equals school.Id
            where renewal.SubmittedByUserId == access.UserId && contract.OwnerUserId == access.UserId
            select new { id = school.Id, name = school.DisplayName })
            .Distinct().OrderBy(x => x.name).ThenBy(x => x.id).ToArrayAsync(ct);
        return Results.Ok(new { data = schools });
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
                x.PaymentCycle, x.TotalValue, x.GapReason, x.Status, x.DecisionReason, x.SubmittedAt }).ToArrayAsync(ct);
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
                r.TotalValue, r.GapReason, r.Status, r.SubmittedAt }).Skip((pn-1)*size).Take(size).ToArrayAsync(ct);
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
                r.PaymentCycle, r.TotalValue, r.GapReason, r.Status, r.DecisionReason, r.SubmittedAt,
                source_service_start_on = c.ServiceStartOn, source_service_end_on = c.ServiceEndOn,
                source_payment_cycle = c.PaymentCycle, source_total_value = c.TotalValue } }).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        var evidence = await db.FinancialEvidences.AsNoTracking().Where(x => x.ContractRenewalId == id && x.AttachedAt != null)
            .OrderBy(x => x.CreatedAt).Select(x => new { id = x.Id, file_name = x.FileName,
                uploaded_at = x.CreatedAt }).ToArrayAsync(ct);
        var events = await (from e in db.ContractRenewalEvents.AsNoTracking()
            join u in db.Users.AsNoTracking() on e.ActorUserId equals u.Id
            where e.ContractRenewalId == id
            orderby e.CreatedAt, e.Id
            select new { event_type = e.EventType, actor_name = u.Name, e.Reason, e.CreatedAt }).ToArrayAsync(ct);
        var confirmed = await db.ContractRenewals.AsNoTracking()
            .Where(x => x.ContractId == renewal.data.ContractId && x.Status == "CONFIRMED")
            .ToArrayAsync(ct);
        var timeline = AccountingContractEndpoints.BuildTimeline(
            renewal.data.source_service_start_on, renewal.data.source_service_end_on,
            renewal.data.source_payment_cycle, confirmed, ChannelSalesValidation.BusinessDate(DateTime.UtcNow));
        var precedingPeriod = timeline.period_history
            .Where(x => x.end_on < renewal.data.ServiceStartOn)
            .OrderByDescending(x => x.end_on).FirstOrDefault();
        var protection = await db.CustomerProtections.AsNoTracking()
            .Where(p => p.ContractId == renewal.data.ContractId
                && p.SourceType == "CONTRACT" && p.Status == "ACTIVE")
            .OrderByDescending(p => p.EffectiveUntil)
            .Select(p => new { p.EffectiveFrom, p.EffectiveUntil })
            .FirstOrDefaultAsync(ct);
        var protectionCase = await db.ProtectionRenewalCases.AsNoTracking()
            .Where(p => p.ContractId == renewal.data.ContractId)
            .OrderByDescending(p => p.UpdatedAt).ThenByDescending(p => p.Id)
            .Select(p => new { p.Status, p.NewProtectionFrom, p.NewProtectionUntil })
            .FirstOrDefaultAsync(ct);
        return Results.Ok(new { renewal.data, evidence, events,
            preceding_period = precedingPeriod, timeline.current_period, timeline.next_confirmed_period,
            protection, protection_case = protectionCase });
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
        // Customer lock must precede renewal and contract locks, matching GI-01.
        var targetCustomerId = await (from candidate in db.ContractRenewals.AsNoTracking()
            join contract in db.SalesContracts.AsNoTracking() on candidate.ContractId equals contract.Id
            where candidate.Id == id
            select (long?)contract.CustomerId).SingleOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException();
        await db.ChannelCustomers.FromSqlInterpolated(
            $"SELECT * FROM channel_customers WHERE id = {targetCustomerId} FOR UPDATE").SingleAsync(ct);
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
            var preceding = await PriorConfirmedEnd(db, renewal.ContractId, source.ServiceEndOn, ct);
            ValidateYearAndGap(renewal.ServiceStartOn, renewal.ServiceEndOn, preceding, renewal.GapReason);
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
        // Accounting alone confirms the service year. Protection may be granted
        // only when the preceding five-year cycle has expired and all guards pass.
        await db.SaveChangesAsync(ct);
        if (action == "CONFIRMED")
            await AutomaticProtectionRenewal.TryGrantAsync(db, renewal.ContractId, now, access.UserId, ct);
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

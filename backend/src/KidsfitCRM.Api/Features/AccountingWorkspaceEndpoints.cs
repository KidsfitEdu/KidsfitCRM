using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>
/// Single accounting contract workspace. Each row represents one verified source
/// contract, never an annual renewal. The result is scoped before aggregating.
/// Existing KC-01, KC-02 and GI-01 APIs are preserved for compatible clients.
/// </summary>
public static class AccountingWorkspaceEndpoints
{
    private sealed record WorkspaceContract(
        long Id, long CustomerId, string ContractCode, string SchoolName,
        string OwnerName, long OwnerUserId, string? PersonnelType, string ContractStatus,
        DateOnly? SourceStartOn, DateOnly? SourceEndOn, decimal TotalValue,
        decimal Received, decimal Refunded, decimal Commission,
        bool HasFinancialHistory);

    public static void Map(RouteGroupBuilder group)
    {
        group.MapGet("/accounting/workspace", List)
            .RequireAuthorization(Permissions.ChannelSalesCommissionView);
        group.MapGet("/accounting/receivable-contracts", ReceivableContracts)
            .RequireAuthorization(Permissions.ChannelSalesRecordRevenue);
        group.MapGet("/accounting/receipts", Receipts)
            .RequireAuthorization(Permissions.ChannelSalesCommissionView);
        group.MapGet("/accounting/contracts/{contractId:long}/renewals", Renewals)
            .RequireAuthorization(Permissions.ContractRenewalReview);
        group.MapGet("/accounting/contracts/{contractId:long}/service-history", ServiceHistory)
            .RequireAuthorization(Permissions.ChannelSalesCommissionView);
    }

    public static async Task<IResult> ReceivableContracts(HttpContext http, KidsfitDbContext db,
        string? search, int? page, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesRecordRevenue)) return Results.Forbid();
        var term = (search ?? "").Trim();
        if (term.Length > 190) throw ApiValidationException.For("search", "Tìm kiếm tối đa 190 ký tự.");
        var pn = Math.Max(1, page ?? 1);
        var scope = access.Contracts(db).AsNoTracking().Where(c => c.VerifiedAt.HasValue
            && c.Status == "ACTIVE"
            && db.RevenueSchedules.Any(schedule => schedule.ContractId == c.Id
                && schedule.AmountReceived < schedule.AmountDue));
        if (term.Length > 0)
            scope = scope.Where(c => c.ContractCode.Contains(term)
                || db.ChannelCustomers.Any(school => school.Id == c.CustomerId
                    && school.DisplayName.Contains(term)));
        var total = await scope.CountAsync(ct);
        var data = await (from contract in scope
            join school in db.ChannelCustomers.AsNoTracking() on contract.CustomerId equals school.Id
            orderby school.DisplayName, contract.Id
            select new { id = contract.Id, code = contract.ContractCode,
                school_name = school.DisplayName,
                amount_remaining = db.RevenueSchedules.Where(x => x.ContractId == contract.Id)
                    .Sum(x => (decimal?)(x.AmountDue - x.AmountReceived)) ?? 0m })
            .Skip((pn - 1) * 50).Take(50).ToArrayAsync(ct);
        return Results.Ok(new { data, total, page = pn, page_size = 50 });
    }

    /// <summary>
    /// One ledger-backed source of receipt history across verified contracts;
    /// no financial mutation and no inferred renewal year from the bank date.
    /// </summary>
    public static async Task<IResult> Receipts(HttpContext http, KidsfitDbContext db,
        string? search, int? year, int? page, int? page_size, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesCommissionView)) return Results.Forbid();
        var term = (search ?? "").Trim();
        if (term.Length > 190) throw ApiValidationException.For("search", "Tìm kiếm tối đa 190 ký tự.");
        if (year is < 2000 or > 2100) throw ApiValidationException.For("year", "Năm không hợp lệ.");
        var pn = Math.Max(1, page ?? 1);
        var size = Math.Clamp(page_size ?? 20, 1, 100);
        var scopedContracts = access.Contracts(db).AsNoTracking().Where(c => c.VerifiedAt.HasValue);
        var query = from receipt in db.RevenueReceipts.AsNoTracking()
                    join contract in scopedContracts on receipt.ContractId equals contract.Id
                    join school in db.ChannelCustomers.AsNoTracking() on contract.CustomerId equals school.Id
                    where receipt.Status == "COMPLETED"
                    select new { receipt, contract, school };
        if (term.Length > 0)
            query = query.Where(x => x.receipt.ReferenceCode.Contains(term)
                || x.contract.ContractCode.Contains(term) || x.school.DisplayName.Contains(term));
        if (year.HasValue)
        {
            // Vietnam business-year boundary is 00:00 Asia/Ho_Chi_Minh (UTC+07).
            var beginning = new DateTime(year.Value, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddHours(-7);
            query = query.Where(x => x.receipt.ReceivedAt >= beginning
                && x.receipt.ReceivedAt < beginning.AddYears(1));
        }
        var total = await query.CountAsync(ct);
        var data = await query.OrderByDescending(x => x.receipt.ReceivedAt)
            .ThenByDescending(x => x.receipt.Id)
            .Skip((pn - 1) * size).Take(size)
            .Select(x => new {
                id = x.receipt.Id,
                contract_id = x.contract.Id,
                contract_code = x.contract.ContractCode,
                school_name = x.school.DisplayName,
                amount = x.receipt.Amount,
                received_at = x.receipt.ReceivedAt,
                reference_code = x.receipt.ReferenceCode,
                payment_method = x.receipt.PaymentMethod,
                status = x.receipt.Status,
                schedule_id = x.receipt.RevenueScheduleId,
                proof_id = db.FinancialEvidences.Where(e => e.RevenueReceiptId == x.receipt.Id
                        && e.Kind == "RECEIPT" && e.AttachedAt.HasValue)
                    .OrderByDescending(e => e.Id).Select(e => (long?)e.Id).FirstOrDefault(),
                proof_file_name = db.FinancialEvidences.Where(e => e.RevenueReceiptId == x.receipt.Id
                        && e.Kind == "RECEIPT" && e.AttachedAt.HasValue)
                    .OrderByDescending(e => e.Id).Select(e => e.FileName).FirstOrDefault()
            }).ToArrayAsync(ct);
        return Results.Ok(new { data, total, page = pn, page_size = size });
    }

    public static async Task<IResult> List(HttpContext http, KidsfitDbContext db,
        string? search, string? status, long? owner_user_id, int? page,
        int? page_size, string? contract_kind, int? service_year, bool? needs_action,
        CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesCommissionView)) return Results.Forbid();
        var filter = (status ?? "ALL").Trim().ToUpperInvariant();
        if (filter is not ("ALL" or "PENDING" or "INTERRUPTED" or "HISTORY"))
            throw ApiValidationException.For("status", "Nhóm hồ sơ không hợp lệ.");
        var kind = (contract_kind ?? "ALL").Trim().ToUpperInvariant();
        if (kind is not ("ALL" or "ORIGINAL" or "RENEWAL"))
            throw ApiValidationException.For("contract_kind", "Loại hợp đồng không hợp lệ.");
        if (service_year.HasValue && (service_year < 2000 || service_year > 2100))
            throw ApiValidationException.For("service_year", "Năm sử dụng không hợp lệ.");
        var term = search?.Trim() ?? "";
        if (term.Length > 190)
            throw ApiValidationException.For("search", "Tìm kiếm tối đa 190 ký tự.");
        var pn = Math.Max(1, page ?? 1);
        var size = Math.Clamp(page_size ?? 20, 1, 100);

        var scope = access.Contracts(db).AsNoTracking()
            .Where(c => c.VerifiedAt.HasValue);
        if (owner_user_id.HasValue)
        {
            if (owner_user_id <= 0)
                throw ApiValidationException.For("owner_user_id", "Người phụ trách không hợp lệ.");
            scope = scope.Where(c => c.OwnerUserId == owner_user_id.Value);
        }
        if (term.Length > 0)
            scope = scope.Where(c => c.ContractCode.Contains(term)
                || db.ChannelCustomers.Any(s => s.Id == c.CustomerId
                    && s.DisplayName.Contains(term))
                || db.Users.Any(u => u.Id == c.OwnerUserId && u.Name.Contains(term)));

        var all = await (from c in scope
            join school in db.ChannelCustomers.AsNoTracking() on c.CustomerId equals school.Id
            join owner in db.Users.AsNoTracking() on c.OwnerUserId equals owner.Id
            orderby c.SignedOn descending, c.Id descending
            select new WorkspaceContract(
                c.Id, c.CustomerId, c.ContractCode, school.DisplayName,
                owner.Name, c.OwnerUserId, c.OwnerPersonnelType, c.Status,
                c.ServiceStartOn, c.ServiceEndOn, c.TotalValue,
                db.RevenueReceipts.Where(r => r.ContractId == c.Id && r.Status == "COMPLETED")
                    .Sum(r => (decimal?)r.Amount) ?? 0,
                db.RevenueRefunds.Where(r => r.ContractId == c.Id)
                    .Sum(r => (decimal?)r.Amount) ?? 0,
                access.Commissions(db).Where(e => e.ContractId == c.Id)
                    .Sum(e => (decimal?)e.Amount) ?? 0,
                c.Status == "CANCELLED" || c.Status == "REJECTED"
                    || db.RevenueRefunds.Any(r => r.ContractId == c.Id)
                    || db.CommissionLedgerEntries.Any(e => e.ContractId == c.Id
                        && e.EntryType != "ACCRUAL")
            )).ToArrayAsync(ct);

        var ids = all.Select(x => x.Id).ToArray();
        var owners = all.Select(x => new { id = x.OwnerUserId, name = x.OwnerName })
            .Distinct().OrderBy(x => x.name).ThenBy(x => x.id).ToArray();
        var renewals = await db.ContractRenewals.AsNoTracking()
            .Where(r => ids.Contains(r.ContractId))
            .Select(r => new {
                r.Id, r.ContractId, r.RenewalNo, r.Status, r.ServiceStartOn,
                r.ServiceEndOn, r.SubmittedAt, r.TotalValue, r.ContractCode, r.SignedOn, r.PaymentCycle
            }).ToArrayAsync(ct);

        // One school group per verified original contract. Each legal renewal has
        // separate schedules, cash and ledger, never the lifetime totals of its parent.
        var receiptLines = await (from receipt in db.RevenueReceipts.AsNoTracking()
            join schedule in db.RevenueSchedules.AsNoTracking()
                on receipt.RevenueScheduleId equals schedule.Id into scheduled
            from schedule in scheduled.DefaultIfEmpty()
            where ids.Contains(receipt.ContractId) && receipt.Status == "COMPLETED"
            select new { receipt.Id, receipt.ContractId, receipt.Amount,
                RenewalId = schedule == null ? (long?)null : schedule.ContractRenewalId })
            .ToArrayAsync(ct);
        var receiptIds = receiptLines.Select(r => r.Id).ToArray();
        var ledgerLines = await access.Commissions(db).AsNoTracking()
            .Where(e => ids.Contains(e.ContractId))
            .Select(e => new { e.ContractId, e.RevenueReceiptId, e.Amount })
            .ToArrayAsync(ct);
        var originalCash = receiptLines.Where(r => !r.RenewalId.HasValue)
            .GroupBy(r => r.ContractId).ToDictionary(g => g.Key, g => g.Sum(r => r.Amount));
        var renewalCash = receiptLines.Where(r => r.RenewalId.HasValue)
            .GroupBy(r => r.RenewalId!.Value).ToDictionary(g => g.Key, g => g.Sum(r => r.Amount));
        var renewalByReceipt = receiptLines.ToDictionary(r => r.Id, r => r.RenewalId);
        var sourceCommission = new Dictionary<long, decimal>();
        var renewalCommission = new Dictionary<long, decimal>();
        foreach (var entry in ledgerLines)
        {
            // Unlinked historical corrections stay with the source period, not
            // arbitrarily attributed to a renewal by transaction date.
            var period = entry.RevenueReceiptId.HasValue
                && renewalByReceipt.TryGetValue(entry.RevenueReceiptId.Value, out var rid)
                    ? rid : null;
            if (period.HasValue)
                renewalCommission[period.Value] = renewalCommission.GetValueOrDefault(period.Value) + entry.Amount;
            else
                sourceCommission[entry.ContractId] = sourceCommission.GetValueOrDefault(entry.ContractId) + entry.Amount;
        }
        var byContract = renewals.ToLookup(r => r.ContractId);
        var now = DateTime.UtcNow;
        var today = ChannelSalesValidation.BusinessDate(now);
        // Read only decisions for contracts the accountant is authorized to see.
        // A historical RELEASED event must never override a later valid protection.
        var giEvents = await db.ServiceInterruptionEvents.AsNoTracking()
            .Where(e => ids.Contains(e.ContractId))
            .Select(e => new { e.ContractId, e.GapStartOn, e.Status, e.ProcessedAt })
            .ToArrayAsync(ct);
        var eventsByContract = giEvents.ToLookup(e => e.ContractId);
        var customerIds = all.Select(c => c.CustomerId).Distinct().ToArray();
        var protectedCustomers = (await db.CustomerProtections.AsNoTracking()
            .Where(p => customerIds.Contains(p.CustomerId)
                && p.Status == "ACTIVE" && p.EffectiveFrom <= now && p.EffectiveUntil > now)
            .Select(p => p.CustomerId).Distinct().ToArrayAsync(ct)).ToHashSet();
        var rows = all.Select(c =>
        {
            var attached = byContract[c.Id].OrderByDescending(r => r.RenewalNo)
                .ThenByDescending(r => r.Id).ToArray();
            var waiting = attached.FirstOrDefault(r => r.Status == "PENDING_ACCOUNTING");
            var needsInfo = attached.FirstOrDefault(r => r.Status == "NEEDS_INFO");
            var terms = attached.Where(r => r.Status == "CONFIRMED")
                .Select(r => new ServiceInterruptionPolicy.ServicePeriod(r.ServiceStartOn, r.ServiceEndOn))
                .ToArray();
            var assessment = ServiceInterruptionPolicy.Evaluate(
                today, c.SourceStartOn, c.SourceEndOn, terms);
            DateOnly? latestPeriodEnd = terms.Where(p => p.StartOn <= today && p.EndOn >= today)
                .OrderByDescending(p => p.EndOn).Select(p => (DateOnly?)p.EndOn)
                .FirstOrDefault();
            DateOnly? currentEnd = latestPeriodEnd
                ?? (c.SourceStartOn <= today && c.SourceEndOn >= today
                    ? c.SourceEndOn : null);
            DateOnly? upcomingStart = terms.Where(p => p.StartOn > today)
                .OrderBy(p => p.StartOn).Select(p => (DateOnly?)p.StartOn).FirstOrDefault();
            var pending = waiting is not null;
            var currentGapEvents = eventsByContract[c.Id]
                .Where(e => assessment.GapStartOn.HasValue
                    && e.GapStartOn == assessment.GapStartOn.Value)
                .OrderByDescending(e => e.ProcessedAt).ToArray();
            var released = assessment.Status == ServiceInterruptionPolicy.AssessmentStatus.ThresholdReached
                && currentGapEvents.Any(e => e.Status == "RELEASED")
                && !protectedCustomers.Contains(c.CustomerId);
            var needsReview = assessment.Status is
                    (ServiceInterruptionPolicy.AssessmentStatus.MissingServiceTerm
                    or ServiceInterruptionPolicy.AssessmentStatus.HistoricalThresholdRequiresReview)
                || currentGapEvents.Any(e => e.Status.StartsWith("EXCEPTION_", StringComparison.Ordinal));
            var action = pending ? "CONFIRM_RENEWAL"
                : needsReview ? "REVIEW_PERIOD" : (string?)null;
            // These are display statuses, not GI-01 release decisions. A milestone
            // reached today differs from one already passed, and neither means release.
            var service = c.ContractStatus is "CANCELLED" or "REJECTED"
                ? "INACTIVE"
                : released ? "RELEASED"
                : needsReview ? "NEEDS_REVIEW"
                : assessment.Status switch {
                    ServiceInterruptionPolicy.AssessmentStatus.Continuous =>
                        currentEnd.HasValue && currentEnd.Value <= today.AddDays(30)
                            ? "EXPIRING_SOON" : "CONTINUOUS",
                    ServiceInterruptionPolicy.AssessmentStatus.Interrupted => "INTERRUPTED",
                    ServiceInterruptionPolicy.AssessmentStatus.ThresholdReached =>
                        today == assessment.ThresholdOn ? "THRESHOLD_REACHED" : "THRESHOLD_OVERDUE",
                    _ => "NEEDS_REVIEW"
                };
            return new {
                id = c.Id, customer_id = c.CustomerId,
                contract_code = c.ContractCode, school_name = c.SchoolName,
                owner_name = c.OwnerName, owner_user_id = c.OwnerUserId,
                personnel_type = c.PersonnelType, contract_status = c.ContractStatus,
                service_until = currentEnd ?? (DateOnly?)c.SourceEndOn,
                next_service_start_on = upcomingStart,
                service_status = service, gap_start_on = assessment.GapStartOn,
                threshold_on = assessment.ThresholdOn,
                action, pending_renewal_id = waiting?.Id,
                pending_renewal_no = waiting?.RenewalNo,
                source_service_start_on = c.SourceStartOn,
                source_service_end_on = c.SourceEndOn,
                periods = attached.OrderBy(r => r.RenewalNo).Select(r => new {
                    id = r.Id, renewal_no = r.RenewalNo, status = r.Status,
                    service_start_on = r.ServiceStartOn, service_end_on = r.ServiceEndOn,
                    total_value = r.TotalValue,
                    contract_code = r.ContractCode,
                    signed_on = r.SignedOn,
                    payment_cycle = r.PaymentCycle,
                    received = renewalCash.GetValueOrDefault(r.Id),
                    commission = renewalCommission.GetValueOrDefault(r.Id)
                }).ToArray(),
                needs_info_renewal_id = needsInfo?.Id,
                total_value = c.TotalValue,
                received = originalCash.GetValueOrDefault(c.Id),
                refunded = c.Refunded,
                commission = sourceCommission.GetValueOrDefault(c.Id),
                has_financial_history = c.HasFinancialHistory,
                original_period_financials_only = true
            };
        }).Where(c => (kind != "RENEWAL" || c.periods.Length > 0)
            && (kind != "ORIGINAL" || c.source_service_start_on.HasValue)
            && (!needs_action.GetValueOrDefault() || c.action != null
                || c.periods.Any(p => p.status == "PENDING_ACCOUNTING" || p.status == "NEEDS_INFO"))
            && (!service_year.HasValue
                || (c.source_service_start_on.HasValue && c.source_service_start_on.Value.Year <= service_year.Value
                    && c.source_service_end_on.HasValue && c.source_service_end_on.Value.Year >= service_year.Value)
                || c.periods.Any(p => p.service_start_on.Year <= service_year.Value
                    && p.service_end_on.Year >= service_year.Value)))
            .Where(c => filter switch {
            "PENDING" => c.pending_renewal_id.HasValue,
            "INTERRUPTED" => c.service_status is "INTERRUPTED" or "THRESHOLD_REACHED"
                or "THRESHOLD_OVERDUE" or "RELEASED" or "NEEDS_REVIEW",
            "HISTORY" => c.has_financial_history,
            _ => true
        }).ToArray();

        return Results.Ok(new {
            data = rows.Skip((pn - 1) * size).Take(size).ToArray(),
            total = rows.Length, owners, page = pn, page_size = size,
            pending_count = rows.Count(x => x.pending_renewal_id.HasValue)
        });
    }

    /// <summary>
    /// All renewals of a verified, scoped contract. Decisions still use the
    /// existing permission-checked /accounting/renewals/{id}/... endpoints.
    /// </summary>
    public static async Task<IResult> Renewals(long contractId, HttpContext http,
        KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ContractRenewalReview)) return Results.Forbid();
        if (!await access.Contracts(db).AsNoTracking()
            .AnyAsync(c => c.Id == contractId && c.VerifiedAt.HasValue, ct))
            throw new KeyNotFoundException();
        var rows = await db.ContractRenewals.AsNoTracking()
            .Where(r => r.ContractId == contractId)
            .OrderByDescending(r => r.RenewalNo).ThenByDescending(r => r.Id)
            .Select(r => new {
                id = r.Id, renewal_no = r.RenewalNo, status = r.Status,
                signed_on = r.SignedOn, service_start_on = r.ServiceStartOn,
                service_end_on = r.ServiceEndOn, payment_cycle = r.PaymentCycle,
                total_value = r.TotalValue, submitted_at = r.SubmittedAt
            }).ToArrayAsync(ct);
        return Results.Ok(new { data = rows });
    }
    /** Read-only GI-01 events tied to the authorized contract; never leak another owner's events. */
    public static async Task<IResult> ServiceHistory(long contractId, HttpContext http,
        KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesCommissionView)) return Results.Forbid();
        if (!await access.Contracts(db).AsNoTracking()
            .AnyAsync(c => c.Id == contractId && c.VerifiedAt.HasValue, ct))
            throw new KeyNotFoundException();
        var events = await db.ServiceInterruptionEvents.AsNoTracking()
            .Where(e => e.ContractId == contractId)
            .OrderByDescending(e => e.ProcessedAt).Take(50)
            .Select(e => new {
                e.Status, e.GapStartOn, e.ThresholdOn, e.ProcessedAt, e.Reason
            }).ToArrayAsync(ct);
        return Results.Ok(new { data = events });
    }

}

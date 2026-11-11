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
        group.MapGet("/accounting/contracts/{contractId:long}/renewals", Renewals)
            .RequireAuthorization(Permissions.ContractRenewalReview);
        group.MapGet("/accounting/contracts/{contractId:long}/service-history", ServiceHistory)
            .RequireAuthorization(Permissions.ChannelSalesCommissionView);
    }

    public static async Task<IResult> List(HttpContext http, KidsfitDbContext db,
        string? search, string? status, long? owner_user_id, int? page,
        int? page_size, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesCommissionView)) return Results.Forbid();
        var filter = (status ?? "ALL").Trim().ToUpperInvariant();
        if (filter is not ("ALL" or "PENDING" or "INTERRUPTED" or "HISTORY"))
            throw ApiValidationException.For("status", "Nhóm hồ sơ không hợp lệ.");
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
                r.ServiceEndOn, r.SubmittedAt, r.TotalValue
            }).ToArrayAsync(ct);
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
                needs_info_renewal_id = needsInfo?.Id,
                total_value = c.TotalValue, received = c.Received, refunded = c.Refunded,
                commission = c.Commission, has_financial_history = c.HasFinancialHistory
            };
        }).Where(c => filter switch {
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

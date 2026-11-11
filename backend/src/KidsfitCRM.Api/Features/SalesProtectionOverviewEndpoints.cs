using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>
/// Unified sales-owned protection overview: exactly one row per school,
/// including normal protected schools that are not yet SL-02 eligible.
/// Decisions still use the existing SL-02 and GI-01 endpoints.
/// </summary>
public static class SalesProtectionOverviewEndpoints
{
    public static void Map(RouteGroupBuilder channel) =>
        channel.MapGet("/protection-overview", List)
            .RequireAuthorization(Permissions.ChannelSalesView);

    private static async Task<IResult> List(HttpContext http, KidsfitDbContext db,
        IConfiguration configuration, string? search, string? status,
        int? page, int? pageSize, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var now = DateTime.UtcNow;
        var today = ContractExpiryAlertService.BusinessDate(now);
        var query = access.Contracts(db).AsNoTracking()
            .Where(c => c.OwnerUserId == access.UserId && c.Status == "ACTIVE"
                && c.VerifiedAt != null && c.RequiresSchoolVerification
                && !db.ContractCancellations.Any(x => x.ContractId == c.Id));
        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();
            query = query.Where(c => c.ContractCode.Contains(keyword) ||
                db.ChannelCustomers.Any(x => x.Id == c.CustomerId
                    && x.DisplayName.Contains(keyword)));
        }
        // Group before presentation: multiple contracts and renewals cannot create duplicate rows.
        var contracts = await query.OrderByDescending(c => c.VerifiedAt)
            .ThenByDescending(c => c.Id).ToArrayAsync(ct);
        var ownGroups = contracts.GroupBy(c => c.CustomerId).ToArray();
        var customerIds = ownGroups.Select(g => g.Key).ToArray();
        var contractIds = contracts.Select(c => c.Id).ToArray();
        var names = await db.ChannelCustomers.AsNoTracking()
            .Where(c => customerIds.Contains(c.Id))
            .ToDictionaryAsync(c => c.Id, c => c.DisplayName, ct);
        var protections = await db.CustomerProtections.AsNoTracking()
            .Where(p => customerIds.Contains(p.CustomerId) && p.SourceType == "CONTRACT")
            .OrderByDescending(p => p.EffectiveUntil).ToArrayAsync(ct);
        var cases = await db.ProtectionRenewalCases.AsNoTracking()
            .Where(r => contractIds.Contains(r.ContractId))
            .OrderByDescending(r => r.UpdatedAt).ThenByDescending(r => r.Id).ToArrayAsync(ct);

        var results = new List<object>();
        foreach (var group in ownGroups)
        {
            var ownContracts = group.ToArray();
            // Hide another Sales' live ownership rather than claim it as ours.
            var otherActiveOwner = await db.CustomerProtections.AsNoTracking()
                .AnyAsync(p => p.CustomerId == group.Key && p.Status == "ACTIVE"
                    && p.EffectiveUntil > now && p.OwnerUserId != access.UserId, ct);
            if (otherActiveOwner) continue;
            var currentProtection = protections.FirstOrDefault(p =>
                p.CustomerId == group.Key && p.Status == "ACTIVE" &&
                p.OwnerUserId == access.UserId && p.EffectiveUntil > now);
            var previousProtection = currentProtection ?? protections.FirstOrDefault(p =>
                p.CustomerId == group.Key && p.OwnerUserId == access.UserId);
            var contract = previousProtection is not null
                ? ownContracts.FirstOrDefault(c => c.Id == previousProtection.ContractId) ?? ownContracts[0]
                : ownContracts[0];
            var protectionCase = cases.FirstOrDefault(c => c.ContractId == contract.Id);
            var interruption = await ServiceInterruptionService.AssessAsync(db, group.Key,
                today, now, ct, configuration.GetValue<int>("GI01:AccountingExceptionHours"));
            // If the current business contract belongs to somebody else, never expose it.
            if (interruption is not null && interruption.OwnerUserId != access.UserId)
                continue;
            var giStatus = interruption?.Status ?? "NO_SERVICE";
            var released = previousProtection?.Status == "RELEASED" ||
                giStatus == "RELEASED";
            var applicableProtection = currentProtection is not null && !released;
            var renewalStatus = protectionCase?.Status ?? "NOT_DUE";
            var protectionState = released ? "RELEASED" :
                applicableProtection ? "PROTECTED" : "EXPIRED";
            var displayStatus = giStatus.StartsWith("EXCEPTION_", StringComparison.Ordinal)
                ? giStatus : giStatus == "THRESHOLD_REACHED" ? giStatus
                : released ? "RELEASED"
                : renewalStatus is "PENDING_MANAGER" or "WAITING_RENEWAL" or "WAITING_PROTECTION_EXPIRY" ? renewalStatus
                : giStatus == "INTERRUPTED" ? giStatus
                : protectionState;
            if (!string.IsNullOrWhiteSpace(status) &&
                !displayStatus.Equals(status.Trim(), StringComparison.OrdinalIgnoreCase))
                continue;
            var confirmation = protectionCase?.Status == "APPROVED" ||
                (currentProtection is not null &&
                 await ProtectionRenewalPolicy.HasConfirmedContinuationAsync(
                     db, contract, currentProtection.EffectiveUntil, now, ct));
            results.Add(new
            {
                customer_id = group.Key,
                customer_name = names.GetValueOrDefault(group.Key) ?? "—",
                contract_id = contract.Id,
                contract_code = contract.ContractCode,
                protection_until = previousProtection?.EffectiveUntil,
                protection_status = protectionState,
                priority_until = currentProtection is not null
                    ? (DateTime?)ProtectionRenewalPolicy.PriorityEnds(currentProtection.EffectiveUntil)
                    : null,
                renewal_case_id = protectionCase?.Id,
                renewal_status = renewalStatus,
                renewal_source = protectionCase?.Source,
                renewal_note = protectionCase?.Note,
                renewal_reason = protectionCase?.DecisionReason,
                renewal_confirmed = confirmation,
                new_protection_from = protectionCase?.NewProtectionFrom,
                new_protection_until = protectionCase?.NewProtectionUntil,
                can_request = false,
                interruption_status = giStatus,
                gap_start_on = interruption?.Assessment.GapStartOn,
                threshold_on = interruption?.Assessment.ThresholdOn,
                next_service_start_on = interruption?.Assessment.NextServiceStartOn,
                has_pending_renewal = interruption?.HasPendingRenewal ?? false,
                has_open_dispute = interruption?.HasOpenDispute ?? false,
                status = displayStatus
            });
        }
        var requestedPage = Math.Max(1, page ?? 1);
        var size = Math.Clamp(pageSize ?? 10, 1, 50);
        return Results.Ok(new
        {
            data = results.Skip((requestedPage - 1) * size).Take(size).ToArray(),
            total = results.Count, page = requestedPage, page_size = size
        });
    }
}

using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Features;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>Priorities preserve access for fifteen days, never extend a five-year grant.</summary>
public static class ProtectionRenewalPolicy
{
    public const int PriorityDays = 15;
    public const int EarlyDays = 30;

    public static DateOnly BusinessDay(DateTime utc) => ChannelSalesValidation.BusinessDate(utc);
    public static DateTime PriorityEnds(DateTime expires) => expires.AddDays(PriorityDays);
    public static bool EligibleWindow(DateTime now, DateTime expires) =>
        now >= expires.AddDays(-EarlyDays) && now < PriorityEnds(expires);

    // Contract service ends on an inclusive DATE; protection ends on a UTC instant.
    // Both expirations must refer to the same VN business day (or adjacent boundary day).
    public static bool ExpireTogether(DateOnly serviceEnd, DateTime protectionEnd) =>
        Math.Abs(serviceEnd.DayNumber - BusinessDay(protectionEnd).DayNumber) <= 1;

    public static bool ReservationApplies(DateTime now, DateTime protectionEnd, DateOnly serviceEnd) =>
        now >= protectionEnd && now < PriorityEnds(protectionEnd)
        && ExpireTogether(serviceEnd, protectionEnd);

    public static async Task<bool> HasConfirmedContinuationAsync(KidsfitDbContext db,
        SalesContract contract, DateTime oldProtectionEnd, DateTime now, CancellationToken ct)
    {
        // The accounting-confirmed service period must span the boundary being granted
        // (or begin on the following day), not merely be confirmed for a distant future year.
        var boundary = BusinessDay(oldProtectionEnd);
        var start = boundary > BusinessDay(now) ? boundary : BusinessDay(now);
        return await db.ContractRenewals.AnyAsync(r => r.ContractId == contract.Id
            && r.Status == "CONFIRMED" && r.ServiceStartOn <= start.AddDays(1)
            && r.ServiceEndOn >= start, ct);
    }

    public static async Task<bool> HasPriorityForOtherSalesAsync(KidsfitDbContext db,
        long customerId, long claimantId, DateTime now, CancellationToken ct)
    {
        var contracts = await db.SalesContracts.AsNoTracking()
            .Where(c => c.CustomerId == customerId && c.OwnerUserId != claimantId
                && c.Status == "ACTIVE" && c.VerifiedAt != null
                && !db.ContractCancellations.Any(x => x.ContractId == c.Id))
            .Select(c => new { c.Id, c.ServiceEndOn }).ToArrayAsync(ct);
        foreach (var c in contracts)
        {
            if (!c.ServiceEndOn.HasValue) continue;
            var dates = await db.CustomerProtections.AsNoTracking().Where(p =>
                p.ContractId == c.Id && p.SourceType == "CONTRACT")
                .OrderByDescending(p => p.EffectiveUntil)
                .Select(p => p.EffectiveUntil).Take(1).ToArrayAsync(ct);
            if (dates.Length > 0 && ReservationApplies(now, dates[0], c.ServiceEndOn.Value))
                return true;
        }
        return false;
    }

    public static async Task<int> SweepAsync(KidsfitDbContext db, DateTime now, CancellationToken ct = default)
    {
        var candidates = await db.SalesContracts.AsNoTracking()
            .Where(c => c.Status == "ACTIVE" && c.VerifiedAt != null
                && !db.ContractCancellations.Any(x => x.ContractId == c.Id))
            .ToArrayAsync(ct);
        var count = 0;
        foreach (var c in candidates)
        {
            ct.ThrowIfCancellationRequested();
            var prior = await db.CustomerProtections.AsNoTracking()
                .Where(p => p.ContractId == c.Id && p.SourceType == "CONTRACT"
                    && p.OwnerUserId == c.OwnerUserId)
                .OrderByDescending(p => p.EffectiveUntil).FirstOrDefaultAsync(ct);
            if (prior is null || !EligibleWindow(now, prior.EffectiveUntil)) continue;
            if (!await db.Users.AnyAsync(u => u.Id == c.OwnerUserId && u.Status == "ACTIVE", ct)
                || !await db.OrganizationMemberships.AnyAsync(m =>
                    m.UserId == c.OwnerUserId && m.OrganizationId == c.OwnerOrganizationId
                    && m.Status == "ACTIVE", ct)) continue;
            var hasRenewal = await HasConfirmedContinuationAsync(db, c, prior.EffectiveUntil, now, ct);
            var key = $"sl02:{c.Id}:{prior.EffectiveUntil.Ticks}:{c.OwnerUserId}";
            var status = hasRenewal ? "PENDING_MANAGER" : "WAITING_RENEWAL";
            // A unique binary key makes concurrent scans and retrying harmless.
            count += await db.Database.ExecuteSqlInterpolatedAsync($@"
                INSERT IGNORE INTO protection_renewal_cases
                (contract_id, customer_id, owner_user_id, owner_organization_id,
                 previous_protection_until, priority_until, status, source,
                 deduplication_key, created_at, updated_at)
                VALUES ({c.Id}, {c.CustomerId}, {c.OwnerUserId}, {c.OwnerOrganizationId},
                        {prior.EffectiveUntil}, {PriorityEnds(prior.EffectiveUntil)},
                        {status}, {"AUTO"}, {key}, {now}, {now})", ct);
            if (hasRenewal)
                await db.ProtectionRenewalCases.Where(x => x.DeduplicationKey == key
                    && x.Status == "WAITING_RENEWAL" && x.PriorityUntil > now)
                    .ExecuteUpdateAsync(set => set.SetProperty(x => x.Status, "PENDING_MANAGER")
                        .SetProperty(x => x.UpdatedAt, now), ct);
        }
        // A pending accounting review never creates indefinite ownership.
        await db.ProtectionRenewalCases.Where(x =>
            (x.Status == "WAITING_RENEWAL" || x.Status == "PENDING_MANAGER")
            && x.PriorityUntil <= now && x.PreviousProtectionUntil <= now)
            .ExecuteUpdateAsync(set => set.SetProperty(x => x.Status, "EXPIRED")
                .SetProperty(x => x.UpdatedAt, now), ct);
        return count;
    }
}

public sealed class ProtectionRenewalWorker(
    IServiceScopeFactory scopeFactory, ILogger<ProtectionRenewalWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await RunAsync(ct);
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(ct)) await RunAsync(ct);
    }

    private async Task RunAsync(CancellationToken ct)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<KidsfitDbContext>();
            var created = await ProtectionRenewalPolicy.SweepAsync(db, DateTime.UtcNow, ct);
            if (created > 0) logger.LogInformation("Protection renewal cases inserted: {Count}", created);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception e) { logger.LogWarning(e, "Protection renewal sweep failed; retry at next interval."); }
    }
}

using System.Data;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Features;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>Daily, repeat-safe CRM alerts and verified inactivity release; no external email sender.</summary>
public static class ContractLifecycleSweep
{
    public static async Task<(int notices, int released)> Run(KidsfitDbContext db, DateTime now, CancellationToken ct = default)
    {
        var today = ChannelSalesValidation.BusinessDate(now);
        var terms = await db.ContractServiceTerms.AsNoTracking()
            .Where(t => t.Status == "ACTIVE" && !db.ContractServiceTerms.Any(other =>
                other.CustomerId == t.CustomerId && other.Status == "ACTIVE" &&
                (other.EndOn > t.EndOn || (other.EndOn == t.EndOn && other.Id > t.Id))))
            .OrderBy(t => t.CustomerId).Take(10000).ToArrayAsync(ct);
        var count = 0;
        var released = 0;
        foreach (var term in terms)
        {
            // A submitted correction/renewal is a hold, not proof of a new active term.
            var waiting = await db.ContractServiceTerms.AnyAsync(t => t.CustomerId == term.CustomerId &&
                (t.Status == "PENDING_MANAGER" || t.Status == "PENDING_CHECKEE"), ct);
            var contract = await db.SalesContracts.AsNoTracking().Where(c => c.Id == term.ContractId)
                .Select(c => new { c.OwnerUserId, c.OwnerOrganizationId, c.CareUserId }).FirstOrDefaultAsync(ct);
            if (contract is null) continue;
            var recipients = new List<long> { contract.OwnerUserId };
            var manager = await db.OrganizationMemberships.AsNoTracking().Where(m =>
                m.UserId == contract.OwnerUserId && m.OrganizationId == contract.OwnerOrganizationId &&
                m.ManagerUserId != null).Select(m => m.ManagerUserId).FirstOrDefaultAsync(ct);
            if (manager.HasValue) recipients.Add(manager.Value);
            if (contract.CareUserId.HasValue) recipients.Add(contract.CareUserId.Value);
            var activeRecipients = await db.Users.AsNoTracking().Where(u => recipients.Contains(u.Id) &&
                u.Status == "ACTIVE" && db.OrganizationMemberships.Any(m =>
                    m.UserId == u.Id && m.Status == "ACTIVE" &&
                    db.Organizations.Any(o => o.Id == m.OrganizationId && o.Status == "ACTIVE")))
                .Select(u => u.Id).ToArrayAsync(ct);
            foreach (var days in new[] {30, 15, 7, 0, -30})
            {
                if (today != term.EndOn.AddDays(-days)) continue;
                // Once a renewal is verified, this term will not be the latest term.
                var kind = days > 0 ? "SERVICE_EXPIRING_" + days :
                    days == 0 ? "SERVICE_EXPIRED" : "SERVICE_OVERDUE_30";
                foreach (var recipient in activeRecipients)
                    count += await InsertNotice(db, term.Id, term.CustomerId, recipient, kind, term.EndOn, now, ct);
            }
            if (waiting) continue;
            foreach (var months in new[] {6, 11, 12})
            {
                if (today != term.EndOn.AddMonths(months)) continue;
                foreach (var recipient in activeRecipients)
                    count += await InsertNotice(db, term.Id, term.CustomerId, recipient,
                        "INTERRUPTED_" + months + "M", term.EndOn.AddMonths(months), now, ct);
            }
            // A release is never attempted from a missing/unverified service end date.
            if (today >= term.EndOn.AddMonths(12))
                released += await ReleaseIfEligible(db, term, now, ct);
        }

        // Independently remind when a *granted* Sales entitlement is about to expire.
        var protections = await db.CustomerProtections.AsNoTracking().Where(p =>
            p.SourceType == "CONTRACT" && p.Status == "ACTIVE" &&
            p.EffectiveUntil >= now.AddDays(-1) && p.EffectiveUntil <= now.AddDays(31)).Take(10000).ToArrayAsync(ct);
        foreach (var protection in protections)
        {
            var deadline = ChannelSalesValidation.BusinessDate(protection.EffectiveUntil);
            var kind = today == deadline ? "PROTECTION_EXPIRED"
                : today == deadline.AddDays(-30) ? "PROTECTION_EXPIRING_30" : null;
            if (kind is null) continue;
            var manager = await db.OrganizationMemberships.AsNoTracking()
                .Where(m => m.UserId == protection.OwnerUserId && m.OrganizationId == protection.OwnerOrganizationId)
                .Select(m => m.ManagerUserId).FirstOrDefaultAsync(ct);
            var ids = manager.HasValue ? new[] { protection.OwnerUserId, manager.Value } : new[] { protection.OwnerUserId };
            foreach (var recipient in ids.Distinct())
                if (await db.Users.AnyAsync(u => u.Id == recipient && u.Status == "ACTIVE" &&
                    db.OrganizationMemberships.Any(m => m.UserId == recipient && m.Status == "ACTIVE"), ct))
                    count += await InsertNotice(db, null, protection.CustomerId, recipient,
                        kind, deadline, now, ct, "protection:" + protection.Id);
        }
        return (count, released);
    }

    private static Task<int> InsertNotice(KidsfitDbContext db, long? termId, long customerId,
        long userId, string kind, DateOnly deadline, DateTime now, CancellationToken ct, string? sourceKey = null)
    {
        var key = $"term:{sourceKey ?? termId?.ToString() ?? "0"}:customer:{customerId}:recipient:{userId}:kind:{kind}:deadline:{deadline:yyyyMMdd}";
        var deadlineDateTime = deadline.ToDateTime(TimeOnly.MinValue);
        return db.Database.ExecuteSqlInterpolatedAsync($@"
            INSERT IGNORE INTO contract_lifecycle_alerts
              (service_term_id, customer_id, recipient_user_id, kind, deadline_on,
               deduplication_key, read_at, created_at, updated_at)
            VALUES ({termId}, {customerId}, {userId}, {kind}, {deadlineDateTime}, {key}, NULL, {now}, {now})", ct);
    }

    private static async Task<int> ReleaseIfEligible(KidsfitDbContext db,
        ContractServiceTerm term, DateTime now, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        // Follow the same customer lock order used by approach registration.
        var customer = await db.ChannelCustomers.FromSqlInterpolated(
            $"SELECT * FROM channel_customers WHERE id = {term.CustomerId} FOR UPDATE").SingleOrDefaultAsync(ct);
        if (customer is null) return 0;
        var today = ChannelSalesValidation.BusinessDate(now);
        if (today < term.EndOn.AddMonths(12)
            || await db.ContractServiceTerms.AnyAsync(t => t.CustomerId == term.CustomerId &&
                ((t.Status == "ACTIVE" && (t.EndOn > term.EndOn || t.Id == term.Id && t.EndOn >= today))
                 || t.Status == "PENDING_MANAGER" || t.Status == "PENDING_CHECKEE"), ct)
            || await db.SchoolDisputes.AnyAsync(d => d.CustomerId == term.CustomerId && d.Status == "OPEN", ct)
            || await db.ReconciliationCases.AnyAsync(r => r.CustomerId == term.CustomerId && r.Status == "DISPUTED", ct)
            || await db.SalesContracts.AnyAsync(c => c.CustomerId == term.CustomerId && c.Id != term.ContractId &&
                c.VerifiedAt != null && c.Status == "ACTIVE" && c.VerifiedAt > term.EndOn.ToDateTime(TimeOnly.MaxValue), ct))
            return 0;

        var valid = await db.CustomerProtections.Where(p => p.CustomerId == term.CustomerId &&
            p.ContractId == term.ContractId && p.Status == "ACTIVE" && p.SourceType == "CONTRACT" &&
            p.EffectiveUntil > now).ToArrayAsync(ct);
        if (valid.Length == 0) return 0;
        foreach (var item in valid) { item.Status = "EXPIRED"; item.UpdatedAt = now; }
        var registrationIds = valid.Where(p => p.ApproachRegistrationId.HasValue)
            .Select(p => p.ApproachRegistrationId!.Value).ToArray();
        var regs = await db.ApproachRegistrations.Where(r => registrationIds.Contains(r.Id) &&
            r.Status == "CONVERTED").ToArrayAsync(ct);
        foreach (var registration in regs) { registration.Status = "EXPIRED"; registration.ExpiredAt = now; registration.UpdatedAt = now; }
        if (!await db.CustomerProtections.AnyAsync(p => p.CustomerId == term.CustomerId &&
            p.Status == "ACTIVE" && p.EffectiveUntil > now && !valid.Select(x => x.Id).Contains(p.Id), ct))
        { customer.LifecycleStatus = "PROSPECT"; customer.UpdatedAt = now; }
        db.ContractServiceEvents.Add(new ContractServiceEvent {
            CustomerId = term.CustomerId, ServiceTermId = term.Id, ActorUserId = null,
            Kind = "RELEASED_AFTER_12M", Reason = "Đã đủ 12 tháng không tái ký hợp lệ và không có tranh chấp.",
            CreatedAt = now, UpdatedAt = now
        });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return valid.Length;
    }
}

/// <summary>Retries after transient DB outages; checks once at startup and once daily.</summary>
public sealed class ContractLifecycleWorker(IServiceScopeFactory scopes, ILogger<ContractLifecycleWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Check(stoppingToken);
        using var timer = new PeriodicTimer(TimeSpan.FromHours(24));
        while (await timer.WaitForNextTickAsync(stoppingToken))
            await Check(stoppingToken);
    }
    private async Task Check(CancellationToken ct)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<KidsfitDbContext>();
            var (notices, released) = await ContractLifecycleSweep.Run(db, DateTime.UtcNow, ct);
            if (notices > 0 || released > 0)
                logger.LogInformation("Contract lifecycle: {Notices} notices, {Released} releases.", notices, released);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception error) { logger.LogWarning(error, "Contract lifecycle sweep failed; will retry."); }
    }
}

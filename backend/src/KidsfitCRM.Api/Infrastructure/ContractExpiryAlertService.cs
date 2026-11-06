using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>
/// NT-01 daily milestones. Uses verified service terms / confirmed renewals and
/// contract protections; never creates service periods, financial records or rights.
/// </summary>
public static class ContractExpiryAlertService
{
    private static readonly int[] ServiceOffsets = [30, 15, 7, 0, -30];
    private static readonly int[] ProtectionOffsets = [30, 7, 0];
    private static readonly TimeZoneInfo VietnamZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");

    public static DateOnly BusinessDate(DateTime utc) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), VietnamZone));

    internal static IEnumerable<(string Kind, DateOnly DueOn)> Milestones(
        string prefix, DateOnly expiresOn, DateOnly today)
    {
        var offsets = prefix == "SERVICE" ? ServiceOffsets : ProtectionOffsets;
        foreach (var days in offsets)
        {
            var due = expiresOn.AddDays(-days);
            if (due != today) continue;
            var kind = days > 0 ? $"{prefix}_BEFORE_{days}"
                : days == 0 ? $"{prefix}_EXPIRED" : $"{prefix}_AFTER_{-days}";
            yield return (kind, due);
        }
    }

    public static async Task<int> SweepAsync(KidsfitDbContext db, DateTime now, CancellationToken ct = default)
    {
        var today = BusinessDate(now);
        var contracts = await db.SalesContracts.AsNoTracking()
            .Where(c => c.Status == "ACTIVE" && c.VerifiedAt != null && c.RequiresSchoolVerification)
            .Select(c => new { c.Id, c.OwnerUserId, c.OwnerOrganizationId,
                c.CareUserId, c.CareOrganizationId, c.ServiceEndOn })
            .ToArrayAsync(ct);
        if (contracts.Length == 0) return 0;
        var contractIds = contracts.Select(x => x.Id).ToArray();
        var renewals = await db.ContractRenewals.AsNoTracking()
            .Where(x => contractIds.Contains(x.ContractId) && x.Status == "CONFIRMED")
            .Select(x => new { x.ContractId, x.ServiceEndOn }).ToArrayAsync(ct);
        var finalEnds = renewals.GroupBy(x => x.ContractId).ToDictionary(x => x.Key, x => x.Max(v => v.ServiceEndOn));
        var protections = await db.CustomerProtections.AsNoTracking()
            .Where(p => p.ContractId.HasValue && contractIds.Contains(p.ContractId.Value)
                && p.SourceType == "CONTRACT" && p.Status == "ACTIVE")
            .Select(p => new { p.ContractId, p.OwnerUserId, p.EffectiveUntil }).ToArrayAsync(ct);
        var membership = await db.OrganizationMemberships.AsNoTracking()
            .Where(m => m.Status == "ACTIVE" && m.ManagerUserId.HasValue)
            .Select(m => new { m.UserId, m.OrganizationId, m.ManagerUserId }).ToArrayAsync(ct);
        var activeUsers = (await (from user in db.Users.AsNoTracking()
            join member in db.OrganizationMemberships.AsNoTracking() on user.Id equals member.UserId
            join org in db.Organizations.AsNoTracking() on member.OrganizationId equals org.Id
            where user.Status == "ACTIVE" && member.Status == "ACTIVE" && org.Status == "ACTIVE"
                && (from ur in db.UserRoles
                    join rp in db.PermissionRoles on ur.RoleId equals rp.RoleId
                    join permission in db.Permissions on rp.PermissionId equals permission.Id
                    where ur.UserId == user.Id && (permission.Code == "channel_sales.customer.view"
                        || permission.Code == "school_support.manage")
                    select ur.UserId).Any()
            select user.Id).Distinct().ToArrayAsync(ct)).ToHashSet();

        var created = 0;
        foreach (var contract in contracts)
        {
            ct.ThrowIfCancellationRequested();
            if (await db.ContractCancellations.AnyAsync(x => x.ContractId == contract.Id, ct))
            {
                await ResolveAsync(db, contract.Id, [], now, ct);
                continue;
            }
            var serviceEnd = finalEnds.TryGetValue(contract.Id, out var confirmedEnd)
                ? confirmedEnd : contract.ServiceEndOn;
            var recipients = new HashSet<long> { contract.OwnerUserId };
            if (contract.CareUserId.HasValue && contract.CareOrganizationId.HasValue)
                recipients.Add(contract.CareUserId.Value);
            foreach (var manager in membership.Where(x => x.UserId == contract.OwnerUserId
                && x.OrganizationId == contract.OwnerOrganizationId && x.ManagerUserId.HasValue))
                recipients.Add(manager.ManagerUserId!.Value);
            recipients.IntersectWith(activeUsers);

            var rightsRecipientsForContract = new HashSet<long> { contract.OwnerUserId };
            foreach (var manager in membership.Where(x => x.UserId == contract.OwnerUserId
                && x.OrganizationId == contract.OwnerOrganizationId && x.ManagerUserId.HasValue))
                rightsRecipientsForContract.Add(manager.ManagerUserId!.Value);
            rightsRecipientsForContract.IntersectWith(activeUsers);
            if (serviceEnd.HasValue)
            {
                foreach (var (kind, due) in Milestones("SERVICE", serviceEnd.Value, today))
                foreach (var recipient in recipients)
                {
                    var key = $"nt01:{contract.Id}:service:{serviceEnd:yyyyMMdd}:{kind}:{recipient}";
                    created += await InsertAsync(db, contract.Id, recipient, kind, serviceEnd.Value, due, key, now, ct);
                }
            }
            foreach (var protection in protections.Where(p => p.ContractId == contract.Id
                && p.OwnerUserId == contract.OwnerUserId))
            {
                // Owner / direct manager only. CSKH does not receive sales-rights notifications.
                var rightsRecipients = rightsRecipientsForContract;
                var expires = BusinessDate(protection.EffectiveUntil);
                foreach (var (kind, due) in Milestones("PROTECTION", expires, today))
                foreach (var recipient in rightsRecipients)
                {
                    var key = $"nt01:{contract.Id}:protection:{expires:yyyyMMdd}:{kind}:{recipient}";
                    created += await InsertAsync(db, contract.Id, recipient, kind, expires, due, key, now, ct);
                }
            }
            // Only expire obsolete OPEN alerts if a later confirmed term supplants their deadline,
            // or if the user has lost their active assignment. Read alerts remain audit history.
            var open = await db.ContractExpiryAlerts.Where(x => x.ContractId == contract.Id
                && x.Status == "OPEN").ToArrayAsync(ct);
            foreach (var item in open)
            {
                if ((item.Kind.StartsWith("SERVICE_", StringComparison.Ordinal)
                    && (!serviceEnd.HasValue || item.MilestoneOn != serviceEnd.Value || !recipients.Contains(item.RecipientUserId)))
                    || (item.Kind.StartsWith("PROTECTION_", StringComparison.Ordinal)
                    && (!protections.Any(p => p.ContractId == contract.Id
                        && BusinessDate(p.EffectiveUntil) == item.MilestoneOn)
                        || !rightsRecipientsForContract.Contains(item.RecipientUserId))))
                {
                    item.Status = "RESOLVED";
                    item.ResolvedAt = now;
                    item.UpdatedAt = now;
                }
            }
            await db.SaveChangesAsync(ct);
        }
        return created;
    }

    private static async Task ResolveAsync(KidsfitDbContext db, long contractId,
        IReadOnlyCollection<string> _keys, DateTime now, CancellationToken ct)
    {
        await db.ContractExpiryAlerts.Where(x => x.ContractId == contractId && x.Status == "OPEN")
            .ExecuteUpdateAsync(x => x.SetProperty(a => a.Status, "RESOLVED")
                .SetProperty(a => a.ResolvedAt, now).SetProperty(a => a.UpdatedAt, now), ct);
    }

    private static Task<int> InsertAsync(KidsfitDbContext db, long contractId, long recipient,
        string kind, DateOnly milestone, DateOnly due, string key, DateTime now, CancellationToken ct) =>
        db.Database.ExecuteSqlInterpolatedAsync($@"
            INSERT IGNORE INTO contract_expiry_alerts
                (contract_id, recipient_user_id, kind, deduplication_key, status,
                 due_on, milestone_on, created_at, updated_at)
            VALUES ({contractId}, {recipient}, {kind}, {key}, {"OPEN"},
                    {due}, {milestone}, {now}, {now})", ct);
}

public sealed class ContractExpiryAlertWorker(IServiceScopeFactory scopes,
    ILogger<ContractExpiryAlertWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await CheckAsync(stoppingToken);
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
            await CheckAsync(stoppingToken);
    }

    private async Task CheckAsync(CancellationToken ct)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<KidsfitDbContext>();
            var count = await ContractExpiryAlertService.SweepAsync(db, DateTime.UtcNow, ct);
            if (count > 0) logger.LogInformation("Created {Count} NT-01 contract notices.", count);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception error)
        {
            logger.LogWarning(error, "NT-01 sweep failed; will retry.");
        }
    }
}

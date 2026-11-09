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

    public static IEnumerable<(string Kind, DateOnly DueOn)> Milestones(
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

    public static async Task<int> SweepAsync(KidsfitDbContext db, DateTime now, CancellationToken ct = default,
        int accountingExceptionHours = 0)
    {
        var today = BusinessDate(now);
        // Canceled or no-longer-verified contracts may fall out of the candidate query;
        // resolve their older notices before scanning ACTIVE contracts.
        await db.ContractExpiryAlerts.Where(a => a.Status == "OPEN"
            && !db.SalesContracts.Any(c => c.Id == a.ContractId
                && c.Status == "ACTIVE" && c.VerifiedAt != null && c.RequiresSchoolVerification
                && !db.ContractCancellations.Any(x => x.ContractId == c.Id)))
            .ExecuteUpdateAsync(x => x.SetProperty(a => a.Status, "RESOLVED")
                .SetProperty(a => a.ResolvedAt, now)
                .SetProperty(a => a.UpdatedAt, now), ct);
        var contracts = await db.SalesContracts.AsNoTracking()
            .Where(c => c.Status == "ACTIVE" && c.VerifiedAt != null && c.RequiresSchoolVerification)
            .Select(c => new { c.Id, c.CustomerId, c.OwnerUserId, c.OwnerOrganizationId,
                c.CareUserId, c.CareOrganizationId, c.ServiceEndOn })
            .ToArrayAsync(ct);
        if (contracts.Length == 0) return 0;
        var contractIds = contracts.Select(x => x.Id).ToArray();
        var renewals = await db.ContractRenewals.AsNoTracking()
            .Where(x => contractIds.Contains(x.ContractId) && x.Status == "CONFIRMED")
            .Select(x => new { x.ContractId, x.ServiceStartOn, x.ServiceEndOn }).ToArrayAsync(ct);
        var finalEnds = renewals.GroupBy(x => x.ContractId).ToDictionary(x => x.Key, x => x.Max(v => v.ServiceEndOn));
        var protections = await db.CustomerProtections.AsNoTracking()
            .Where(p => p.ContractId.HasValue && contractIds.Contains(p.ContractId.Value)
                && p.SourceType == "CONTRACT" && p.Status == "ACTIVE")
            .Select(p => new { p.ContractId, p.OwnerUserId, p.EffectiveUntil }).ToArrayAsync(ct);
        var membership = await db.OrganizationMemberships.AsNoTracking()
            .Where(m => m.Status == "ACTIVE" && m.ManagerUserId.HasValue
                && db.OrganizationMemberships.Any(manager => manager.UserId == m.ManagerUserId.Value
                    && manager.OrganizationId == m.OrganizationId && manager.Status == "ACTIVE"))
            .Select(m => new { m.UserId, m.OrganizationId, m.ManagerUserId }).ToArrayAsync(ct);
        var activeOrgMemberships = (await db.OrganizationMemberships.AsNoTracking()
            .Where(m => m.Status == "ACTIVE")
            .Select(m => new { m.UserId, m.OrganizationId }).ToArrayAsync(ct))
            .Select(m => (m.UserId, m.OrganizationId)).ToHashSet();
        var activeUsers = (await (from user in db.Users.AsNoTracking()
            join member in db.OrganizationMemberships.AsNoTracking() on user.Id equals member.UserId
            join org in db.Organizations.AsNoTracking() on member.OrganizationId equals org.Id
            where user.Status == "ACTIVE" && member.Status == "ACTIVE" && org.Status == "ACTIVE"
                && (from ur in db.UserRoles
                    join rp in db.PermissionRoles on ur.RoleId equals rp.RoleId
                    join permission in db.Permissions on rp.PermissionId equals permission.Id
                    where ur.UserId == user.Id && (permission.Code == "channel_sales.customer.view"
                        || permission.Code == "channel_sales.school.support.manage")
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
            var recipients = new HashSet<long>();
            if (activeOrgMemberships.Contains((contract.OwnerUserId, contract.OwnerOrganizationId)))
                recipients.Add(contract.OwnerUserId);
            if (contract.CareUserId.HasValue && contract.CareOrganizationId.HasValue
                && activeOrgMemberships.Contains((contract.CareUserId.Value, contract.CareOrganizationId.Value)))
                recipients.Add(contract.CareUserId.Value);
            foreach (var manager in membership.Where(x => x.UserId == contract.OwnerUserId
                && x.OrganizationId == contract.OwnerOrganizationId && x.ManagerUserId.HasValue))
                recipients.Add(manager.ManagerUserId!.Value);
            recipients.IntersectWith(activeUsers);

            var rightsRecipientsForContract = new HashSet<long>();
            if (activeOrgMemberships.Contains((contract.OwnerUserId, contract.OwnerOrganizationId)))
                rightsRecipientsForContract.Add(contract.OwnerUserId);
            foreach (var manager in membership.Where(x => x.UserId == contract.OwnerUserId
                && x.OrganizationId == contract.OwnerOrganizationId && x.ManagerUserId.HasValue))
                rightsRecipientsForContract.Add(manager.ManagerUserId!.Value);
            rightsRecipientsForContract.IntersectWith(activeUsers);
            // When a later confirmed renewal leaves a gap, notify about the interruption
            // rather than incorrectly treating the school as fully terminated.
            var validGapStarts = new HashSet<DateOnly>();
            DateOnly? previousEnd = contract.ServiceEndOn;
            foreach (var confirmed in renewals.Where(x => x.ContractId == contract.Id)
                .OrderBy(x => x.ServiceStartOn))
            {
                if (previousEnd.HasValue && confirmed.ServiceStartOn > previousEnd.Value.AddDays(1))
                {
                    var gapStart = previousEnd.Value.AddDays(1);
                    if (today < confirmed.ServiceStartOn)
                    {
                        validGapStarts.Add(gapStart);
                        foreach (var leadDays in new[] { 30, 15, 7, 0 })
                        {
                            if (today != gapStart.AddDays(-leadDays)) continue;
                            var kind = leadDays == 0 ? "SERVICE_INTERRUPTED" : $"SERVICE_GAP_BEFORE_{leadDays}";
                            foreach (var recipient in recipients)
                            {
                                var key = $"nt01:{contract.Id}:gap:{gapStart:yyyyMMdd}:{kind}:{recipient}";
                                created += await InsertAsync(db, contract.Id, recipient, kind, gapStart, today, key, now, ct);
                            }
                        }
                    }
                }
                previousEnd = confirmed.ServiceEndOn;
            }

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
            // GI-01: per-recipient notice milestones from the entire verified service timeline.
            // This does not alter customer rights; actual release belongs to GI-01 worker.
            var interruption = await ServiceInterruptionService.AssessAsync(
                db, contract.CustomerId, today, now, ct, accountingExceptionHours);
            if (interruption?.Assessment.ThresholdOn is DateOnly threshold
                && interruption.Status != "CONTINUOUS"
                && interruption.Status != "MISSINGSERVICETERM")
            {
                // Director receives a distinct durable exception alert only after the threshold
                // or when the accounting exception SLA has not been configured.
                if (interruption.Status is "EXCEPTION_OVERDUE" or "EXCEPTION_CONFIG_REQUIRED")
                {
                    var directorIds = await (from membership in db.OrganizationMemberships.AsNoTracking()
                        join organization in db.Organizations.AsNoTracking()
                            on membership.OrganizationId equals organization.Id
                        join user in db.Users.AsNoTracking() on membership.UserId equals user.Id
                        join ur in db.UserRoles.AsNoTracking() on user.Id equals ur.UserId
                        join role in db.Roles.AsNoTracking() on ur.RoleId equals role.Id
                        where organization.Code == "KIDSFIT" && membership.Status == "ACTIVE"
                              && organization.Status == "ACTIVE" && user.Status == "ACTIVE"
                              && role.Code == "DIRECTOR"
                        select user.Id).Distinct().ToArrayAsync(ct);
                    var exceptionKind = interruption.Status == "EXCEPTION_OVERDUE"
                        ? "GI01_EXCEPTION_OVERDUE" : "GI01_CONFIG_REQUIRED";
                    foreach (var directorId in directorIds)
                    {
                        var key = $"gi01:director:{interruption.CustomerId}:{threshold:yyyyMMdd}:{exceptionKind}:{directorId}";
                        created += await InsertAsync(db, contract.Id, directorId, exceptionKind,
                            threshold, today, key, now, ct);
                    }
                }

                foreach (var (daysBefore, due) in ServiceInterruptionPolicy.WarningMilestones(threshold))
                {
                    if (today != due) continue;
                    var kind = daysBefore == 0 ? "GI01_THRESHOLD" : $"GI01_BEFORE_{daysBefore}";
                    foreach (var recipient in recipients)
                    {
                        var key = $"gi01:notice:{interruption.CustomerId}:{threshold:yyyyMMdd}:{kind}:{recipient}";
                        created += await InsertAsync(db, contract.Id, recipient, kind,
                            threshold, due, key, now, ct);
                    }
                }
            }

            // Only expire obsolete OPEN alerts if a later confirmed term supplants their deadline,
            // or if the user has lost their active assignment. Read alerts remain audit history.
            var open = await db.ContractExpiryAlerts.Where(x => x.ContractId == contract.Id
                && x.Status == "OPEN").ToArrayAsync(ct);
            foreach (var item in open)
            {
                var isGap = item.Kind.StartsWith("SERVICE_GAP_", StringComparison.Ordinal)
                    || item.Kind == "SERVICE_INTERRUPTED";
                var obsoleteGap = isGap && (!validGapStarts.Contains(item.MilestoneOn)
                    || !recipients.Contains(item.RecipientUserId));
                var obsoleteService = !isGap && item.Kind.StartsWith("SERVICE_", StringComparison.Ordinal)
                    && (!serviceEnd.HasValue || item.MilestoneOn != serviceEnd.Value
                        || !recipients.Contains(item.RecipientUserId));
                var obsoleteProtection = item.Kind.StartsWith("PROTECTION_", StringComparison.Ordinal)
                    && (!protections.Any(p => p.ContractId == contract.Id
                        && BusinessDate(p.EffectiveUntil) == item.MilestoneOn)
                        || !rightsRecipientsForContract.Contains(item.RecipientUserId));
                if (obsoleteGap || obsoleteService || obsoleteProtection)
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
    IConfiguration configuration, ILogger<ContractExpiryAlertWorker> logger) : BackgroundService
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
            var count = await ContractExpiryAlertService.SweepAsync(db, DateTime.UtcNow, ct,
                configuration.GetValue<int>("GI01:AccountingExceptionHours"));
            if (count > 0) logger.LogInformation("Created {Count} NT-01 contract notices.", count);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception error)
        {
            logger.LogWarning(error, "NT-01 sweep failed; will retry.");
        }
    }
}

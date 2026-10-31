using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>
/// Durable, repeat-safe overdue escalation. No auto-approval and no external delivery provider.
/// The DB unique key guarantees at most one alert per recipient, proposal deadline and kind.
/// </summary>
public static class SchoolProposalAlertService
{
    public static async Task<int> SweepAsync(KidsfitDbContext db, DateTime now, CancellationToken ct = default)
    {
        // Close stale alerts even when a proposal was resolved by an administrative path.
        await db.SchoolProposalAlerts
            .Where(a => a.Status == "OPEN" && db.SchoolProposals.Any(p => p.Id == a.SchoolProposalId && p.Status != "PENDING_ADMIN"))
            .ExecuteUpdateAsync(set => set.SetProperty(a => a.Status, "RESOLVED").SetProperty(a => a.ResolvedAt, now), ct);

        // Only active central KIDSFIT Admins and Directors may see the escalation.
        // Do NOT notify partner managers or every account carrying a similar membership.
        var recipients = await
            (from userRole in db.UserRoles
             join role in db.Roles on userRole.RoleId equals role.Id
             join user in db.Users on userRole.UserId equals user.Id
             join membership in db.OrganizationMemberships on user.Id equals membership.UserId
             join org in db.Organizations on membership.OrganizationId equals org.Id
             where (role.Code == "ADMIN" || role.Code == "DIRECTOR")
                   && user.Status == "ACTIVE" && membership.Status == "ACTIVE"
                   && org.Status == "ACTIVE" && org.Code == "KIDSFIT"
             select new { UserId = user.Id, RoleCode = role.Code }).Distinct().ToArrayAsync(ct);
        if (recipients.Length == 0) return 0;

        var added = 0;
        const int batchSize = 200;
        // Iterate every expired proposal; always use a stable ID cursor, never Take(200) repeatedly.
        long lastId = 0;
        while (true)
        {
            var overdue = await db.SchoolProposals.AsNoTracking()
                .Where(p => p.Id > lastId && p.Status == "PENDING_ADMIN" && p.ReviewDueAt <= now)
                .OrderBy(p => p.Id)
                .Select(p => new { p.Id, p.ReviewDueAt })
                .Take(batchSize).ToArrayAsync(ct);
            if (overdue.Length == 0) break;
            lastId = overdue[^1].Id;
            foreach (var proposal in overdue)
            foreach (var recipient in recipients)
            {
                var kind = recipient.RoleCode == "ADMIN" ? "ADMIN_OVERDUE" : "DIRECTOR_ESCALATION";
                var key = $"proposal:{proposal.Id}:{proposal.ReviewDueAt.Ticks}:{recipient.UserId}:{kind}";
                // INSERT IGNORE + unique binary key is concurrency-safe even with several API workers.
                added += await db.Database.ExecuteSqlInterpolatedAsync($@"
                    INSERT IGNORE INTO school_proposal_alerts
                      (school_proposal_id, recipient_user_id, kind, status, deduplication_key,
                       due_at, created_at, updated_at)
                    VALUES ({proposal.Id}, {recipient.UserId}, {kind}, {"OPEN"}, {key},
                            {proposal.ReviewDueAt}, {now}, {now})", ct);
            }
        }
        return added;
    }
}

/// <summary>Checks overdue Admin proposals on startup and on a bounded periodic interval.</summary>
public sealed class SchoolProposalAlertWorker(
    IServiceScopeFactory scopes,
    ILogger<SchoolProposalAlertWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await CheckAsync(stoppingToken);
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
            await CheckAsync(stoppingToken);
    }

    private async Task CheckAsync(CancellationToken ct)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<KidsfitDbContext>();
            var count = await SchoolProposalAlertService.SweepAsync(db, DateTime.UtcNow, ct);
            if (count > 0) logger.LogInformation("Created {Count} school proposal overdue alerts.", count);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception error)
        {
            // A temporary MySQL outage must not bring down the whole API.
            logger.LogWarning(error, "School proposal escalation sweep failed; will retry.");
        }
    }
}

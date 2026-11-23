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
        await db.CrmNotifications
            .Where(a => a.EntityType == nameof(SchoolProposal) && a.Status == "OPEN"
                && (a.Kind == "ADMIN_OVERDUE" || a.Kind == "DIRECTOR_ESCALATION")
                && db.SchoolProposals.Any(p => p.Id == a.EntityId && p.Status != "PENDING_ADMIN"))
            .ExecuteUpdateAsync(set => set.SetProperty(a => a.Status, "RESOLVED")
                .SetProperty(a => a.ResolvedAt, now).SetProperty(a => a.UpdatedAt, now), ct);

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
             select new { UserId = user.Id, OrganizationId = org.Id, RoleCode = role.Code }).Distinct().ToArrayAsync(ct);
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
                var title = kind == "ADMIN_OVERDUE" ? "Đề xuất trường quá hạn" : "Đề xuất trường cần BGĐ giám sát";
                var message = kind == "ADMIN_OVERDUE" ? "Đề xuất trường quá hạn chờ Admin xem xét." : "Đề xuất trường quá hạn Admin, cần BGĐ giám sát.";
                var target = kind == "ADMIN_OVERDUE" ? "admin-proposals" : "role-board-overdue";
                // INSERT IGNORE + unique binary key is concurrency-safe even with several API workers.
                added += await db.Database.ExecuteSqlInterpolatedAsync($@"
                    INSERT IGNORE INTO crm_notifications
                      (organization_id, recipient_user_id, kind, entity_type, entity_id,
                       title, message, target_view, deduplication_key, status,
                       due_at, created_at, updated_at)
                    VALUES ({recipient.OrganizationId}, {recipient.UserId}, {kind}, {nameof(SchoolProposal)}, {proposal.Id},
                            {title},
                            {message},
                            {target},
                            {key}, {"OPEN"}, {proposal.ReviewDueAt}, {now}, {now})", ct);
            }
        }
        return added;
    }
}

/// <summary>Existing review-due threshold only; no invented early-warning SLA or auto-approval.</summary>
public static class SchoolExtensionOverdueNoticeService
{
    public static async Task<int> SweepAsync(KidsfitDbContext db, DateTime now, CancellationToken ct = default)
    {
        await db.CrmNotifications.Where(n => n.EntityType == nameof(SchoolExtensionRequest)
            && n.Kind == "SCHOOL_EXTENSION_REVIEW_OVERDUE" && n.Status == "OPEN"
            && db.SchoolExtensionRequests.Any(e => e.Id == n.EntityId && e.Status != "PENDING"))
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "RESOLVED")
                .SetProperty(x => x.ResolvedAt, now).SetProperty(x => x.UpdatedAt, now), ct);
        long lastId = 0;
        var created = 0;
        while (true)
        {
            var overdue = await db.SchoolExtensionRequests.AsNoTracking()
                .Where(e => e.Id > lastId && e.Status == "PENDING" && e.ReviewDueAt <= now)
                .OrderBy(e => e.Id)
                .Select(e => new { e.Id, e.OrganizationId, e.ManagerUserId, e.ReviewDueAt })
                .Take(200).ToArrayAsync(ct);
            if (overdue.Length == 0) break;
            lastId = overdue[^1].Id;
            foreach (var e in overdue)
            {
                var valid = await db.OrganizationMemberships.AsNoTracking().AnyAsync(m =>
                    m.UserId == e.ManagerUserId && m.OrganizationId == e.OrganizationId
                    && m.Status == "ACTIVE" && db.Users.Any(u => u.Id == m.UserId && u.Status == "ACTIVE")
                    && db.Organizations.Any(o => o.Id == m.OrganizationId && o.Status == "ACTIVE"), ct);
                if (!valid) continue;
                var key = $"extension-review-overdue:{e.Id}:{e.ReviewDueAt.Ticks}:{e.ManagerUserId}";
                created += await db.Database.ExecuteSqlInterpolatedAsync($@"
                    INSERT IGNORE INTO crm_notifications
                        (organization_id, recipient_user_id, kind, entity_type, entity_id,
                         title, message, target_view, deduplication_key, status,
                         due_at, created_at, updated_at)
                    VALUES ({e.OrganizationId}, {e.ManagerUserId}, {"SCHOOL_EXTENSION_REVIEW_OVERDUE"},
                            {nameof(SchoolExtensionRequest)}, {e.Id}, {"Yêu cầu gia hạn đã quá hạn xét duyệt"},
                            {"Yêu cầu gia hạn đang chờ Quản lý và đã vượt thời gian xét duyệt."},
                            {"manager-extensions"}, {key}, {"OPEN"}, {e.ReviewDueAt}, {now}, {now})", ct);
            }
        }
        return created;
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
            var now = DateTime.UtcNow;
            var proposalCount = await SchoolProposalAlertService.SweepAsync(db, now, ct);
            var extensionCount = await SchoolExtensionOverdueNoticeService.SweepAsync(db, now, ct);
            if (proposalCount + extensionCount > 0)
                logger.LogInformation("Created {Proposals} overdue proposals and {Extensions} overdue extension notices.",
                    proposalCount, extensionCount);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception error)
        {
            // A temporary MySQL outage must not bring down the whole API.
            logger.LogWarning(error, "School proposal escalation sweep failed; will retry.");
        }
    }
}

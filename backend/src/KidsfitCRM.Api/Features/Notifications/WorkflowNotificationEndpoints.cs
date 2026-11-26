using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>Recipient-scoped workflow inbox; existing NT-01 and overdue endpoints remain backward-compatible.</summary>
public static class WorkflowNotificationEndpoints
{
    public static RouteGroupBuilder MapWorkflowNotifications(this RouteGroupBuilder secured)
    {
        var group = secured.MapGroup("/notifications");
        group.MapGet("", async (HttpContext http, KidsfitDbContext db, bool? unreadOnly, int? page, CancellationToken ct) =>
        {
            var userId = http.UserId();
            var pageNumber = Math.Clamp(page ?? 1, 1, 1000);
            var query = Visible(db, userId);
            if (unreadOnly == true) query = query.Where(x => x.ReadAt == null && x.Status == "OPEN");
            var unread = await Visible(db, userId).CountAsync(x => x.ReadAt == null && x.Status == "OPEN", ct);
            var rows = await query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
                .Skip((pageNumber - 1) * 50).Take(50)
                .Select(x => new { x.Id, x.Kind, x.Title, x.Message, x.EntityType, x.EntityId,
                    x.TargetView, x.CreatedAt, x.ReadAt, x.Status })
                .ToArrayAsync(ct);
            return Results.Ok(new { unread_count = unread, page = pageNumber, data = rows });
        });
        group.MapPost("/{id:long}/read", async (long id, HttpContext http, KidsfitDbContext db, CancellationToken ct) =>
        {
            var userId = http.UserId();
            var own = Visible(db, userId).Where(x => x.Id == id);
            if (!await own.AnyAsync(ct)) throw new KeyNotFoundException();
            var now = DateTime.UtcNow;
            await own.Where(x => x.ReadAt == null).ExecuteUpdateAsync(
                set => set.SetProperty(x => x.ReadAt, now).SetProperty(x => x.UpdatedAt, now), ct);
            return Results.Ok(new { success = true });
        });
        return secured;
    }

    private static IQueryable<CrmNotification> Visible(KidsfitDbContext db, long userId) =>
        db.CrmNotifications.Where(x => x.RecipientUserId == userId
            && db.Users.Any(u => u.Id == userId && u.Status == "ACTIVE")
            && db.OrganizationMemberships.Any(m => m.OrganizationId == x.OrganizationId
                && m.UserId == userId && m.Status == "ACTIVE"
                && db.Organizations.Any(o => o.Id == m.OrganizationId && o.Status == "ACTIVE")));
}

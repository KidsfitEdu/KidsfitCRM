using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public static class SchoolProposalAlertEndpoints
{
    public static RouteGroupBuilder MapSchoolProposalAlerts(this RouteGroupBuilder secured)
    {
        var alerts = secured.MapGroup("/notifications");
        alerts.MapGet("", async (HttpContext http, KidsfitDbContext db, CancellationToken ct) =>
        {
            var userId = http.UserId();
            // Revoked Admin/Director privileges must also revoke access to old alerts.
            if (!await IsCentralReviewer(db, userId, ct))
                return Results.Ok(new { unread_count = 0, data = Array.Empty<object>() });
            // Only the signed-in recipient can read notices. No cross-tenant query parameter.
            var items = await
                (from alert in db.SchoolProposalAlerts.AsNoTracking()
                 join proposal in db.SchoolProposals.AsNoTracking() on alert.SchoolProposalId equals proposal.Id
                 where alert.RecipientUserId == userId && alert.Status == "OPEN"
                 orderby alert.CreatedAt descending
                 select new
                 {
                     alert.Id, alert.Kind, alert.DueAt, alert.CreatedAt, alert.ReadAt,
                     alert.SchoolProposalId, proposal.Name, proposal.SchoolCode
                 }).Take(50).ToArrayAsync(ct);
            var unread = await db.SchoolProposalAlerts.CountAsync(x =>
                x.RecipientUserId == userId && x.Status == "OPEN" && x.ReadAt == null, ct);
            return Results.Ok(new
            {
                unread_count = unread,
                data = items.Select(x => new
                {
                    x.Id, x.Kind, x.DueAt, x.CreatedAt, x.ReadAt, x.SchoolProposalId,
                    school_name = x.Name, school_code = x.SchoolCode,
                    message = x.Kind == "ADMIN_OVERDUE"
                        ? "Đề xuất trường đã quá hạn chờ Admin xem xét."
                        : "Đề xuất trường quá hạn Admin, cần BGĐ giám sát."
                })
            });
        });
        alerts.MapPost("/{id:long}/read", async (long id, HttpContext http, KidsfitDbContext db, CancellationToken ct) =>
        {
            var userId = http.UserId();
            if (!await IsCentralReviewer(db, userId, ct)) throw new KeyNotFoundException();
            var ownAlert = db.SchoolProposalAlerts.Where(x =>
                x.Id == id && x.RecipientUserId == userId && x.Status == "OPEN");
            if (!await ownAlert.AnyAsync(ct)) throw new KeyNotFoundException();
            await ownAlert.Where(x => x.ReadAt == null)
                .ExecuteUpdateAsync(set => set.SetProperty(x => x.ReadAt, DateTime.UtcNow), ct);
            return Results.Ok(new { success = true });
        });
        return secured;
    }

    private static Task<bool> IsCentralReviewer(KidsfitDbContext db, long userId, CancellationToken ct) =>
        (from ur in db.UserRoles
         join role in db.Roles on ur.RoleId equals role.Id
         join membership in db.OrganizationMemberships on ur.UserId equals membership.UserId
         join org in db.Organizations on membership.OrganizationId equals org.Id
         where ur.UserId == userId && (role.Code == "ADMIN" || role.Code == "DIRECTOR")
               && membership.Status == "ACTIVE" && org.Status == "ACTIVE" && org.Code == "KIDSFIT"
         select ur.UserId).AnyAsync(ct);
}

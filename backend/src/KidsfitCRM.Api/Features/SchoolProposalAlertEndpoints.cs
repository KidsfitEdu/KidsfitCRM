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
            return Results.Ok(new
            {
                unread_count = items.Count(x => x.ReadAt is null),
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
            var updated = await db.SchoolProposalAlerts
                .Where(x => x.Id == id && x.RecipientUserId == http.UserId() && x.Status == "OPEN")
                .ExecuteUpdateAsync(set => set.SetProperty(x => x.ReadAt, x => x.ReadAt ?? DateTime.UtcNow), ct);
            if (updated == 0) throw new KeyNotFoundException();
            return Results.Ok(new { success = true });
        });
        return secured;
    }
}

using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>
/// Read-only, tenant-scoped school contact notes. Reuses CustomerActivity; no new table.
/// Uses server timestamps and logged-in actor recorded by ChannelSalesActions.AddActivity.
/// </summary>
public static class CustomerWorkLogEndpoints
{
    internal static async Task<IResult> List(long id, HttpContext http, KidsfitDbContext db,
        CancellationToken ct, int page = 1, int pageSize = 20, string? type = null)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var activeOrgIds = access.OrganizationIds;
        var canRead = access.All || await db.ApproachRegistrations.AnyAsync(r =>
            r.CustomerId == id && activeOrgIds.Contains(r.OwnerOrganizationId) &&
            (access.Organization || r.OwnerUserId == access.UserId), ct);
        if (!canRead || !await db.DirectorySchools.AnyAsync(s => s.CustomerId == id, ct))
            throw new KeyNotFoundException();

        page = Math.Clamp(page, 1, 100_000);
        pageSize = Math.Clamp(pageSize, 1, 50);
        var query = db.CustomerActivities.AsNoTracking().Where(a =>
            a.CustomerId == id && (a.ActivityType == "NOTE" || a.ActivityType == "CALL" ||
            a.ActivityType == "MEETING" || a.ActivityType == "ZALO" || a.ActivityType == "DEMO"));
        if (!access.All)
        {
            // Never leak notes created under another partner's school approach.
            query = query.Where(a => a.ApproachRegistrationId.HasValue &&
                db.ApproachRegistrations.Any(r =>
                    r.Id == a.ApproachRegistrationId && activeOrgIds.Contains(r.OwnerOrganizationId) &&
                    (access.Organization || r.OwnerUserId == access.UserId)));
        }

        var normalizedType = type?.Trim().ToUpperInvariant();
        if (!string.IsNullOrEmpty(normalizedType))
        {
            if (normalizedType is not ("NOTE" or "CALL" or "MEETING" or "ZALO" or "DEMO"))
                throw ApiValidationException.For("type", "Kênh liên hệ không hợp lệ.");
            query = query.Where(a => a.ActivityType == normalizedType);
        }

        var total = await query.CountAsync(ct);
        var data = await (from activity in query
            join user in db.Users.AsNoTracking() on activity.UserId equals user.Id
            orderby activity.CreatedAt descending, activity.Id descending
            select new { activity.Id, activity.ActivityType, activity.Content,
                activity.CreatedAt, activity.OccurredAt, activity.ContactName, activity.ContactPosition,
                activity.Feedback, activity.Commitment, user_name = user.Name })
            .Skip((page - 1) * pageSize).Take(pageSize).ToArrayAsync(ct);
        return Results.Ok(new { data, total, page, page_size = pageSize });
    }
}

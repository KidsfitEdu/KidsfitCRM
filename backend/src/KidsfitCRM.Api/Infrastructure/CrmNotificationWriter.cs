using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>
/// Append a CRM notice to the caller's existing transaction, never trigger remote delivery.
/// The caller must SaveChanges and commit its business mutation and notice together.
/// </summary>
public static class CrmNotificationWriter
{
    public static void Add(KidsfitDbContext db, long organizationId, long recipientUserId,
        string kind, string entityType, long entityId, string title, string message, string targetView, long occurrence = 0)
    {
        if (organizationId <= 0 || recipientUserId <= 0 || entityId <= 0) return;
        // Unique per event kind / business record / recipient, even on retried HTTP requests.
        var key = $"{entityType}:{entityId}:{kind}:{recipientUserId}:{occurrence}";
        if (key.Length > 180) throw new InvalidOperationException("CRM notice key exceeds schema limit.");
        if (db.CrmNotifications.Local.Any(x => x.DeduplicationKey == key)) return;
        var now = DateTime.UtcNow;
        db.CrmNotifications.Add(new CrmNotification {
            OrganizationId = organizationId, RecipientUserId = recipientUserId,
            Kind = kind, EntityType = entityType, EntityId = entityId,
            Title = title, Message = message, TargetView = targetView,
            DeduplicationKey = key, CreatedAt = now, UpdatedAt = now
        });
    }

    public static async Task<long?> RecipientOrganization(KidsfitDbContext db, long recipientId,
        long preferredOrganizationId, CancellationToken ct)
    {
        // A notice is visible only in an active membership of its recipient.
        // KIDSFIT officers may review work from several partner organizations but
        // must receive their own notification in the central KIDSFIT organization.
        return await (from m in db.OrganizationMemberships.AsNoTracking()
            join o in db.Organizations.AsNoTracking() on m.OrganizationId equals o.Id
            join u in db.Users.AsNoTracking() on m.UserId equals u.Id
            where m.UserId == recipientId && m.Status == "ACTIVE"
                && u.Status == "ACTIVE" && o.Status == "ACTIVE"
                && (o.Code == "KIDSFIT" || m.OrganizationId == preferredOrganizationId)
            orderby o.Code == "KIDSFIT" descending
            select (long?)m.OrganizationId).FirstOrDefaultAsync(ct);
    }

    public static async Task<long[]> OrganizationRecipients(KidsfitDbContext db, long orgId,
        string permission, CancellationToken ct)
    {
        return await (from m in db.OrganizationMemberships.AsNoTracking()
            join u in db.Users.AsNoTracking() on m.UserId equals u.Id
            join o in db.Organizations.AsNoTracking() on m.OrganizationId equals o.Id
            join ur in db.UserRoles.AsNoTracking() on u.Id equals ur.UserId
            join rp in db.PermissionRoles.AsNoTracking() on ur.RoleId equals rp.RoleId
            join p in db.Permissions.AsNoTracking() on rp.PermissionId equals p.Id
            where m.OrganizationId == orgId && m.Status == "ACTIVE" && u.Status == "ACTIVE"
                && o.Status == "ACTIVE" && p.Code == permission
            select u.Id).Distinct().ToArrayAsync(ct);
    }

    public static async Task<long[]> CentralReviewers(KidsfitDbContext db, string permission, CancellationToken ct)
    {
        // Only central KIDSFIT active users with an active KIDSFIT organization membership.
        // Never notify a similarly named role in a partner organization.
        return await (from m in db.OrganizationMemberships.AsNoTracking()
            join org in db.Organizations.AsNoTracking() on m.OrganizationId equals org.Id
            join user in db.Users.AsNoTracking() on m.UserId equals user.Id
            join ur in db.UserRoles.AsNoTracking() on user.Id equals ur.UserId
            join pr in db.PermissionRoles.AsNoTracking() on ur.RoleId equals pr.RoleId
            join p in db.Permissions.AsNoTracking() on pr.PermissionId equals p.Id
            where org.Code == "KIDSFIT" && org.Status == "ACTIVE"
                && m.Status == "ACTIVE" && user.Status == "ACTIVE" && p.Code == permission
            select user.Id).Distinct().ToArrayAsync(ct);
    }

    public static async Task<long?> CentralOrganization(KidsfitDbContext db, CancellationToken ct) =>
        await db.Organizations.AsNoTracking()
            .Where(x => x.Code == "KIDSFIT" && x.Status == "ACTIVE")
            .Select(x => (long?)x.Id).FirstOrDefaultAsync(ct);
}

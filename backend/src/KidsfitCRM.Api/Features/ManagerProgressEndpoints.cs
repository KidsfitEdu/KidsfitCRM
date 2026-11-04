using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>Organization-scoped school progress; never reuse the broader /workspace customer scope.</summary>
public static class ManagerProgressEndpoints
{
    public static void MapManagerProgress(this RouteGroupBuilder group)
    {
        group.MapGet("/manager/progress-schools", List)
            .RequireAuthorization(Permissions.ChannelSalesTeamManage);
    }

    internal static async Task<IResult> List(HttpContext http, KidsfitDbContext db,
        string? search, string? status, long? owner_user_id, int? page, int? page_size, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesTeamManage) || !access.Organization || access.OrganizationIds.Length == 0)
            return Results.Forbid();

        var term = (search ?? "").Trim();
        if (term.Length > 190) throw ApiValidationException.For("search", "Từ khóa tối đa 190 ký tự.");
        var state = (status ?? "ALL").Trim().ToUpperInvariant();
        if (state is not ("ALL" or "APPROACHING" or "CONTRACTED"))
            throw ApiValidationException.For("status", "Trạng thái theo dõi không hợp lệ.");
        var now = DateTime.UtcNow;
        // The manager sees only schools protected by Sales/CTV of their ACTIVE organizations.
        // Historical suspended members remain eligible for contract/progress history.
        var members = db.OrganizationMemberships.AsNoTracking().Where(m =>
            access.OrganizationIds.Contains(m.OrganizationId)
            && (m.MembershipType == "SALES" || m.MembershipType == "CHANNEL_SALES"
                || m.MembershipType == "COLLABORATOR" || m.MembershipType == "PARTNER_COLLABORATOR")
            && (m.Status == "ACTIVE" || m.Status == "SUSPENDED"));
        if (owner_user_id.HasValue && !await members.AnyAsync(m => m.UserId == owner_user_id.Value, ct))
            throw new KeyNotFoundException();

        var protections = db.CustomerProtections.AsNoTracking().Where(p =>
            p.Status == "ACTIVE" && p.EffectiveUntil > now
            && access.OrganizationIds.Contains(p.OwnerOrganizationId)
            && members.Any(m => m.UserId == p.OwnerUserId && m.OrganizationId == p.OwnerOrganizationId)
            && (!owner_user_id.HasValue || p.OwnerUserId == owner_user_id.Value));

        var schools = db.ChannelCustomers.AsNoTracking()
            .Where(c => db.DirectorySchools.Any(s => s.CustomerId == c.Id && !s.IsDeleted)
                && protections.Any(p => p.CustomerId == c.Id))
            .Where(c => term == "" || c.DisplayName.Contains(term) || c.Code.Contains(term)
                || db.DirectorySchools.Any(s => s.CustomerId == c.Id && s.SchoolCode.Contains(term)));
        if (state == "CONTRACTED")
            schools = schools.Where(c => protections.Any(p => p.CustomerId == c.Id && p.SourceType == "CONTRACT"));
        else if (state == "APPROACHING")
            schools = schools.Where(c => protections.Any(p => p.CustomerId == c.Id && p.SourceType == "APPROACH")
                && !protections.Any(p => p.CustomerId == c.Id && p.SourceType == "CONTRACT"));

        var total = await schools.CountAsync(ct);
        var pageNumber = Math.Clamp(page ?? 1, 1, 100000);
        var size = Math.Clamp(page_size ?? 20, 1, 100);
        var customers = await schools.OrderBy(c => c.DisplayName).ThenBy(c => c.Id)
            .Skip((pageNumber - 1) * size).Take(size)
            .Select(c => new { c.Id, c.Code, c.DisplayName }).ToArrayAsync(ct);
        var ids = customers.Select(c => c.Id).ToArray();
        var rights = await protections.Where(p => ids.Contains(p.CustomerId))
            .OrderByDescending(p => p.SourceType == "CONTRACT")
            .ThenByDescending(p => p.EffectiveUntil).ThenByDescending(p => p.Id)
            .Select(p => new { p.CustomerId, p.OwnerUserId, p.OwnerOrganizationId,
                p.SourceType, p.EffectiveUntil, p.ApproachRegistrationId }).ToArrayAsync(ct);
        var visibleRights = rights.GroupBy(r => r.CustomerId).ToDictionary(g => g.Key, g => g.First());
        var users = await db.Users.AsNoTracking().Where(u => rights.Select(r => r.OwnerUserId).Contains(u.Id))
            .Select(u => new { u.Id, u.Name }).ToDictionaryAsync(u => u.Id, u => u.Name, ct);
        var contracts = await db.SalesContracts.AsNoTracking()
            .Where(c => ids.Contains(c.CustomerId) && access.OrganizationIds.Contains(c.OwnerOrganizationId)
                && c.Status != "CANCELLED" && c.Status != "REJECTED"
                && members.Any(m => m.UserId == c.OwnerUserId && m.OrganizationId == c.OwnerOrganizationId))
            .OrderByDescending(c => c.CreatedAt).ThenByDescending(c => c.Id)
            .Select(c => new { c.Id, c.CustomerId, c.ContractCode, c.OwnerUserId, c.OwnerOrganizationId })
            .ToArrayAsync(ct);
        // CustomerActivity has no OrganizationId. Restrict displayed follow-up dates
        // to the actual protected owner selected for each school, not any member's activity.
        var ownerIds = visibleRights.Values.Select(x => x.OwnerUserId).Distinct().ToArray();
        var activityRows = await db.CustomerActivities.AsNoTracking()
            .Where(a => ids.Contains(a.CustomerId) && ownerIds.Contains(a.UserId)
                && a.NextFollowUpAt != null)
            .Select(a => new { a.CustomerId, a.UserId, a.NextFollowUpAt }).ToArrayAsync(ct);
        var activities = activityRows
            .Where(a => visibleRights.TryGetValue(a.CustomerId, out var right)
                && right.OwnerUserId == a.UserId)
            .GroupBy(a => a.CustomerId)
            .ToDictionary(g => g.Key, g => g.Max(a => a.NextFollowUpAt));

        var rows = customers.Select(customer =>
        {
            var protection = visibleRights[customer.Id];
            var contract = contracts.FirstOrDefault(c => c.CustomerId == customer.Id
                && c.OwnerOrganizationId == protection.OwnerOrganizationId
                && c.OwnerUserId == protection.OwnerUserId);
            return new
            {
                id = customer.Id, code = customer.Code, display_name = customer.DisplayName,
                owner_user_id = protection.OwnerUserId,
                owner_user_name = users.GetValueOrDefault(protection.OwnerUserId),
                visible_status = protection.SourceType == "CONTRACT" ? "CONTRACTED" : "APPROACHING",
                protected_until = (DateTime?)protection.EffectiveUntil,
                next_follow_up_at = activities.GetValueOrDefault(customer.Id),
                contract_code = contract?.ContractCode,
            };
        }).ToArray();
        var staff = await (from m in members join u in db.Users.AsNoTracking()
                on m.UserId equals u.Id
                select new { m.UserId, u.Name }).Distinct()
            .OrderBy(x => x.Name).ThenBy(x => x.UserId)
            .Select(x => new { id = x.UserId, name = x.Name }).ToArrayAsync(ct);
        return Results.Ok(new { data = rows, total, page = pageNumber, page_size = size, staff });
    }
}

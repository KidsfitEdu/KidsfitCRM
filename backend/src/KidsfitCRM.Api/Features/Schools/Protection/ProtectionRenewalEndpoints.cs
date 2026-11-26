using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>Read-only history of automatic five-year protection decisions, scoped to each role.</summary>
public static class ProtectionRenewalEndpoints
{
    public sealed record ReviewRequest(string? Reason);

    public static void Map(RouteGroupBuilder channel)
    {
        channel.MapGet("/protection-renewals", List).RequireAuthorization(Permissions.ChannelSalesView);
        channel.MapGet("/protection-renewals/eligible", Eligible).RequireAuthorization(Permissions.ChannelSalesView);
    }

    private static async Task<bool> IsKidsfitManager(KidsfitDbContext db, ChannelSalesAccess access, CancellationToken ct) =>
        access.Has(Permissions.ProtectionRenewalApprove)
        && await (from membership in db.OrganizationMemberships
                  join org in db.Organizations on membership.OrganizationId equals org.Id
                  where membership.UserId == access.UserId && membership.Status == "ACTIVE"
                     && org.Code == "KIDSFIT" && org.Status == "ACTIVE"
                  select membership.Id).AnyAsync(ct)
        && await (from roleUser in db.UserRoles
                  join role in db.Roles on roleUser.RoleId equals role.Id
                  where roleUser.UserId == access.UserId && role.Code == "SALES_MANAGER"
                  select role.Id).AnyAsync(ct);

    public static async Task<IResult> Eligible(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var now = DateTime.UtcNow;
        var contracts = await db.SalesContracts.AsNoTracking()
            .Where(c => c.OwnerUserId == access.UserId && c.Status == "ACTIVE"
                && c.VerifiedAt != null && access.OrganizationIds.Contains(c.OwnerOrganizationId)
                && !db.ContractCancellations.Any(x => x.ContractId == c.Id))
            .OrderByDescending(c => c.CreatedAt).Take(200).ToArrayAsync(ct);
        var data = new List<object>();
        foreach (var contract in contracts)
        {
            var protectedUntil = await db.CustomerProtections.AsNoTracking()
                .Where(p => p.ContractId == contract.Id && p.SourceType == "CONTRACT"
                    && p.OwnerUserId == access.UserId && p.Status == "ACTIVE")
                .OrderByDescending(p => p.EffectiveUntil)
                .Select(p => (DateTime?)p.EffectiveUntil).FirstOrDefaultAsync(ct);
            if (!protectedUntil.HasValue || !ProtectionRenewalPolicy.EligibleWindow(now, protectedUntil.Value))
                continue;
            var item = await db.ProtectionRenewalCases.AsNoTracking()
                .Where(x => x.ContractId == contract.Id && x.PreviousProtectionUntil == protectedUntil.Value)
                .OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync(ct);
            var confirmed = await ProtectionRenewalPolicy.HasConfirmedContinuationAsync(db,
                contract, protectedUntil.Value, now, ct);
            var name = await db.ChannelCustomers.Where(x => x.Id == contract.CustomerId)
                .Select(x => x.DisplayName).SingleAsync(ct);
            data.Add(new { contract_id = contract.Id, contract_code = contract.ContractCode,
                customer_name = name, protected_until = protectedUntil.Value,
                priority_until = ProtectionRenewalPolicy.PriorityEnds(protectedUntil.Value),
                renewal_confirmed = confirmed, request_id = item?.Id, request_status = item?.Status,
                can_request_review = false });
        }
        return Results.Ok(new { data });
    }

    public static async Task<IResult> List(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var manager = await IsKidsfitManager(db, access, ct);
        var director = access.Has(Permissions.ChannelSalesAllScope)
            && await (from ur in db.UserRoles join r in db.Roles on ur.RoleId equals r.Id
                where ur.UserId == access.UserId && r.Code == "DIRECTOR" select r.Id).AnyAsync(ct);
        var cases = db.ProtectionRenewalCases.AsNoTracking();
        if (!manager && !director)
            cases = cases.Where(x => x.OwnerUserId == access.UserId ||
                (access.Has(Permissions.ChannelSalesManage) && access.OrganizationIds.Contains(x.OwnerOrganizationId)
                    && db.OrganizationMemberships.Any(m => m.UserId == x.OwnerUserId
                        && m.OrganizationId == x.OwnerOrganizationId
                        && m.ManagerUserId == access.UserId && m.Status == "ACTIVE")));
        var data = await (from item in cases
            join contract in db.SalesContracts on item.ContractId equals contract.Id
            join customer in db.ChannelCustomers on item.CustomerId equals customer.Id
            join owner in db.Users on item.OwnerUserId equals owner.Id
            join organization in db.Organizations on item.OwnerOrganizationId equals organization.Id
            orderby item.UpdatedAt descending
            select new
            {
                item.Id, item.ContractId, item.CustomerId, customer_name = customer.DisplayName,
                contract.ContractCode, item.OwnerUserId, owner_name = owner.Name,
                item.OwnerOrganizationId, organization_name = organization.Name, item.Status, item.Source, item.Note,
                item.PreviousProtectionUntil, item.PriorityUntil,
                item.DecisionReason, item.ReviewedAt, item.NewProtectionFrom, item.NewProtectionUntil,
                can_approve = false
            }).Take(200).ToArrayAsync(ct);
        return Results.Ok(new { data, can_approve = false });
    }

}

using System.Globalization;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>Read-only, account-scoped Sales/CTV insights. Does not return organization-wide or Board totals.</summary>
public static class SalesDashboardReportEndpoints
{
    public static void Map(RouteGroupBuilder channel) =>
        channel.MapGet("/dashboard/report", Report)
            .RequireAuthorization(Permissions.ChannelSalesView);

    /// <summary>First day of a Vietnam calendar month expressed as a UTC instant; end is exclusive.</summary>
    public static (DateTime Start, DateTime End) MonthBounds(string period)
    {
        var month = DateTime.ParseExact(period + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture);
        return (DateTime.SpecifyKind(month.AddHours(-7), DateTimeKind.Utc),
            DateTime.SpecifyKind(month.AddMonths(1).AddHours(-7), DateTimeKind.Utc));
    }

    private static async Task<IResult> Report(HttpContext http, KidsfitDbContext db,
        string? period, CancellationToken ct)
    {
        var actor = http.UserId();
        var access = await ChannelSalesAccess.Load(db, actor, ct);
        if (!access.Has(Permissions.ChannelSalesView)) return Results.Forbid();

        var selected = ChannelSalesValidation.Period(period ?? ChannelSalesValidation.BusinessPeriod(DateTime.UtcNow));
        var now = DateTime.UtcNow;
        // Force ownership AND active organization membership even for users with expanded organizational permissions.
        var registrations = db.ApproachRegistrations.AsNoTracking()
            .Where(r => r.OwnerUserId == actor && access.OrganizationIds.Contains(r.OwnerOrganizationId));
        var contracts = db.SalesContracts.AsNoTracking()
            .Where(c => c.OwnerUserId == actor && access.OrganizationIds.Contains(c.OwnerOrganizationId));

        var protectedCustomers = db.CustomerProtections.AsNoTracking()
            .Where(p => p.OwnerUserId == actor && access.OrganizationIds.Contains(p.OwnerOrganizationId)
                && p.Status == "ACTIVE" && p.EffectiveFrom <= now && p.EffectiveUntil > now);
        // A school under contract protection must not also count as an active approach.
        var contractCustomers = protectedCustomers.Where(p => p.SourceType == "CONTRACT")
            .Select(p => p.CustomerId).Distinct();
        var approachingCustomers = protectedCustomers.Where(p => p.SourceType == "APPROACH"
                && !contractCustomers.Contains(p.CustomerId)).Select(p => p.CustomerId).Distinct();
        var activeApproaches = await approachingCustomers.CountAsync(ct);
        var contractProtected = await contractCustomers.CountAsync(ct);
        var expiringSoon = await protectedCustomers.Where(p => p.SourceType == "APPROACH"
                && p.EffectiveUntil <= now.AddHours(24) && !contractCustomers.Contains(p.CustomerId))
            .Select(p => p.CustomerId).Distinct().CountAsync(ct);

        var pendingInvitations = await db.SchoolInvitations.AsNoTracking().CountAsync(x =>
            x.AssigneeUserId == actor && access.OrganizationIds.Contains(x.OrganizationId)
            && x.Status == "PENDING" && x.RespondBy > now, ct);
        var pendingProposals = await db.SchoolProposals.AsNoTracking().CountAsync(x =>
            x.SubmittedByUserId == actor && access.OrganizationIds.Contains(x.OrganizationId)
            && !x.IsDeleted && (x.Status == "PENDING_MANAGER" || x.Status == "PENDING_ADMIN"), ct);
        var contractsNeedingRevision = await contracts.CountAsync(c => c.Status == "NEEDS_REVISION", ct);

        var (start, end) = MonthBounds(selected);
        var signedStart = DateOnly.FromDateTime(start.AddHours(7));
        var signedEnd = signedStart.AddMonths(1);
        var signedInPeriod = await contracts.CountAsync(c => c.SignedOn >= signedStart && c.SignedOn < signedEnd, ct);
        var trend = new List<object>(6);
        for (var offset = 5; offset >= 0; offset--)
        {
            var localMonth = signedStart.ToDateTime(TimeOnly.MinValue).AddMonths(-offset);
            var p = localMonth.ToString("yyyy-MM", CultureInfo.InvariantCulture);
            var (from, until) = MonthBounds(p);
            var fromDay = DateOnly.FromDateTime(localMonth);
            var untilDay = fromDay.AddMonths(1);
            trend.Add(new
            {
                period = p,
                registrations = await registrations.CountAsync(r => r.RegisteredAt >= from && r.RegisteredAt < until, ct),
                contracts_signed = await contracts.CountAsync(c => c.SignedOn >= fromDay && c.SignedOn < untilDay, ct)
            });
        }

        return Results.Ok(new
        {
            period = selected,
            server_time = now,
            // These are current-state snapshots; the period picker only affects signed KPI and activity trend.
            active_approaches = activeApproaches,
            expiring_soon = expiringSoon,
            pending_invitations = pendingInvitations,
            pending_proposals = pendingProposals,
            contracts_needs_revision = contractsNeedingRevision,
            contracts_signed_period = signedInPeriod,
            protection_breakdown = new { approaching = activeApproaches, contracted = contractProtected },
            activity_trend = trend
        });
    }
}

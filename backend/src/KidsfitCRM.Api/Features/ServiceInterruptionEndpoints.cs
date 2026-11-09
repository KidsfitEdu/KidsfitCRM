using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>Read-only, server-scoped GI-01 views for Sales, Manager, CSKH and Director.</summary>
public static class ServiceInterruptionEndpoints
{
    public static void Map(RouteGroupBuilder channel)
    {
        channel.MapGet("/service-interruptions", List)
            .RequireAuthorization(Permissions.ChannelSalesView);
        channel.MapGet("/service-interruptions/{customerId:long}", Detail)
            .RequireAuthorization(Permissions.ChannelSalesView);
    }

    public static async Task<IResult> List(HttpContext http, KidsfitDbContext db,
        IConfiguration configuration, string? search, string? status, int? page, int? pageSize, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var today = ContractExpiryAlertService.BusinessDate(DateTime.UtcNow);
        var now = DateTime.UtcNow;
        var allowedContracts = access.Contracts(db).AsNoTracking().Where(c =>
            c.RequiresSchoolVerification && c.VerifiedAt != null && c.Status == "ACTIVE");
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            allowedContracts = allowedContracts.Where(c =>
                c.ContractCode.Contains(term) || db.ChannelCustomers.Any(x =>
                    x.Id == c.CustomerId && x.DisplayName.Contains(term)));
        }
        var ids = await allowedContracts.Select(c => c.CustomerId)
            .Distinct().OrderBy(id => id).Take(1000).ToArrayAsync(ct);
        var rows = new List<object>();
        foreach (var id in ids)
        {
            var snapshot = await ServiceInterruptionService.AssessAsync(db, id, today, now, ct,
                configuration.GetValue<int>("GI01:AccountingExceptionHours"));
            if (snapshot is null) continue;
            // The newest owner/contract may belong to another organization.
            // Do not expose its audit or contract ID through an older scoped contract.
            if (!await access.Contracts(db).AnyAsync(x => x.Id == snapshot.ContractId, ct))
                continue;
            if (snapshot.Status == "CONTINUOUS") continue;
            if (!string.IsNullOrWhiteSpace(status) &&
                !snapshot.Status.Equals(status.Trim(), StringComparison.OrdinalIgnoreCase)) continue;
            var customerName = await db.ChannelCustomers.AsNoTracking()
                .Where(c => c.Id == id).Select(c => c.DisplayName).SingleAsync(ct);
            // Only expose owner identity when the authorized contract is visible to the caller.
            var visibleOwner = await access.Contracts(db)
                .Where(c => c.Id == snapshot.ContractId).AnyAsync(ct);
            rows.Add(new
            {
                customer_id = id, customer_name = customerName,
                contract_id = snapshot.ContractId,
                owner_user_id = visibleOwner ? (long?)snapshot.OwnerUserId : null,
                owner_organization_id = visibleOwner ? (long?)snapshot.OwnerOrganizationId : null,
                gap_start_on = snapshot.Assessment.GapStartOn,
                threshold_on = snapshot.Assessment.ThresholdOn,
                next_service_start_on = snapshot.Assessment.NextServiceStartOn,
                protection_until = snapshot.ProtectionUntil,
                status = snapshot.Status, has_pending_renewal = snapshot.HasPendingRenewal,
                has_open_dispute = snapshot.HasOpenDispute,
                // Event details are separate and only available for authorized customers.
            });
        }
        var currentPage = Math.Max(1, page ?? 1);
        var size = Math.Clamp(pageSize ?? 20, 1, 100);
        return Results.Ok(new
        {
            data = rows.Skip((currentPage - 1) * size).Take(size).ToArray(),
            total = rows.Count, page = currentPage, page_size = size
        });
    }

    public static async Task<IResult> Detail(long customerId, HttpContext http,
        KidsfitDbContext db, IConfiguration configuration, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!await access.Contracts(db).AnyAsync(c => c.CustomerId == customerId, ct))
            throw new KeyNotFoundException();
        var snapshot = await ServiceInterruptionService.AssessAsync(db, customerId,
            ContractExpiryAlertService.BusinessDate(DateTime.UtcNow), DateTime.UtcNow, ct,
            configuration.GetValue<int>("GI01:AccountingExceptionHours"))
            ?? throw new KeyNotFoundException();
        var scopedContractIds = await access.Contracts(db)
            .Where(c => c.CustomerId == customerId).Select(c => c.Id).ToArrayAsync(ct);
        var events = await db.ServiceInterruptionEvents.AsNoTracking()
            .Where(e => e.CustomerId == customerId && scopedContractIds.Contains(e.ContractId))
            .OrderByDescending(e => e.ProcessedAt).Take(100)
            .Select(e => new { e.Id, e.GapStartOn, e.ThresholdOn, e.Status, e.Reason, e.ProcessedAt })
            .ToArrayAsync(ct);
        return Results.Ok(new { data = new { snapshot.CustomerId,
            snapshot.ContractId, snapshot.Assessment.GapStartOn,
            snapshot.Assessment.ThresholdOn, snapshot.Assessment.NextServiceStartOn,
            snapshot.Status, snapshot.HasPendingRenewal, snapshot.HasOpenDispute,
            snapshot.ProtectionUntil, history = events } });
    }
}

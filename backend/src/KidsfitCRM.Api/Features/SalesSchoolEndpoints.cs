using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>Server-paginated schools owned by the signed-in salesperson.</summary>
public static class SalesSchoolEndpoints
{
    public static async Task<IResult> Mine(HttpContext http, KidsfitDbContext db, CancellationToken ct,
        int page = 1, int pageSize = 20, string? search = null, string? status = null)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesView)) return Results.Forbid();
        var actor = http.UserId();
        var now = DateTime.UtcNow;
        page = Math.Clamp(page, 1, 100000);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var activeApproachIds = db.ApproachRegistrations.AsNoTracking()
            .Where(r => r.OwnerUserId == actor && r.Status == "ACTIVE" && r.ProtectedUntil > now)
            .Select(r => r.CustomerId);
        var activeContractIds = db.SalesContracts.AsNoTracking()
            .Where(c => c.OwnerUserId == actor && c.Status != "CANCELLED")
            .Select(c => c.CustomerId);
        var verifiedContractIds = db.SalesContracts.AsNoTracking()
            .Where(c => c.OwnerUserId == actor && c.Status == "ACTIVE")
            .Select(c => c.CustomerId);
        var query = access.Customers(db).AsNoTracking().Where(c =>
            activeApproachIds.Contains(c.Id) || activeContractIds.Contains(c.Id));

        if (!string.IsNullOrWhiteSpace(search)) {
            var text = search.Trim();
            query = query.Where(c => c.DisplayName.Contains(text) || c.Code.Contains(text));
        }
        switch (status?.Trim().ToUpperInvariant()) {
            case "APPROACHING": query = query.Where(c => !verifiedContractIds.Contains(c.Id)); break;
            case "CONTRACTED": query = query.Where(c => verifiedContractIds.Contains(c.Id)); break;
            case null or "" or "ALL": break;
            default: throw ApiValidationException.For("status", "Trạng thái trường không hợp lệ.");
        }

        var total = await query.CountAsync(ct);
        var customers = await query.OrderBy(c => c.DisplayName).ThenBy(c => c.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToArrayAsync(ct);
        var ids = customers.Select(c => c.Id).ToArray();
        var registrations = await db.ApproachRegistrations.AsNoTracking()
            .Where(r => ids.Contains(r.CustomerId) && r.OwnerUserId == actor && r.Status == "ACTIVE" && r.ProtectedUntil > now)
            .OrderByDescending(r => r.RegisteredAt).ToArrayAsync(ct);
        var contracts = await db.SalesContracts.AsNoTracking()
            .Where(c => ids.Contains(c.CustomerId) && c.OwnerUserId == actor && c.Status == "ACTIVE")
            .OrderByDescending(c => c.SignedOn).ToArrayAsync(ct);
        var protections = await db.CustomerProtections.AsNoTracking()
            .Where(p => ids.Contains(p.CustomerId) && p.OwnerUserId == actor && p.Status == "ACTIVE" && p.EffectiveUntil > now)
            .ToArrayAsync(ct);
        var contractIds = contracts.Select(x => x.Id).ToArray();
        var receipts = await db.RevenueReceipts.AsNoTracking()
            .Where(x => contractIds.Contains(x.ContractId) && x.Status == "COMPLETED")
            .GroupBy(x => x.ContractId).Select(g => new { Id = g.Key, Sum = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.Id, x => x.Sum, ct);
        var commissions = await db.CommissionLedgerEntries.AsNoTracking()
            .Where(x => contractIds.Contains(x.ContractId) && x.BeneficiaryUserId == actor)
            .GroupBy(x => x.ContractId).Select(g => new { Id = g.Key, Sum = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.Id, x => x.Sum, ct);
        var recon = await db.ReconciliationCases.AsNoTracking()
            .Where(x => contractIds.Contains(x.ContractId))
            .ToDictionaryAsync(x => x.ContractId, x => x.Status, ct);
        var mainUnits = await (from school in db.DirectorySchools.AsNoTracking()
            join unit in db.SchoolUnits.AsNoTracking() on school.Id equals unit.DirectorySchoolId
            where ids.Contains(school.CustomerId) && unit.UnitType == "MAIN"
            select new { school.CustomerId, unit.Address, unit.Ward, unit.Province })
            .ToArrayAsync(ct);
        var pendingExtensionRegistrationIds = await db.SchoolExtensionRequests.AsNoTracking()
            .Where(x => x.Status == "PENDING" && x.RequestedByUserId == actor)
            .Select(x => x.ApproachRegistrationId).ToArrayAsync(ct);
        var ownerName = await db.Users.AsNoTracking().Where(x => x.Id == actor).Select(x => x.Name).SingleAsync(ct);
        var canViewMoney = access.Has(Permissions.ChannelSalesCommissionView);
        var canRecordRevenue = access.Has(Permissions.ChannelSalesRecordRevenue);
        var rows = customers.Select(c => {
            var reg = registrations.FirstOrDefault(x => x.CustomerId == c.Id);
            var contract = contracts.FirstOrDefault(x => x.CustomerId == c.Id);
            var protection = protections.Where(x => x.CustomerId == c.Id)
                .OrderByDescending(x => x.SourceType == "CONTRACT").FirstOrDefault();
            var contracted = contract?.Status == "ACTIVE";
            var mainUnit = mainUnits.FirstOrDefault(x => x.CustomerId == c.Id);
            var address = mainUnit is null ? null : !string.IsNullOrWhiteSpace(mainUnit.Address)
                ? mainUnit.Address
                : string.Join(", ", new[] { mainUnit.Ward, mainUnit.Province }.Where(x => !string.IsNullOrWhiteSpace(x)));
            var canRequestExtension = reg is not null && !contracted &&
                access.Has(Permissions.ChannelSalesRegister) &&
                !pendingExtensionRegistrationIds.Contains(reg.Id);
            return new ChannelCustomerListItem(
                c.Id, c.Code, c.DisplayName, c.CustomerType, c.TaxCode, c.Phone,
                c.Email, c.ContactName, c.Source, contracted ? "CONTRACTED" : "APPROACHING",
                c.LifecycleStatus, reg?.Id, reg?.Status, ownerName,
                protection?.EffectiveUntil ?? reg?.ProtectedUntil, null,
                contract?.Id, contract?.ContractCode,
                contract != null && canViewMoney ? contract.TotalValue : 0,
                contract != null && canViewMoney ? receipts.GetValueOrDefault(contract.Id) : 0,
                contract != null && canViewMoney ? commissions.GetValueOrDefault(contract.Id) : 0,
                contract != null ? recon.GetValueOrDefault(contract.Id) : null,
                reg != null, canRecordRevenue && contracted, address, canRequestExtension);
        });
        return Results.Ok(new { data = rows, total, page, page_size = pageSize });
    }
}

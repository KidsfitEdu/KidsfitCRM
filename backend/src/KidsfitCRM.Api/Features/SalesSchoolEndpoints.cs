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
        var registrationIds = registrations.Select(r => r.Id).ToArray();
        var extensionRequests = await db.SchoolExtensionRequests.AsNoTracking()
            .Where(x => x.RequestedByUserId == actor && registrationIds.Contains(x.ApproachRegistrationId))
            .Select(x => new { x.ApproachRegistrationId, x.Status }).ToArrayAsync(ct);
        var organizationIds = registrations.Select(x => x.OwnerOrganizationId).Distinct().ToArray();
        var policies = await db.SchoolWorkflowPolicies.AsNoTracking()
            .Where(x => organizationIds.Contains(x.OrganizationId) && x.Status == "ACTIVE")
            .OrderByDescending(x => x.Version)
            .Select(x => new { x.OrganizationId, x.MaxExtensionCount, x.MaxExtensionDays, x.MaxTotalExtensionDays }).ToArrayAsync(ct);
        var managerIds = await db.OrganizationMemberships.AsNoTracking()
            .Where(x => x.UserId == actor && organizationIds.Contains(x.OrganizationId) && x.Status == "ACTIVE")
            .Select(x => new { x.OrganizationId, x.ManagerUserId }).ToArrayAsync(ct);
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
            var requests = extensionRequests.Where(x => reg is not null && x.ApproachRegistrationId == reg.Id).ToArray();
            var extensionPending = requests.Any(x => x.Status == "PENDING");
            var approvedCount = requests.Count(x => x.Status == "APPROVED");
            var policy = reg is null ? null : policies.FirstOrDefault(x => x.OrganizationId == reg.OwnerOrganizationId);
            var manager = reg is null ? null : managerIds.FirstOrDefault(x => x.OrganizationId == reg.OwnerOrganizationId);
            var canRequestExtension = reg is not null && !contracted &&
                access.Has(Permissions.ChannelSalesRegister) && !extensionPending &&
                policy is not null && approvedCount < policy.MaxExtensionCount;
            var unavailableReason = reg is null ? "Không có lượt tiếp cận còn hiệu lực."
                : contracted ? "Trường đã có hợp đồng, không cần gia hạn tiếp cận."
                : extensionPending ? "Yêu cầu gia hạn đang chờ Quản lý bán hàng duyệt."
                : !access.Has(Permissions.ChannelSalesRegister) ? "Tài khoản chưa có quyền xin gia hạn."
                : manager?.ManagerUserId is null ? "Chưa có Quản lý bán hàng trực tiếp."
                : policy is null ? "Admin chưa kích hoạt chính sách gia hạn."
                : approvedCount >= policy.MaxExtensionCount ? "Đã đạt số lần gia hạn tối đa theo chính sách."
                : null;
            canRequestExtension = canRequestExtension && manager?.ManagerUserId is not null;
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
                reg != null, canRecordRevenue && contracted, address, canRequestExtension, extensionPending,
                approvedCount, policy?.MaxExtensionCount, unavailableReason);
        });
        return Results.Ok(new { data = rows, total, page, page_size = pageSize });
    }
}

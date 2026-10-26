using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed record ChannelCustomerListItem(
    long Id,
    string Code,
    string DisplayName,
    string CustomerType,
    string? TaxCode,
    string? Phone,
    string? Email,
    string? ContactName,
    string? Source,
    string VisibleStatus,
    string LifecycleStatus,
    long? ApproachRegistrationId,
    string? RegistrationStatus,
    string? OwnerUserName,
    DateTime? ProtectedUntil,
    DateTime? NextFollowUpAt,
    long? ContractId,
    string? ContractCode,
    decimal ContractValue,
    decimal CollectedRevenue,
    decimal CommissionAccrued,
    string? ReconciliationStatus,
    bool CanManageApproach,
    bool CanRecordRevenue);

public static class ChannelSalesEndpoints
{
    public static RouteGroupBuilder MapChannelSalesApi(this RouteGroupBuilder secured)
    {
        var channel = secured.MapGroup("/channel-sales");
        channel.MapGet("/workspace", Workspace).RequireAuthorization(Permissions.ChannelSalesView);
        channel.MapGet("/customers/search", Workspace).RequireAuthorization(Permissions.ChannelSalesView);
        channel.MapPost("/approach-registrations", async (RegisterApproachRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken cancellationToken) =>
        {
            var id = await actions.RegisterCustomerApproach(request, http.UserId(), http, cancellationToken);
            return Results.Created($"/api/channel-sales/approach-registrations/{id}", new { data = new { id } });
        }).RequireAuthorization(Permissions.ChannelSalesRegister);
        channel.MapPost("/approach-registrations/{id:long}/activities", async (long id, AddCustomerActivityRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken cancellationToken) =>
        {
            var activityId = await actions.AddActivity(id, request, http.UserId(), http, cancellationToken);
            return Results.Created($"/api/channel-sales/approach-registrations/{id}/activities/{activityId}", new { data = new { id = activityId } });
        }).RequireAuthorization(Permissions.ChannelSalesActivity);
        channel.MapPost("/approach-registrations/{id:long}/report-contract", async (long id, ReportSalesContractRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken cancellationToken) =>
        {
            var contractId = await actions.ReportSignedContract(id, request, http.UserId(), http, cancellationToken);
            return Results.Created($"/api/channel-sales/contracts/{contractId}", new { data = new { id = contractId } });
        }).RequireAuthorization(Permissions.ChannelSalesReportContract);
        channel.MapPost("/contracts/{id:long}/revenue-receipts", async (long id, RecordRevenueReceiptRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken cancellationToken) =>
        {
            var receiptId = await actions.RecordRevenueReceipt(id, request, http.UserId(), http, cancellationToken);
            return Results.Created($"/api/channel-sales/contracts/{id}/revenue-receipts/{receiptId}", new { data = new { id = receiptId } });
        }).RequireAuthorization(Permissions.ChannelSalesRecordRevenue);
        channel.MapPost("/reconciliation-cases/{id:long}/confirm", async (long id, ReconcileContractRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken cancellationToken) =>
        {
            await actions.Reconcile(id, true, request, http.UserId(), http, cancellationToken);
            return Results.Ok(new { message = "Đã xác nhận quyền bảo vệ khách hàng." });
        }).RequireAuthorization(Permissions.ChannelSalesReconcile);
        channel.MapPost("/reconciliation-cases/{id:long}/dispute", async (long id, ReconcileContractRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken cancellationToken) =>
        {
            await actions.Reconcile(id, false, request, http.UserId(), http, cancellationToken);
            return Results.Ok(new { message = "Đã mở tranh chấp đối soát." });
        }).RequireAuthorization(Permissions.ChannelSalesReconcile);
        channel.MapGet("/commissions/me", MyCommissions).RequireAuthorization(Permissions.ChannelSalesCommissionView);
        channel.MapChannelSalesOperations();
        channel.MapSchoolDirectory();
        return secured;
    }

    private static async Task<IResult> Workspace(HttpContext http, KidsfitDbContext db, string? search, string? status, CancellationToken cancellationToken)
    {
        var actorId = http.UserId();
        var now = DateTime.UtcNow;
        var access = await ChannelSalesAccess.Load(db, actorId, cancellationToken);
        var allScope = access.All;
        var organizationIds = access.OrganizationIds;
        var reconciliationScopeCustomerIds = access.Has(Permissions.ChannelSalesReconcile)
            ? await db.ReconciliationCases.Where(x => organizationIds.Contains(x.CheckeeOrganizationId)).Select(x => x.CustomerId).ToArrayAsync(cancellationToken)
            : [];
        var workflowScopeCustomerIds = await db.ApproachRegistrations
            .Where(x => organizationIds.Contains(x.OwnerOrganizationId) && (access.Organization || x.OwnerUserId == actorId))
            .Select(x => x.CustomerId)
            .Union(access.Contracts(db).Select(x => x.CustomerId))
            .Distinct()
            .ToArrayAsync(cancellationToken);
        var hasOrganizationScope = access.Organization;
        var canSeeRevenue = access.Has(Permissions.ChannelSalesRecordRevenue) || access.Has(Permissions.ChannelSalesCommissionView);
        var canSeeCommission = access.Has(Permissions.ChannelSalesCommissionView);

        var customerQuery = access.Customers(db).AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            var digits = Validation.Digits(term);
            customerQuery = customerQuery.Where(x => x.DisplayName.Contains(term) || x.Code.Contains(term)
                || (x.TaxCode != null && x.TaxCode.Contains(term))
                || (digits != "" && x.PhoneNormalized != null && x.PhoneNormalized.Contains(digits)));
        }
        var customers = await customerQuery.OrderByDescending(x => x.UpdatedAt).Take(100).ToListAsync(cancellationToken);
        var customerIds = customers.Select(x => x.Id).ToArray();
        var registrations = await db.ApproachRegistrations.AsNoTracking()
            .Where(x => customerIds.Contains(x.CustomerId))
            .OrderByDescending(x => x.RegisteredAt)
            .ToListAsync(cancellationToken);
        var protections = await db.CustomerProtections.AsNoTracking()
            .Where(x => customerIds.Contains(x.CustomerId) && x.Status == "ACTIVE" && x.EffectiveUntil > now)
            .OrderByDescending(x => x.SourceType == "CONTRACT")
            .ThenByDescending(x => x.EffectiveUntil)
            .ToListAsync(cancellationToken);
        var scopedContractIds = access.Contracts(db).Select(x => x.Id);
        var contracts = await db.SalesContracts.AsNoTracking()
            .Where(x => customerIds.Contains(x.CustomerId) && x.Status == "ACTIVE")
            .Where(x => scopedContractIds.Contains(x.Id) || reconciliationScopeCustomerIds.Contains(x.CustomerId))
            .OrderByDescending(x => x.SignedOn)
            .ToListAsync(cancellationToken);
        var contractIds = contracts.Select(x => x.Id).ToArray();
        var receipts = await db.RevenueReceipts.AsNoTracking()
            .Where(x => contractIds.Contains(x.ContractId) && x.Status == "COMPLETED")
            .GroupBy(x => x.ContractId)
            .Select(x => new { ContractId = x.Key, Total = x.Sum(row => row.Amount) })
            .ToDictionaryAsync(x => x.ContractId, x => x.Total, cancellationToken);
        var commissions = await access.Commissions(db).AsNoTracking()
            .Where(x => contractIds.Contains(x.ContractId))
            .GroupBy(x => x.ContractId)
            .Select(x => new { ContractId = x.Key, Total = x.Sum(row => row.Amount) })
            .ToDictionaryAsync(x => x.ContractId, x => x.Total, cancellationToken);
        var refunds = await db.RevenueRefunds.AsNoTracking().Where(x => contractIds.Contains(x.ContractId)).GroupBy(x => x.ContractId)
            .Select(x => new { ContractId = x.Key, Total = x.Sum(row => row.Amount) }).ToDictionaryAsync(x => x.ContractId, x => x.Total, cancellationToken);
        var reconciliations = await db.ReconciliationCases.AsNoTracking()
            .Where(x => contractIds.Contains(x.ContractId))
            .ToDictionaryAsync(x => x.ContractId, cancellationToken);
        var ownerIds = protections.Select(x => x.OwnerUserId).Distinct().ToArray();
        var owners = await db.Users.AsNoTracking().Where(x => ownerIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);
        var followUps = await db.CustomerActivities.AsNoTracking()
            .Where(x => customerIds.Contains(x.CustomerId) && x.NextFollowUpAt != null)
            .GroupBy(x => x.CustomerId)
            .Select(x => new { CustomerId = x.Key, Next = x.Max(row => row.NextFollowUpAt) })
            .ToDictionaryAsync(x => x.CustomerId, x => x.Next, cancellationToken);

        var data = customers.Select(customer =>
        {
            var protection = protections.FirstOrDefault(x => x.CustomerId == customer.Id);
            var visibleStatus = ChannelCustomerStatusPolicy.Calculate(protection?.SourceType == "CONTRACT", protection?.SourceType == "APPROACH");
            var registration = registrations.FirstOrDefault(x => x.CustomerId == customer.Id);
            var contract = contracts.FirstOrDefault(x => x.CustomerId == customer.Id);
            var organizationOwned = organizationIds.Contains(customer.OrganizationId) || workflowScopeCustomerIds.Contains(customer.Id);
            var reconciliationOnly = !organizationOwned && reconciliationScopeCustomerIds.Contains(customer.Id);
            var canManageApproach = registration is not null && registration.Status == "ACTIVE" && registration.ProtectedUntil > now
                && (registration.OwnerUserId == actorId || allScope
                || (hasOrganizationScope && organizationIds.Contains(registration.OwnerOrganizationId)));
            var canRecordCustomerRevenue = access.Has(Permissions.ChannelSalesRecordRevenue) && contract is not null && (allScope
                || (hasOrganizationScope && organizationIds.Contains(contract.OwnerOrganizationId)));
            return new ChannelCustomerListItem(
                customer.Id, customer.Code, customer.DisplayName, customer.CustomerType, customer.TaxCode, reconciliationOnly ? null : customer.Phone,
                reconciliationOnly ? null : customer.Email, reconciliationOnly ? null : customer.ContactName, reconciliationOnly ? null : customer.Source, visibleStatus, customer.LifecycleStatus,
                canManageApproach ? registration?.Id : null, registration?.Status, protection is null ? null : owners.GetValueOrDefault(protection.OwnerUserId),
                protection?.EffectiveUntil, reconciliationOnly ? null : followUps.GetValueOrDefault(customer.Id), contract?.Id, contract?.ContractCode,
                contract is null || (!canSeeRevenue && !access.Has(Permissions.ChannelSalesReconcile)) ? 0 : contract.TotalValue, !canSeeRevenue || contract is null ? 0 : receipts.GetValueOrDefault(contract.Id) - refunds.GetValueOrDefault(contract.Id),
                !canSeeCommission || contract is null ? 0 : commissions.GetValueOrDefault(contract.Id),
                contract is null ? null : reconciliations.GetValueOrDefault(contract.Id)?.Status,
                canManageApproach, canRecordCustomerRevenue);
        }).Where(x => string.IsNullOrWhiteSpace(status) || x.VisibleStatus == status.ToUpperInvariant()).ToArray();

        var visibleContractIds = data.Where(x => x.ContractId.HasValue).Select(x => x.ContractId!.Value).ToArray();
        var metrics = new
        {
            available = data.Count(x => x.VisibleStatus == "AVAILABLE"),
            approaching = data.Count(x => x.VisibleStatus == "APPROACHING"),
            contracted = data.Count(x => x.VisibleStatus == "CONTRACTED"),
            expiring_soon = data.Count(x => x.VisibleStatus == "APPROACHING" && x.ProtectedUntil <= now.AddHours(24)),
            contract_value = data.Sum(x => x.ContractValue),
            collected_revenue = data.Sum(x => x.CollectedRevenue),
            commission_accrued = data.Sum(x => x.CommissionAccrued),
        };
        var packages = await db.CheckeeProductPackages.AsNoTracking().Where(x => x.Status == "ACTIVE")
            .OrderBy(x => x.ListPrice).Select(x => new { x.Id, x.Code, x.Name, x.Description, x.ListPrice }).ToListAsync(cancellationToken);
        var pendingReconciliations = await db.ReconciliationCases.AsNoTracking()
            .Where(x => visibleContractIds.Contains(x.ContractId) && (x.Status == "PENDING" || x.Status == "DISPUTED" || x.Status == "REVIEW_REQUIRED"))
            .OrderByDescending(x => x.OpenedAt)
            .Select(x => new { x.Id, x.CustomerId, x.ContractId, x.Status, x.DisputeReason, x.OpenedAt })
            .ToListAsync(cancellationToken);
        return Results.Ok(new
        {
            data,
            metrics,
            packages,
            pending_reconciliations = pendingReconciliations,
            server_time = now,
            capabilities = new { view_revenue = canSeeRevenue, view_commission = canSeeCommission }
        });
    }

    private static async Task<IResult> MyCommissions(HttpContext http, KidsfitDbContext db, string? period, CancellationToken cancellationToken)
    {
        period = ChannelSalesValidation.Period(period ?? ChannelSalesValidation.BusinessPeriod(DateTime.UtcNow));
        var actorId = http.UserId();
        var access = await ChannelSalesAccess.Load(db, actorId, cancellationToken);
        var periodStart = DateTime.SpecifyKind(DateTime.ParseExact(period + "-01", "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture).AddHours(-7), DateTimeKind.Utc);
        var periodEnd = periodStart.AddMonths(1);
        var query = access.Commissions(db).AsNoTracking().Where(x => x.BeneficiaryUserId == actorId && x.Period == period);
        var payouts = access.Payouts(db).Where(x => x.BeneficiaryUserId == actorId);
        var paidPayouts = payouts.Where(x => x.Status == "PAID" && x.PaidAt >= periodStart && x.PaidAt < periodEnd);
        return Results.Ok(new
        {
            period,
            accrued = await query.SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0,
            approved = await payouts.Where(x => x.Status == "APPROVED" && x.Period == period).SumAsync(x => (decimal?)x.NetAmount, cancellationToken) ?? 0,
            paid = await paidPayouts.SumAsync(x => (decimal?)x.GrossAmount, cancellationToken) ?? 0,
            withholding = await paidPayouts.SumAsync(x => (decimal?)x.WithholdingAmount, cancellationToken) ?? 0,
            take_home = await paidPayouts.SumAsync(x => (decimal?)x.NetAmount, cancellationToken) ?? 0,
        });
    }
}

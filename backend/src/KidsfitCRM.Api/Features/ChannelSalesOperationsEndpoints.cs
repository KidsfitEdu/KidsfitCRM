using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public static class ChannelSalesOperationsEndpoints
{
    public static void MapChannelSalesOperations(this RouteGroupBuilder group)
    {
        group.MapGet("/finance", Finance).RequireAuthorization(Permissions.ChannelSalesCommissionView);
        group.MapGet("/reconciliation-cases", Reconciliations).RequireAuthorization(Permissions.ChannelSalesView);
        group.MapGet("/management", Management).RequireAuthorization(Permissions.ChannelSalesTeamManage);
        group.MapGet("/customers/{id:long}", CustomerDetail).RequireAuthorization(Permissions.ChannelSalesView);
        group.MapPost("/customers/{id:long}/support-activities", async (long id, AddCustomerActivityRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
            Results.Created($"/api/channel-sales/customers/{id}", new { data = new { id = await actions.RecordSupportActivity(id, request, http.UserId(), http, ct) } })).RequireAuthorization(Permissions.ChannelSalesActivity);
        group.MapPost("/commissions/{id:long}/adjustments", async (long id, AdjustCommissionRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
            Results.Created("/api/channel-sales/commissions", new { data = new { id = await actions.AdjustCommission(id, request, http.UserId(), http, ct) } })).RequireAuthorization(Permissions.ChannelSalesCommissionAdjust);
        group.MapPost("/payouts", async (CreatePayoutRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
            Results.Created("/api/channel-sales/payouts", new { data = new { id = await actions.CreatePayout(request, http.UserId(), http, ct) } })).RequireAuthorization(Permissions.ChannelSalesPayoutCreate);
        group.MapPost("/payouts/{id:long}/approve", async (long id, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
        {
            await actions.ApprovePayout(id, http.UserId(), http, ct);
            return Results.Ok(new { message = "Đã duyệt phiếu chi." });
        }).RequireAuthorization(Permissions.ChannelSalesPayoutApprove);
        group.MapPost("/payouts/{id:long}/complete", async (long id, CompletePayoutRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
        {
            await actions.CompletePayout(id, request, http.UserId(), http, ct);
            return Results.Ok(new { message = "Đã ghi nhận chi hoa hồng." });
        }).RequireAuthorization(Permissions.ChannelSalesPayoutComplete);
        group.MapPost("/commission-policies", async (CreateCommissionPolicyRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
            Results.Created("/api/channel-sales/commission-policies", new { data = new { id = await actions.CreateCommissionPolicy(request, http.UserId(), http, ct) } })).RequireAuthorization(Permissions.ChannelSalesPolicyManage);
        group.MapPost("/team", async (CreateSalesAccountRequest request, HttpContext http, ChannelSalesActions actions, IPasswordHasher<User> hasher, CancellationToken ct) =>
            Results.Created("/api/channel-sales/team", new { data = new { id = await actions.CreateSalesAccount(request, http.UserId(), hasher, http, ct) } })).RequireAuthorization(Permissions.ChannelSalesTeamManage);
        group.MapPatch("/team/{id:long}/status", async (long id, ChangeMembershipStatusRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
        {
            await actions.ChangeMembershipStatus(id, request, http.UserId(), http, ct);
            return Results.Ok(new { message = "Đã cập nhật trạng thái thành viên." });
        }).RequireAuthorization(Permissions.ChannelSalesTeamManage);
    }

    private static async Task<IResult> CustomerDetail(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var customer = await access.Customers(db).AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        var internalScope = access.All || access.OrganizationIds.Contains(customer.OrganizationId)
            || await access.Contracts(db).AnyAsync(x => x.CustomerId == id, ct);
        var canSeeMoney = access.Has(Permissions.ChannelSalesCommissionView) || access.Has(Permissions.ChannelSalesRecordRevenue);
        var contracts = await db.SalesContracts.AsNoTracking().Where(x => x.CustomerId == id
            && (access.All || (access.OrganizationIds.Contains(x.OwnerOrganizationId) && (access.Organization || x.OwnerUserId == access.UserId))
                || (access.Has(Permissions.ChannelSalesReconcile) && db.ReconciliationCases.Any(r => r.ContractId == x.Id && access.OrganizationIds.Contains(r.CheckeeOrganizationId)))))
            .OrderByDescending(x => x.SignedOn).Select(x => new { x.Id, x.ContractCode, x.SignedOn, x.Status, x.ProtectionUntil, x.EvidenceReference, total_value = canSeeMoney ? (decimal?)x.TotalValue : null }).Take(30).ToArrayAsync(ct);
        var activities = await (from activity in db.CustomerActivities.AsNoTracking()
                                join user in db.Users on activity.UserId equals user.Id
                                where internalScope && activity.CustomerId == id && (access.All || access.Organization || activity.UserId == access.UserId)
                                orderby activity.CreatedAt descending, activity.Id descending
                                select new { activity.Id, activity.ActivityType, activity.Content, activity.NextFollowUpAt, activity.CreatedAt, user_name = user.Name }).Take(100).ToArrayAsync(ct);
        return Results.Ok(new
        {
            data = new { customer.Id, customer.DisplayName, customer.TaxCode, phone = internalScope ? customer.Phone : null, email = internalScope ? customer.Email : null, contact_name = internalScope ? customer.ContactName : null, customer.LifecycleStatus },
            contracts,
            activities,
            can_record_support = internalScope && customer.LifecycleStatus == "CONTRACTED" && access.Has(Permissions.ChannelSalesActivity)
                && (access.All || await access.Contracts(db).AnyAsync(x => x.CustomerId == id && x.Status == "ACTIVE", ct)),
        });
    }

    public static async Task<IResult> Finance(HttpContext http, KidsfitDbContext db, string? period, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesCommissionView)) return Results.Forbid();
        var selectedPeriod = ChannelSalesValidation.Period(period ?? ChannelSalesValidation.BusinessPeriod(DateTime.UtcNow));
        var start = DateTime.SpecifyKind(DateTime.ParseExact(selectedPeriod + "-01", "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture).AddHours(-7), DateTimeKind.Utc);
        var end = start.AddMonths(1);
        var scopedEntries = access.Commissions(db).AsNoTracking();
        var entries = scopedEntries.Where(x => x.Period == selectedPeriod);
        var ledgerQuery = from entry in entries
                          join user in db.Users on entry.BeneficiaryUserId equals user.Id
                          join contract in db.SalesContracts on entry.ContractId equals contract.Id
                          join policy in db.CommissionPolicyVersions on entry.PolicyVersionId equals policy.Id
                          orderby entry.OccurredAt descending, entry.Id descending
                          select new
                          {
                              entry.Id,
                              entry.ContractId,
                              contract.ContractCode,
                              entry.BeneficiaryUserId,
                              beneficiary_name = user.Name,
                              entry.BeneficiaryOrganizationId,
                              entry.Period,
                              entry.EntryType,
                              entry.Amount,
                              entry.CalculationBase,
                              entry.RatePercent,
                              policy_code = policy.Code,
                              entry.OccurredAt,
                              entry.Reason,
                              entry.RelatedEntryId,
                              payout_status = (from item in db.PayoutItems join payout in db.Payouts on item.PayoutId equals payout.Id where item.CommissionLedgerEntryId == entry.Id select payout.Status).FirstOrDefault() ?? "ACCRUED",
                              reconciliation_status = db.ReconciliationCases.Where(x => x.ContractId == entry.ContractId).Select(x => x.Status).FirstOrDefault(),
                          };
        var payoutsQuery = access.Payouts(db).AsNoTracking();
        var payouts = from payout in payoutsQuery.Where(x => x.Period == selectedPeriod)
                      join user in db.Users on payout.BeneficiaryUserId equals (long?)user.Id
                      orderby payout.CreatedAt descending
                      select new
                      {
                          payout.Id,
                          payout.OrganizationId,
                          payout.BeneficiaryUserId,
                          beneficiary_name = user.Name,
                          payout.Code,
                          payout.Period,
                          payout.GrossAmount,
                          payout.WithholdingAmount,
                          payout.NetAmount,
                          payout.WithholdingReason,
                          payout.Status,
                          payout.ApprovedAt,
                          payout.PaidAt,
                          payout.PaymentReference,
                          events = db.PayoutEvents.Where(e => e.PayoutId == payout.Id).OrderBy(e => e.CreatedAt).Select(e => new { e.EventType, e.CreatedAt, e.Reason }).ToArray(),
                      };
        var paidInMonth = payoutsQuery.Where(x => x.Status == "PAID" && x.PaidAt >= start && x.PaidAt < end);
        var contracts = access.Contracts(db).Select(x => x.Id);
        var eligible = entries.Where(x => !db.PayoutItems.Any(i => i.CommissionLedgerEntryId == x.Id)
            && db.ReconciliationCases.Any(r => r.ContractId == x.ContractId && r.Status == "CONFIRMED"));
        var policies = db.CommissionPolicyVersions.AsNoTracking().Where(x => access.All || (x.OrganizationId.HasValue && access.OrganizationIds.Contains(x.OrganizationId.Value)));
        var organizations = db.Organizations.AsNoTracking().Where(x => x.Status == "ACTIVE" && (access.All || access.OrganizationIds.Contains(x.Id)));
        return Results.Ok(new
        {
            period = selectedPeriod,
            summary = new
            {
                accrued = await entries.SumAsync(x => (decimal?)x.Amount, ct) ?? 0,
                eligible = await eligible.SumAsync(x => (decimal?)x.Amount, ct) ?? 0,
                approved = await payoutsQuery.Where(x => x.Period == selectedPeriod && x.Status == "APPROVED").SumAsync(x => (decimal?)x.NetAmount, ct) ?? 0,
                paid = await paidInMonth.SumAsync(x => (decimal?)x.GrossAmount, ct) ?? 0,
                withholding = await paidInMonth.SumAsync(x => (decimal?)x.WithholdingAmount, ct) ?? 0,
                take_home = await paidInMonth.SumAsync(x => (decimal?)x.NetAmount, ct) ?? 0,
                collected_revenue = await db.RevenueReceipts.Where(x => contracts.Contains(x.ContractId) && x.Status == "COMPLETED" && x.ReceivedAt >= start && x.ReceivedAt < end).SumAsync(x => (decimal?)x.Amount, ct) ?? 0,
            },
            ledger = await ledgerQuery.Take(200).ToArrayAsync(ct),
            ledger_total = await entries.CountAsync(ct),
            payouts = await payouts.Take(100).ToArrayAsync(ct),
            policies = await policies.OrderByDescending(x => x.EffectiveFrom).Take(100).Select(x => new { x.Id, x.OrganizationId, x.Code, x.Name, x.RatePercent, x.EffectiveFrom, x.EffectiveUntil, x.Status }).ToArrayAsync(ct),
            organizations = await organizations.Select(x => new { x.Id, x.Code, x.Name, x.CommissionRateCeiling }).ToArrayAsync(ct),
        });
    }

    private static async Task<IResult> Reconciliations(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var contracts = access.Contracts(db).Select(x => x.Id);
        var query = db.ReconciliationCases.AsNoTracking().Where(x => access.All || contracts.Contains(x.ContractId)
            || (access.Has(Permissions.ChannelSalesReconcile) && access.OrganizationIds.Contains(x.CheckeeOrganizationId)));
        var rows = await (from reconciliation in query
                          join customer in db.ChannelCustomers on reconciliation.CustomerId equals customer.Id
                          join contract in db.SalesContracts on reconciliation.ContractId equals contract.Id
                          join owner in db.Users on contract.OwnerUserId equals owner.Id
                          orderby reconciliation.OpenedAt descending
                          select new
                          {
                              reconciliation.Id,
                              reconciliation.CustomerId,
                              customer_name = customer.DisplayName,
                              customer.TaxCode,
                              reconciliation.ContractId,
                              contract.ContractCode,
                              contract.SignedOn,
                              contract.TotalValue,
                              protection_until = contract.RequiresSchoolVerification && contract.Status != "ACTIVE" ? (DateTime?)null : contract.ProtectionUntil,
                              contract_status = contract.Status,
                              owner_name = owner.Name,
                              reconciliation.Status,
                              reconciliation.DisputeReason,
                              reconciliation.OpenedAt,
                              reconciliation.ResolvedAt,
                              can_reconcile = access.Has(Permissions.ChannelSalesReconcile) && (access.All || access.OrganizationIds.Contains(reconciliation.CheckeeOrganizationId)) && (!contract.RequiresSchoolVerification || contract.ManagerReviewedAt != null),
                              events = db.ReconciliationEvents.Where(x => x.ReconciliationCaseId == reconciliation.Id).OrderBy(x => x.CreatedAt).Select(x => new { x.Id, x.EventType, x.Reason, x.CreatedAt }).ToArray(),
                          }).Take(100).ToArrayAsync(ct);
        return Results.Ok(new { data = rows, total = await query.CountAsync(ct) });
    }

    private static async Task<IResult> Management(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var organizations = db.Organizations.Where(x => x.Status == "ACTIVE" && (access.All || access.OrganizationIds.Contains(x.Id)));
        var ids = organizations.Select(x => x.Id);
        var team = await (from membership in db.OrganizationMemberships
                          join user in db.Users on membership.UserId equals user.Id
                          join organization in organizations on membership.OrganizationId equals organization.Id
                          where ids.Contains(membership.OrganizationId)
                          orderby organization.Name, user.Name
                          select new
                          {
                              membership.Id,
                              membership.UserId,
                              membership.OrganizationId,
                              organization_name = organization.Name,
                              user.Name,
                              user.Email,
                              membership.MembershipType,
                              membership.Status,
                              can_change_status = membership.UserId != access.UserId && (access.Has(Permissions.ChannelSalesIdentityManage)
                                  || membership.MembershipType == "PARTNER_COLLABORATOR" || membership.MembershipType == "COLLABORATOR"),
                          }).Take(200).ToArrayAsync(ct);
        return Results.Ok(new
        {
            team,
            organizations = await organizations.Select(x => new { x.Id, x.Code, x.Name }).ToArrayAsync(ct),
            roles = await db.Roles.Where(x => (access.Has(Permissions.ChannelSalesIdentityManage) && x.Code != "SALES") || x.Code == "PARTNER_COLLABORATOR").Select(x => new { x.Code, x.Name }).ToArrayAsync(ct),
        });
    }
}

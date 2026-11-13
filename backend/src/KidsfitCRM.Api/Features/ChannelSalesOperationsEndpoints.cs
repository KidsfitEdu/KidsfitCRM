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
        AccountingWorkspaceEndpoints.Map(group);
        group.MapGet("/accounting/contracts", AccountingContractEndpoints.List).RequireAuthorization(Permissions.ChannelSalesCommissionView);
        group.MapGet("/accounting/contracts/{id:long}", AccountingContractEndpoints.Detail).RequireAuthorization(Permissions.ChannelSalesCommissionView);
        group.MapPut("/accounting/contracts/{id:long}/service-term", AccountingContractEndpoints.SetServiceTerm).RequireAuthorization(Permissions.ChannelSalesRecordRevenue);
        group.MapGet("/finance", Finance).RequireAuthorization(Permissions.ChannelSalesCommissionView);
        // BGĐ approval inbox: one view of the existing payouts, never another payout table.
        group.MapGet("/payouts/approval-queue", BoardPayoutApprovalQueue)
            .RequireAuthorization(Permissions.ChannelSalesPayoutApprove);
        group.MapGet("/income/me", SalesIncomeEndpoints.Mine).RequireAuthorization(Permissions.ChannelSalesCommissionView);
        group.MapGet("/income/me/contracts/{contractId:long}", SalesIncomeEndpoints.Detail).RequireAuthorization(Permissions.ChannelSalesCommissionView);
        group.MapGet("/schools/mine", SalesSchoolEndpoints.Mine).RequireAuthorization(Permissions.ChannelSalesView);
        group.MapGet("/reconciliation-cases", Reconciliations).RequireAuthorization(Permissions.ChannelSalesView);
        CheckeeVerificationEndpoints.Map(group);
        group.MapGet("/management", Management).RequireAuthorization(Permissions.ChannelSalesTeamManage);
        group.MapAdminPersonnel();
        group.MapGet("/customers/{id:long}", CustomerDetail).RequireAuthorization(Permissions.ChannelSalesView);
        group.MapGet("/customers/{id:long}/work-logs", CustomerWorkLogEndpoints.List).RequireAuthorization(Permissions.ChannelSalesView);
        group.MapPost("/customers/{id:long}/support-activities", async (long id, AddCustomerActivityRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
            Results.Created($"/api/channel-sales/customers/{id}", new { data = new { id = await actions.RecordSupportActivity(id, request, http.UserId(), http, ct) } })).RequireAuthorization(Permissions.ChannelSalesActivity);
        group.MapGet("/revenue-receipts/{receiptId:long}/commission-backfill-preview",
            async (long receiptId, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
                await actions.PreviewReceiptCommissionBackfill(receiptId, http.UserId(), ct))
            .RequireAuthorization(Permissions.ChannelSalesCommissionAdjust);
        group.MapPost("/revenue-receipts/{receiptId:long}/commission-backfill",
            async (long receiptId, ConfirmReceiptCommissionBackfillRequest request,
                HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
                await actions.BackfillReceiptCommission(receiptId, request, http.UserId(), http, ct))
            .RequireAuthorization(Permissions.ChannelSalesCommissionAdjust);
        group.MapPost("/commissions/{id:long}/adjustments", async (long id, AdjustCommissionRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
            Results.Created("/api/channel-sales/commissions", new { data = new { id = await actions.AdjustCommission(id, request, http.UserId(), http, ct) } })).RequireAuthorization(Permissions.ChannelSalesCommissionAdjust);
        group.MapPost("/payouts", async (CreatePayoutRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
            Results.Created("/api/channel-sales/payouts", new { data = new { id = await actions.CreatePayout(request, http.UserId(), http, ct) } })).RequireAuthorization(Permissions.ChannelSalesPayoutCreate);

        group.MapPatch("/payouts/{id:long}/draft", async (long id, UpdatePayoutDraftRequest request,
            HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
        {
            await actions.UpdatePayoutDraft(id, request, http.UserId(), http, ct);
            return Results.Ok(new { message = "Đã cập nhật phiếu Nháp." });
        }).RequireAuthorization(Permissions.ChannelSalesPayoutCreate);
        group.MapPost("/payouts/{id:long}/submit", async (long id,
            HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
        {
            await actions.SubmitPayout(id, http.UserId(), http, ct);
            return Results.Ok(new { message = "Đã gửi phiếu cho BGĐ duyệt." });
        }).RequireAuthorization(Permissions.ChannelSalesPayoutCreate);
        group.MapPost("/payouts/{id:long}/return", async (long id, ReturnPayoutRequest request,
            HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
        {
            await actions.ReturnPayout(id, request, http.UserId(), http, ct);
            return Results.Ok(new { message = "Đã yêu cầu Kế toán bổ sung phiếu chi." });
        }).RequireAuthorization(Permissions.ChannelSalesPayoutApprove);
        group.MapPost("/payouts/{id:long}/approve", async (long id, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
        {
            await actions.ApprovePayout(id, http.UserId(), http, ct);
            return Results.Ok(new { message = "Đã duyệt phiếu chi." });
        }).RequireAuthorization(Permissions.ChannelSalesPayoutApprove);
        group.MapPost("/payouts/{id:long}/complete", async (long id, CompletePayoutRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
        {
            if (!request.EvidenceId.HasValue) throw ApiValidationException.For("evidence_id", "Bắt buộc upload ảnh chuyển khoản trước khi ghi nhận đã chi.");
            await actions.CompletePayout(id, request, http.UserId(), http, ct);
            return Results.Ok(new { message = "Đã ghi nhận chi hoa hồng." });
        }).RequireAuthorization(Permissions.ChannelSalesPayoutComplete);
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
            || await access.Contracts(db).AnyAsync(x => x.CustomerId == id, ct)
            || await db.ApproachRegistrations.AnyAsync(x => x.CustomerId == id && x.OwnerUserId == access.UserId && access.OrganizationIds.Contains(x.OwnerOrganizationId), ct);
        var canSeeMoney = access.Has(Permissions.ChannelSalesCommissionView) || access.Has(Permissions.ChannelSalesRecordRevenue);
        var scopedContractIds = access.Contracts(db).Select(x => x.Id);
        var contracts = await db.SalesContracts.AsNoTracking().Where(x => x.CustomerId == id
            && (scopedContractIds.Contains(x.Id)
                || (access.Has(Permissions.ChannelSalesReconcile) && db.ReconciliationCases.Any(r => r.ContractId == x.Id && access.OrganizationIds.Contains(r.CheckeeOrganizationId)))))
            .OrderByDescending(x => x.SignedOn).Select(x => new { x.Id, x.ContractCode, x.SignedOn, x.Status, x.ProtectionUntil, x.EvidenceReference, total_value = canSeeMoney ? (decimal?)x.TotalValue : null }).Take(30).ToArrayAsync(ct);
        var activities = await (from activity in db.CustomerActivities.AsNoTracking()
                                join user in db.Users on activity.UserId equals user.Id
                                where internalScope && activity.CustomerId == id && (access.All || access.Organization || activity.UserId == access.UserId)
                                orderby activity.CreatedAt descending, activity.Id descending
                                select new { activity.Id, activity.ActivityType, activity.Content, activity.NextFollowUpAt, activity.CreatedAt, user_name = user.Name }).Take(100).ToArrayAsync(ct);
        var schoolUnits = internalScope ? await (from school in db.DirectorySchools.AsNoTracking()
                    join unit in db.SchoolUnits.AsNoTracking() on school.Id equals unit.DirectorySchoolId
                    where school.CustomerId == id
                    orderby unit.UnitType, unit.Name
                    select new { unit.Id, unit.Name, unit.UnitType, unit.Address, unit.Province, unit.Ward, unit.ContactName, unit.ContactPosition, unit.ContactPhone, unit.Email }).ToArrayAsync(ct)
            : [];
        return Results.Ok(new
        {
            data = new { customer.Id, customer.DisplayName, customer.TaxCode,
                address = internalScope ? customer.Address : null,
                province = internalScope ? customer.Province : null,
                district = internalScope ? customer.District : null,
                phone = internalScope ? customer.Phone : null, email = internalScope ? customer.Email : null,
                contact_name = internalScope ? customer.ContactName : null,
                contact_position = internalScope ? customer.ContactPosition : null,
                customer.LifecycleStatus },
            school_units = schoolUnits,
            contracts,
            activities,
            can_record_support = internalScope && customer.LifecycleStatus == "CONTRACTED" && access.Has(Permissions.ChannelSalesActivity)
                && (access.All || await access.Contracts(db).AnyAsync(x => x.CustomerId == id && x.Status == "ACTIVE", ct)),
        });
    }


    /// <summary>BGĐ sees all Accounting-submitted payouts within its authorized scope,
    /// regardless of the payout's earning month. No drafts or payout writes in this endpoint.</summary>
    private static async Task<IResult> BoardPayoutApprovalQueue(
        HttpContext http, KidsfitDbContext db, string? status,
        string? search, long? organizationId, int page = 1, int pageSize = 20,
        CancellationToken ct = default)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesPayoutApprove)) return Results.Forbid();
        var actorIsBoard = await db.UserRoles.AsNoTracking().AnyAsync(link =>
            link.UserId == access.UserId && db.Roles.Any(role =>
                role.Id == link.RoleId && (role.Code == "DIRECTOR" || role.Code == "ADMIN")), ct);
        if (!actorIsBoard) return Results.Forbid();

        var selectedStatus = string.IsNullOrWhiteSpace(status) ? "PENDING_APPROVAL" : status.Trim().ToUpperInvariant();
        if (selectedStatus is not ("ALL" or "PENDING_APPROVAL" or "CHANGES_REQUESTED" or "APPROVED" or "PAID"))
            throw ApiValidationException.For("status", "Trạng thái phiếu chi không hợp lệ.");
        if (page < 1 || pageSize < 1 || pageSize > 100)
            throw ApiValidationException.For("page", "Trang hoặc số dòng/trang không hợp lệ.");
        if (organizationId.HasValue && organizationId.Value < 1)
            throw ApiValidationException.For("organizationId", "Tổ chức không hợp lệ.");

        // Scoping is performed before searching, counting or selecting rows.
        var scope = access.Payouts(db).AsNoTracking();
        var submitted = scope.Where(x => x.Status != "DRAFT");
        var pendingCount = await submitted.CountAsync(x => x.Status == "PENDING_APPROVAL", ct);
        var pendingAmount = await submitted.Where(x => x.Status == "PENDING_APPROVAL")
            .SumAsync(x => (decimal?)x.NetAmount, ct) ?? 0m;
        var filtered = submitted;
        if (selectedStatus != "ALL") filtered = filtered.Where(x => x.Status == selectedStatus);
        if (organizationId.HasValue) filtered = filtered.Where(x => x.OrganizationId == organizationId.Value);
        var keyword = search?.Trim();
        if (!string.IsNullOrEmpty(keyword))
        {
            if (keyword.Length > 120) throw ApiValidationException.For("search", "Tìm kiếm tối đa 120 ký tự.");
            filtered = filtered.Where(x => x.Code.Contains(keyword) ||
                db.Users.Any(u => u.Id == x.BeneficiaryUserId && u.Name.Contains(keyword)) ||
                db.Users.Any(u => u.Id == x.CreatedByUserId && u.Name.Contains(keyword)));
        }
        var total = await filtered.CountAsync(ct);
        var items = await (from payout in filtered
            join beneficiary in db.Users on payout.BeneficiaryUserId equals (long?)beneficiary.Id
            join creator in db.Users on payout.CreatedByUserId equals creator.Id
            join organization in db.Organizations on payout.OrganizationId equals organization.Id
            orderby payout.SubmittedAt descending, payout.Id descending
            select new
            {
                payout.Id, payout.Code, payout.OrganizationId, organization_name = organization.Name,
                payout.Period, payout.Status, payout.CreatedAt, payout.SubmittedAt,
                payout.BeneficiaryRole, payout.BeneficiaryUserId, beneficiary_name = beneficiary.Name,
                payout.CreatedByUserId, creator_name = creator.Name,
                payout.SuggestedRatePercent, payout.SuggestedAmount,
                payout.RequestedRatePercent, payout.RequestedAmount,
                payout.AdjustmentReason, payout.WithholdingAmount, payout.WithholdingReason,
                payout.NetAmount, payout.ApprovedAt, payout.PaidAt, payout.PaymentReference,
                // Distinct contracts: one payout can include multiple ledger entries for one contract.
                // Query through payout items, never duplicate contract values per ledger entry.
                contract_count = db.SalesContracts.Count(contract =>
                    db.PayoutItems.Any(item => item.PayoutId == payout.Id &&
                        db.CommissionLedgerEntries.Any(entry =>
                            entry.Id == item.CommissionLedgerEntryId && entry.ContractId == contract.Id))),
                contract_total_value = db.SalesContracts
                    .Where(contract => db.PayoutItems.Any(item => item.PayoutId == payout.Id &&
                        db.CommissionLedgerEntries.Any(entry =>
                            entry.Id == item.CommissionLedgerEntryId && entry.ContractId == contract.Id)))
                    .Sum(contract => (decimal?)contract.TotalValue),
                contract_code = (from item in db.PayoutItems
                    join entry in db.CommissionLedgerEntries on item.CommissionLedgerEntryId equals entry.Id
                    join contract in db.SalesContracts on entry.ContractId equals contract.Id
                    where item.PayoutId == payout.Id
                    select contract.ContractCode).FirstOrDefault(),
                school_name = (from item in db.PayoutItems
                    join entry in db.CommissionLedgerEntries on item.CommissionLedgerEntryId equals entry.Id
                    join contract in db.SalesContracts on entry.ContractId equals contract.Id
                    join school in db.ChannelCustomers on contract.CustomerId equals school.Id
                    where item.PayoutId == payout.Id
                    select school.DisplayName).FirstOrDefault(),
                events = db.PayoutEvents.Where(e => e.PayoutId == payout.Id)
                    .OrderBy(e => e.CreatedAt)
                    .Select(e => new { event_type = e.EventType, reason = e.Reason, created_at = e.CreatedAt })
                    .ToArray()
            })
            .Skip((page - 1) * pageSize).Take(pageSize).ToArrayAsync(ct);

        var organizations = await db.Organizations.AsNoTracking()
            .Where(x => x.Status == "ACTIVE" && (access.All || access.OrganizationIds.Contains(x.Id)))
            .OrderBy(x => x.Name)
            .Select(x => new { id = x.Id, name = x.Name }).ToArrayAsync(ct);

        return Results.Ok(new
        {
            items,
            organizations,
            summary = new { pending_count = pendingCount, pending_amount = pendingAmount },
            pagination = new { page, page_size = pageSize, total }
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
                              beneficiary_role = entry.BeneficiaryRole,
                              policy_code = entry.LegacyPolicyCode ?? entry.PolicySource,
                              board_policy_version_id = entry.BoardPolicyVersionId,
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
                          beneficiary_role = payout.BeneficiaryRole,
                          payout.GrossAmount,
                          payout.SuggestedRatePercent,
                          payout.RequestedRatePercent,
                          payout.SuggestedAmount,
                          payout.RequestedAmount,
                          payout.AdjustmentReason,
                          payout.SubmittedAt,
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
        var policies = db.BoardCommissionPolicyVersions.AsNoTracking()
            .Where(x => access.All || x.Scope == "SYSTEM"
                || (x.OrganizationId.HasValue && access.OrganizationIds.Contains(x.OrganizationId.Value)));
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
                refunded_revenue = await db.RevenueRefunds.Where(x => contracts.Contains(x.ContractId) && x.RefundedAt >= start && x.RefundedAt < end).SumAsync(x => (decimal?)x.Amount, ct) ?? 0,
                net_collected_revenue = (await db.RevenueReceipts.Where(x => contracts.Contains(x.ContractId) && x.Status == "COMPLETED" && x.ReceivedAt >= start && x.ReceivedAt < end).SumAsync(x => (decimal?)x.Amount, ct) ?? 0)
                    - (await db.RevenueRefunds.Where(x => contracts.Contains(x.ContractId) && x.RefundedAt >= start && x.RefundedAt < end).SumAsync(x => (decimal?)x.Amount, ct) ?? 0),
            },
            ledger = await ledgerQuery.Take(200).ToArrayAsync(ct),
            ledger_total = await entries.CountAsync(ct),
            payouts = await payouts.Take(100).ToArrayAsync(ct),
            policies = await policies.OrderByDescending(x => x.CreatedAt).Take(100).Select(x => new {
                x.Id, x.Scope, x.OrganizationId, x.ManagerUserId, x.SalesUserId,
                x.SalesPercent, x.ManagerPercent, x.CreatedAt, x.Status }).ToArrayAsync(ct),
            personnel_types = CommissionPersonnelTypes.Specific,
            organizations = await organizations.Select(x => new { x.Id, x.Code, x.Name, x.CommissionRateCeiling }).ToArrayAsync(ct),
        });
    }

    private static async Task<IResult> Reconciliations(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var contracts = access.Contracts(db).Select(x => x.Id);
        var query = db.ReconciliationCases.AsNoTracking().Where(x => access.All || contracts.Contains(x.ContractId)
            || (access.Has(Permissions.ChannelSalesReconcile) && access.OrganizationIds.Contains(x.CheckeeOrganizationId)));
        // CHECKEE must not see unforwarded school contracts as an actionable verification inbox.
        if (access.Has(Permissions.ChannelSalesReconcile) && !access.All)
            query = query.Where(x => db.SalesContracts.Any(c => c.Id == x.ContractId &&
                (!c.RequiresSchoolVerification || (c.ManagerReviewedAt != null && c.Status != "NEEDS_REVISION"))));
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
                              can_reconcile = access.Has(Permissions.ChannelSalesReconcile) && (access.All || access.OrganizationIds.Contains(reconciliation.CheckeeOrganizationId)) && (!contract.RequiresSchoolVerification || contract.ManagerReviewedAt != null || contract.Status == "CANCELLED"),
                              events = db.ReconciliationEvents.Where(x => x.ReconciliationCaseId == reconciliation.Id).OrderBy(x => x.CreatedAt).Select(x => new { x.Id, x.EventType, x.Reason, x.CreatedAt }).ToArray(),
                          }).Take(100).ToArrayAsync(ct);
        return Results.Ok(new { data = rows, total = await query.CountAsync(ct) });
    }

    private static async Task<IResult> Management(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var organizations = db.Organizations.Where(x => access.All || (x.Status == "ACTIVE" && access.OrganizationIds.Contains(x.Id)));
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
                              user.Phone,
                              account_status = user.Status,
                              membership.ManagerUserId,
                              membership.MembershipType,
                              membership.Status,
                              can_edit = membership.UserId != access.UserId && access.All && access.Has(Permissions.ChannelSalesIdentityManage),
                              can_change_status = membership.UserId != access.UserId && (access.Has(Permissions.ChannelSalesIdentityManage)
                                  || membership.MembershipType == "SALES" || membership.MembershipType == "PARTNER_COLLABORATOR" || membership.MembershipType == "COLLABORATOR"),
                          }).Take(1000).ToArrayAsync(ct);
        return Results.Ok(new
        {
            team,
            organizations = await organizations.OrderBy(x => x.Name).Select(x => new { x.Id, x.Code, x.Name, x.OrganizationType, x.Status }).ToArrayAsync(ct),
            roles = await db.Roles.Where(x => access.Has(Permissions.ChannelSalesIdentityManage)
                ? new[] { "SALES", "SALES_MANAGER", "ACCOUNTANT", "CUSTOMER_SERVICE", "CHECKEE" }.Contains(x.Code)
                : x.Code == "SALES").Select(x => new { x.Code, x.Name }).ToArrayAsync(ct),
        });
    }
}

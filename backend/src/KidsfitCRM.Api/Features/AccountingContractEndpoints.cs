using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>Contract-oriented accounting read model. All queries are scoped in SQL, never only in UI.</summary>
public static class AccountingContractEndpoints
{
    // Explicit period states: a future confirmed renewal must never be labeled "currently in use".
    public sealed record ServicePeriod(DateOnly start_on, DateOnly end_on, string payment_cycle,
        long? renewal_id, int? renewal_no, string? gap_reason);
    public sealed record PeriodTimeline(ServicePeriod? current_period, ServicePeriod? next_confirmed_period,
        ServicePeriod? latest_confirmed_period, ServicePeriod? previous_period,
        ServicePeriod[] period_history);

    public static PeriodTimeline BuildTimeline(DateOnly? sourceStart, DateOnly? sourceEnd,
        string? sourcePaymentCycle, IEnumerable<ContractRenewal> confirmed, DateOnly today)
    {
        var periods = new List<ServicePeriod>();
        if (sourceStart.HasValue && sourceEnd.HasValue)
            periods.Add(new ServicePeriod(sourceStart.Value, sourceEnd.Value, sourcePaymentCycle ?? "YEARLY", null, null, null));
        var renewalPeriods = confirmed.Where(x => x.Status == "CONFIRMED")
            .Select(x => new ServicePeriod(x.ServiceStartOn, x.ServiceEndOn, x.PaymentCycle,
                x.Id, x.RenewalNo, x.GapReason))
            .OrderBy(x => x.start_on).ThenBy(x => x.end_on).ToArray();
        periods.AddRange(renewalPeriods);
        var ordered = periods.OrderBy(x => x.start_on).ThenBy(x => x.end_on).ToArray();
        var current = ordered.LastOrDefault(x => x.start_on <= today && today <= x.end_on);
        var upcoming = ordered.FirstOrDefault(x => x.start_on > today);
        var previous = ordered.LastOrDefault(x => x.end_on < today);
        var latest = renewalPeriods.LastOrDefault();
        return new PeriodTimeline(current, upcoming, latest, previous, ordered);
    }

    public static async Task<IResult> SchoolUnits(long customerId, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesReportContract)) return Results.Forbid();
        var allowed = await db.ApproachRegistrations.AnyAsync(x => x.CustomerId == customerId
            && x.Status == "ACTIVE" && x.ProtectedUntil > DateTime.UtcNow
            && (x.OwnerUserId == access.UserId || (access.Organization
                && access.OrganizationIds.Contains(x.OwnerOrganizationId))), ct);
        if (!allowed) throw new KeyNotFoundException();
        var directoryId = await db.DirectorySchools.Where(x => x.CustomerId == customerId)
            .Select(x => (long?)x.Id).SingleOrDefaultAsync(ct);
        if (!directoryId.HasValue) return Results.Ok(new { data = Array.Empty<object>() });
        var units = await db.SchoolUnits.AsNoTracking().Where(x => x.DirectorySchoolId == directoryId.Value
            && x.UnitType == "BRANCH").OrderBy(x => x.SourceRow)
            .Select(x => new { id = x.Id, name = x.Name }).ToArrayAsync(ct);
        return Results.Ok(new { data = units });
    }

    public static async Task<IResult> List(
        HttpContext http, KidsfitDbContext db, string? search, string? personnel_type,
        long? owner_user_id, string? financial_view, int? page, int? page_size, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesCommissionView)) return Results.Forbid();
        var pageNumber = Math.Max(1, page ?? 1);
        var size = Math.Clamp(page_size ?? 20, 1, 100);
        // A contract enters the accounting workspace only after CHECKEE verifies it.
        // Verification is distinct from KIDSFIT's subsequent long-term protection grant.
        var verified = access.Contracts(db).AsNoTracking().Where(x => x.VerifiedAt != null);
        var view = string.IsNullOrWhiteSpace(financial_view) ? "CURRENT" : financial_view.Trim().ToUpperInvariant();
        if (view is not ("CURRENT" or "HISTORY"))
            throw ApiValidationException.For("financial_view", "Nhóm hợp đồng không hợp lệ.");
        IQueryable<KidsfitCRM.Api.Domain.SalesContract> eligible = view == "CURRENT"
            ? verified.Where(x => x.Status != "CANCELLED" && x.Status != "REJECTED")
            : verified.Where(x => x.Status == "CANCELLED" || x.Status == "REJECTED"
                || db.RevenueRefunds.Any(refund => refund.ContractId == x.Id)
                || db.CommissionLedgerEntries.Any(entry => entry.ContractId == x.Id && entry.EntryType != "ACCRUAL"));
        // Owner options derive from the complete scoped, verified result—not the current page.
        var owners = await (from contract in eligible
                            join owner in db.Users.AsNoTracking() on contract.OwnerUserId equals owner.Id
                            select new { id = owner.Id, name = owner.Name })
            .Distinct().OrderBy(x => x.name).ThenBy(x => x.id).ToArrayAsync(ct);
        var contracts = eligible;
        if (owner_user_id.HasValue)
        {
            if (owner_user_id <= 0) throw ApiValidationException.For("owner_user_id", "Người phụ trách không hợp lệ.");
            contracts = contracts.Where(x => x.OwnerUserId == owner_user_id.Value);
        }
        // Preserve the old optional parameter for older clients during transition.
        if (!string.IsNullOrWhiteSpace(personnel_type) && personnel_type != "ALL")
        {
            var type = CommissionPersonnelTypes.Normalize(personnel_type);
            if (type is not ("SALES" or "COLLABORATOR")) throw ApiValidationException.For("personnel_type", "Nhóm nhân sự không hợp lệ.");
            contracts = contracts.Where(x => x.OwnerPersonnelType == type);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            contracts = contracts.Where(x => x.ContractCode.Contains(term)
                || db.ChannelCustomers.Any(c => c.Id == x.CustomerId && c.DisplayName.Contains(term))
                || db.Users.Any(u => u.Id == x.OwnerUserId && u.Name.Contains(term)));
        }
        var total = await contracts.CountAsync(ct);
        var rows = await (from contract in contracts
                          join school in db.ChannelCustomers.AsNoTracking() on contract.CustomerId equals school.Id
                          join owner in db.Users.AsNoTracking() on contract.OwnerUserId equals owner.Id
                          orderby contract.SignedOn descending, contract.Id descending
                          select new
                          {
                              id = contract.Id,
                              contract_code = contract.ContractCode,
                              school_name = school.DisplayName,
                              owner_name = owner.Name,
                              owner_user_id = contract.OwnerUserId,
                              verified_at = contract.VerifiedAt,
                              source_service_start_on = contract.ServiceStartOn,
                              source_service_end_on = contract.ServiceEndOn,
                              source_payment_cycle = contract.PaymentCycle,
                              // Legacy end fields remain unchanged for compatible clients; explicit period states follow below.
                              service_start_on = db.ContractRenewals.Where(r => r.ContractId == contract.Id && r.Status == "CONFIRMED")
                                  .OrderByDescending(r => r.ServiceEndOn).Select(r => (DateOnly?)r.ServiceStartOn).FirstOrDefault() ?? contract.ServiceStartOn,
                              service_end_on = db.ContractRenewals.Where(r => r.ContractId == contract.Id && r.Status == "CONFIRMED")
                                  .OrderByDescending(r => r.ServiceEndOn).Select(r => (DateOnly?)r.ServiceEndOn).FirstOrDefault() ?? contract.ServiceEndOn,
                              payment_cycle = db.ContractRenewals.Where(r => r.ContractId == contract.Id && r.Status == "CONFIRMED")
                                  .OrderByDescending(r => r.ServiceEndOn).Select(r => r.PaymentCycle).FirstOrDefault() ?? contract.PaymentCycle,
                              personnel_type = contract.OwnerPersonnelType,
                              total_value = contract.TotalValue,
                              received = db.RevenueReceipts.Where(x => x.ContractId == contract.Id && x.Status == "COMPLETED").Sum(x => (decimal?)x.Amount) ?? 0,
                              refunded = db.RevenueRefunds.Where(x => x.ContractId == contract.Id).Sum(x => (decimal?)x.Amount) ?? 0,
                              commission = access.Commissions(db).Where(x => x.ContractId == contract.Id).Sum(x => (decimal?)x.Amount) ?? 0,
                              contract_status = contract.Status,
                          }).Skip((pageNumber - 1) * size).Take(size).ToArrayAsync(ct);
        var rowIds = rows.Select(x => x.id).ToArray();
        var confirmed = await db.ContractRenewals.AsNoTracking()
            .Where(x => rowIds.Contains(x.ContractId) && x.Status == "CONFIRMED").ToArrayAsync(ct);
        var byContract = confirmed.ToLookup(x => x.ContractId);
        var today = ChannelSalesValidation.BusinessDate(DateTime.UtcNow);
        var output = rows.Select(row =>
        {
            var timeline = BuildTimeline(row.source_service_start_on, row.source_service_end_on,
                row.source_payment_cycle, byContract[row.id], today);
            return new {
                row.id, row.contract_code, row.school_name, row.owner_name, row.owner_user_id, row.verified_at,
                row.service_start_on, row.service_end_on, row.payment_cycle, row.personnel_type, row.total_value,
                row.received, row.refunded, row.commission, row.contract_status,
                timeline.current_period, timeline.next_confirmed_period, timeline.latest_confirmed_period
            };
        }).ToArray();
        return Results.Ok(new { data = output, owners, total, page = pageNumber, page_size = size });
    }

    public static async Task<IResult> Detail(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesCommissionView)) return Results.Forbid();
        var contract = await (from c in access.Contracts(db).AsNoTracking().Where(x => x.Id == id && x.VerifiedAt != null)
                              join school in db.ChannelCustomers.AsNoTracking() on c.CustomerId equals school.Id
                              join owner in db.Users.AsNoTracking() on c.OwnerUserId equals owner.Id
                              select new {
                                  id = c.Id, contract_code = c.ContractCode, school_name = school.DisplayName,
                                  school_address = school.Address, school_district = school.District, school_province = school.Province,
                                  owner_name = owner.Name, owner_user_id = c.OwnerUserId,
                                  personnel_type = c.OwnerPersonnelType, signed_on = c.SignedOn,
                                  effective_on = c.EffectiveOn, status = c.Status, verified_at = c.VerifiedAt,
                                  source_service_start_on = c.ServiceStartOn,
                                  source_service_end_on = c.ServiceEndOn,
                                  source_payment_cycle = c.PaymentCycle,
                                  service_start_on = db.ContractRenewals.Where(r => r.ContractId == c.Id && r.Status == "CONFIRMED")
                                      .OrderByDescending(r => r.ServiceEndOn).Select(r => (DateOnly?)r.ServiceStartOn).FirstOrDefault() ?? c.ServiceStartOn,
                                  service_end_on = db.ContractRenewals.Where(r => r.ContractId == c.Id && r.Status == "CONFIRMED")
                                      .OrderByDescending(r => r.ServiceEndOn).Select(r => (DateOnly?)r.ServiceEndOn).FirstOrDefault() ?? c.ServiceEndOn,
                                  payment_cycle = db.ContractRenewals.Where(r => r.ContractId == c.Id && r.Status == "CONFIRMED")
                                      .OrderByDescending(r => r.ServiceEndOn).Select(r => r.PaymentCycle).FirstOrDefault() ?? c.PaymentCycle,
                                  protection_until = db.CustomerProtections.Where(p =>
                                      p.ContractId == c.Id && p.SourceType == "CONTRACT" &&
                                      p.Status == "ACTIVE" && p.EffectiveUntil > DateTime.UtcNow)
                                      .OrderByDescending(p => p.EffectiveUntil)
                                      .Select(p => (DateTime?)p.EffectiveUntil).FirstOrDefault(),
                                  total_value = c.TotalValue, evidence_reference = c.EvidenceReference,
                                  service_plan = c.ServicePlan, student_count = c.StudentCount,
                                  school_unit_ids_json = c.SchoolUnitIdsJson,
                                  owner_organization_id = c.OwnerOrganizationId
                              }).SingleOrDefaultAsync(ct);
        if (contract is null) throw new KeyNotFoundException();
        var confirmedPeriods = await db.ContractRenewals.AsNoTracking().Where(x => x.ContractId == id
            && x.Status == "CONFIRMED").OrderBy(x => x.ServiceStartOn).ToArrayAsync(ct);
        var timeline = BuildTimeline(contract.source_service_start_on, contract.source_service_end_on,
            contract.source_payment_cycle, confirmedPeriods, ChannelSalesValidation.BusinessDate(DateTime.UtcNow));
        var schedules = await db.RevenueSchedules.AsNoTracking().Where(x => x.ContractId == id)
            .OrderBy(x => x.DueOn).Select(x => new { id = x.Id, due_on = x.DueOn,
                amount_due = x.AmountDue, amount_received = x.AmountReceived, status = x.Status }).ToArrayAsync(ct);
        var receipts = await db.RevenueReceipts.AsNoTracking().Where(x => x.ContractId == id && x.Status == "COMPLETED")
            .OrderByDescending(x => x.ReceivedAt).Select(x => new {
                id = x.Id, revenue_schedule_id = x.RevenueScheduleId, received_at = x.ReceivedAt,
                amount = x.Amount, reference_code = x.ReferenceCode, payment_method = x.PaymentMethod
            }).ToArrayAsync(ct);
        var ledger = await (from entry in access.Commissions(db).AsNoTracking()
            join recipient in db.Users.AsNoTracking() on entry.BeneficiaryUserId equals recipient.Id
            where entry.ContractId == id
            orderby entry.OccurredAt
            select new {
                id = entry.Id, entry_type = entry.EntryType, beneficiary_name = recipient.Name, amount = entry.Amount,
                revenue_receipt_id = entry.RevenueReceiptId,
                rate_percent = entry.RatePercent, calculation_base = entry.CalculationBase,
                reason = entry.Reason, occurred_at = entry.OccurredAt,
                period = entry.Period, beneficiary_user_id = entry.BeneficiaryUserId,
                beneficiary_role = entry.BeneficiaryRole, policy_source = entry.PolicySource,
                board_policy_version_id = entry.BoardPolicyVersionId,
                beneficiary_organization_id = entry.BeneficiaryOrganizationId,
                assigned_to_payout = db.PayoutItems.Any(item => item.CommissionLedgerEntryId == entry.Id)
            }).ToArrayAsync(ct);
        var payoutIds = db.PayoutItems.Where(x => access.Commissions(db).Any(e => e.Id == x.CommissionLedgerEntryId && e.ContractId == id)).Select(x => x.PayoutId);
        var payouts = await access.Payouts(db).AsNoTracking().Where(x => payoutIds.Contains(x.Id))
            .OrderByDescending(x => x.CreatedAt).Select(x => new {
                id = x.Id, code = x.Code, net_amount = x.NetAmount, status = x.Status,
                suggested_rate_percent = x.SuggestedRatePercent, requested_rate_percent = x.RequestedRatePercent,
                suggested_amount = x.SuggestedAmount, requested_amount = x.RequestedAmount,
                withholding_amount = x.WithholdingAmount, withholding_reason = x.WithholdingReason,
                period = x.Period,
                adjustment_reason = x.AdjustmentReason, submitted_at = x.SubmittedAt,
                created_by_user_id = x.CreatedByUserId,
                events = db.PayoutEvents.Where(ev => ev.PayoutId == x.Id).OrderBy(ev => ev.CreatedAt)
                    .Select(ev => new { event_type = ev.EventType, reason = ev.Reason, created_at = ev.CreatedAt }).ToArray(),
                beneficiary_user_id = x.BeneficiaryUserId, beneficiary_role = x.BeneficiaryRole,
                paid_at = x.PaidAt, payment_reference = x.PaymentReference
            }).ToArrayAsync(ct);
        // Payout proofs are attached to a payout, not directly to a contract.
        // Return only payout proofs reachable through the current scoped ledger.
        var evidence = await db.FinancialEvidences.AsNoTracking()
            .Where(x => x.AttachedAt != null &&
                (x.ContractId == id || (x.PayoutId.HasValue && payoutIds.Contains(x.PayoutId.Value))))
            .Select(x => new { id = x.Id, kind = x.Kind, file_name = x.FileName,
                revenue_receipt_id = x.RevenueReceiptId, payout_id = x.PayoutId }).ToArrayAsync(ct);
        var selectedUnitIds = System.Text.Json.JsonSerializer.Deserialize<long[]>(contract.school_unit_ids_json ?? "[]") ?? [];
        var schoolUnits = await db.SchoolUnits.AsNoTracking().Where(x => selectedUnitIds.Contains(x.Id))
            .Select(x => new { id = x.Id, name = x.Name }).ToArrayAsync(ct);
        var refundedTotal = await db.RevenueRefunds.AsNoTracking()
            .Where(x => x.ContractId == id).SumAsync(x => (decimal?)x.Amount, ct) ?? 0m;
        return Results.Ok(new { data = contract, schedules, receipts, refunded_total = refundedTotal,
            ledger, payouts, evidence, school_units = schoolUnits,
            timeline.current_period, timeline.next_confirmed_period, timeline.latest_confirmed_period,
            timeline.previous_period, timeline.period_history });
    }

    public sealed record SetServiceTermRequest(
        DateOnly? ServiceStartOn, DateOnly? ServiceEndOn, string? PaymentCycle);

    /// <summary>
    /// Admin may record a missing term once for a verified legacy contract.
    /// It is metadata only; no renewal, repricing, receipt, protection or commission mutation.
    /// </summary>
    public static async Task<IResult> SetServiceTerm(long id, SetServiceTermRequest request,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        // Legacy-only correction: regular Accountants may not set contract terms anymore.
        // Admin all-scope permission is required, retaining the existing one-time audit behavior.
        if (!access.All || !access.Has(Permissions.ChannelSalesRecordRevenue)) return Results.Forbid();
        if (!request.ServiceStartOn.HasValue)
            throw ApiValidationException.For("service_start_on", "Vui lòng chọn ngày bắt đầu dịch vụ theo hợp đồng.");
        if (!request.ServiceEndOn.HasValue)
            throw ApiValidationException.For("service_end_on", "Vui lòng chọn ngày kết thúc dịch vụ theo hợp đồng.");
        if (request.ServiceEndOn.Value < request.ServiceStartOn.Value)
            throw ApiValidationException.For("service_end_on", "Ngày kết thúc không được trước ngày bắt đầu.");
        var cycle = (request.PaymentCycle ?? "").Trim().ToUpperInvariant();
        if (cycle is not ("MONTHLY" or "YEARLY"))
            throw ApiValidationException.For("payment_cycle", "Chọn thanh toán theo tháng hoặc theo năm.");

        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, ct);
        var contract = await db.SalesContracts.FromSqlInterpolated(
            $"SELECT * FROM sales_contracts WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException();
        if (!await access.Contracts(db).AnyAsync(c => c.Id == id, ct) ||
            !access.CanManageOrganization(contract.OwnerOrganizationId) ||
            contract.VerifiedAt is null || contract.Status != "ACTIVE")
            throw new KeyNotFoundException();
        if (await db.ContractCancellations.AnyAsync(c => c.ContractId == id, ct))
            throw new ApiConflictException("Hợp đồng đã hủy, không thể thay đổi thời hạn dịch vụ.");
        var previous = new {
            service_start_on = contract.ServiceStartOn,
            service_end_on = contract.ServiceEndOn,
            payment_cycle = contract.PaymentCycle
        };
        // Existing legacy signed agreements are immutable; values can be recorded once
        // and cannot be silently overwritten by repeated requests.
        if (contract.ServiceStartOn.HasValue || contract.ServiceEndOn.HasValue || contract.PaymentCycle is not null)
        {
            if (contract.ServiceStartOn == request.ServiceStartOn &&
                contract.ServiceEndOn == request.ServiceEndOn &&
                contract.PaymentCycle == cycle)
                return Results.Ok(new { success = true });
            throw new ApiConflictException("Thời hạn dịch vụ đã ghi nhận. Muốn điều chỉnh cần quy trình sửa đổi hợp đồng có lưu vết riêng.");
        }
        contract.ServiceStartOn = request.ServiceStartOn;
        contract.ServiceEndOn = request.ServiceEndOn;
        contract.PaymentCycle = cycle;
        contract.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, access.UserId, "RECORD_CONTRACT_SERVICE_TERM", nameof(KidsfitCRM.Api.Domain.SalesContract),
            id, previous, new { service_start_on = contract.ServiceStartOn,
                service_end_on = contract.ServiceEndOn, payment_cycle = contract.PaymentCycle }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.Ok(new { success = true });
    }
}

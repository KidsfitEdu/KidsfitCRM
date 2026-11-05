using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>Contract-oriented accounting read model. All queries are scoped in SQL, never only in UI.</summary>
public static class AccountingContractEndpoints
{
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
                              personnel_type = contract.OwnerPersonnelType,
                              total_value = contract.TotalValue,
                              received = db.RevenueReceipts.Where(x => x.ContractId == contract.Id && x.Status == "COMPLETED").Sum(x => (decimal?)x.Amount) ?? 0,
                              refunded = db.RevenueRefunds.Where(x => x.ContractId == contract.Id).Sum(x => (decimal?)x.Amount) ?? 0,
                              commission = access.Commissions(db).Where(x => x.ContractId == contract.Id).Sum(x => (decimal?)x.Amount) ?? 0,
                              contract_status = contract.Status,
                          }).Skip((pageNumber - 1) * size).Take(size).ToArrayAsync(ct);
        return Results.Ok(new { data = rows, owners, total, page = pageNumber, page_size = size });
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
                                  // Long-term ownership is effective only after a separately approved KIDSFIT grant.
                                  // Never infer the entitlement from signature date or a not-yet-granted contract.
                                  protection_until = db.CustomerProtections
                                      .Where(p => p.ContractId == c.Id && p.SourceType == "CONTRACT" && p.Status == "ACTIVE")
                                      .OrderByDescending(p => p.EffectiveUntil)
                                      .Select(p => (DateTime?)p.EffectiveUntil)
                                      .FirstOrDefault(),
                                  total_value = c.TotalValue, evidence_reference = c.EvidenceReference,
                                  service_plan = c.ServicePlan, student_count = c.StudentCount,
                                  school_unit_ids_json = c.SchoolUnitIdsJson,
                                  owner_organization_id = c.OwnerOrganizationId
                              }).SingleOrDefaultAsync(ct);
        if (contract is null) throw new KeyNotFoundException();
        var schedules = await db.RevenueSchedules.AsNoTracking().Where(x => x.ContractId == id)
            .OrderBy(x => x.DueOn).Select(x => new { id = x.Id, due_on = x.DueOn,
                amount_due = x.AmountDue, amount_received = x.AmountReceived, status = x.Status }).ToArrayAsync(ct);
        var receipts = await db.RevenueReceipts.AsNoTracking().Where(x => x.ContractId == id && x.Status == "COMPLETED")
            .OrderByDescending(x => x.ReceivedAt).Select(x => new {
                id = x.Id, revenue_schedule_id = x.RevenueScheduleId, received_at = x.ReceivedAt,
                amount = x.Amount, reference_code = x.ReferenceCode, payment_method = x.PaymentMethod
            }).ToArrayAsync(ct);
        var ledger = await access.Commissions(db).AsNoTracking().Where(x => x.ContractId == id)
            .OrderBy(x => x.OccurredAt).Select(x => new {
                id = x.Id, entry_type = x.EntryType, amount = x.Amount,
                rate_percent = x.RatePercent, reason = x.Reason, occurred_at = x.OccurredAt,
                period = x.Period, beneficiary_user_id = x.BeneficiaryUserId,
                beneficiary_organization_id = x.BeneficiaryOrganizationId,
                assigned_to_payout = db.PayoutItems.Any(item => item.CommissionLedgerEntryId == x.Id),
                reconciled = db.ReconciliationCases.Any(caseItem => caseItem.ContractId == x.ContractId && caseItem.Status == "CONFIRMED")
            }).ToArrayAsync(ct);
        var payoutIds = db.PayoutItems.Where(x => access.Commissions(db).Any(e => e.Id == x.CommissionLedgerEntryId && e.ContractId == id)).Select(x => x.PayoutId);
        var payouts = await access.Payouts(db).AsNoTracking().Where(x => payoutIds.Contains(x.Id))
            .OrderByDescending(x => x.CreatedAt).Select(x => new {
                id = x.Id, code = x.Code, net_amount = x.NetAmount, status = x.Status,
                paid_at = x.PaidAt, payment_reference = x.PaymentReference
            }).ToArrayAsync(ct);
        var evidence = await db.FinancialEvidences.AsNoTracking().Where(x => x.ContractId == id && x.AttachedAt != null)
            .Select(x => new { id = x.Id, kind = x.Kind, file_name = x.FileName,
                revenue_receipt_id = x.RevenueReceiptId, payout_id = x.PayoutId }).ToArrayAsync(ct);
        var selectedUnitIds = System.Text.Json.JsonSerializer.Deserialize<long[]>(contract.school_unit_ids_json ?? "[]") ?? [];
        var schoolUnits = await db.SchoolUnits.AsNoTracking().Where(x => selectedUnitIds.Contains(x.Id))
            .Select(x => new { id = x.Id, name = x.Name }).ToArrayAsync(ct);
        return Results.Ok(new { data = contract, schedules, receipts, ledger, payouts, evidence, school_units = schoolUnits });
    }
}

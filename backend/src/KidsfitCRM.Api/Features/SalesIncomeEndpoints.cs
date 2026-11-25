using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>Personal, read-only commission history. Never accepts a beneficiary user id.</summary>
public static class SalesIncomeEndpoints
{
    public static async Task<IResult> Mine(HttpContext http, KidsfitDbContext db, string? period,
        CancellationToken ct, int page = 1, int pageSize = 20, string? search = null, string? beneficiaryRole = null)
    {
        var actor = http.UserId();
        var access = await ChannelSalesAccess.Load(db, actor, ct);
        if (!access.Has(Permissions.ChannelSalesCommissionView)) return Results.Forbid();
        // Only the authenticated beneficiary's ledger is visible. Separate personal
        // Sales and Manager entitlements, never return teammates' income.
        var selectedRole = beneficiaryRole is null or "" ? null : beneficiaryRole.ToUpperInvariant();
        if (selectedRole is not null && selectedRole != "SALES" && selectedRole != "MANAGER")
            return Results.BadRequest(new { message = "Vai trò hưởng hoa hồng không hợp lệ." });
        var selected = string.IsNullOrWhiteSpace(period) || period == "ALL"
            ? null : ChannelSalesValidation.Period(period);
        page = Math.Clamp(page, 1, 100000);
        pageSize = Math.Clamp(pageSize, 1, 100);

        // Beneficiary ID is the security boundary, not the current owner of the contract.
        // Historical commissions remain visible after an authorized staff transfer.
        var ledger = db.CommissionLedgerEntries.AsNoTracking()
            .Where(x => x.BeneficiaryUserId == actor);
        if (selected is not null) ledger = ledger.Where(x => x.Period == selected);
        if (selectedRole is not null) ledger = ledger.Where(x => x.BeneficiaryRole == selectedRole);

        var groups = from entry in ledger
                     join contract in db.SalesContracts.AsNoTracking() on entry.ContractId equals contract.Id
                     join school in db.ChannelCustomers.AsNoTracking() on contract.CustomerId equals school.Id
                     group entry by new { entry.ContractId, contract.ContractCode, school.DisplayName } into g
                     select new {
                         contract_id = g.Key.ContractId,
                         contract_code = g.Key.ContractCode,
                         school_name = g.Key.DisplayName,
                         commission = g.Sum(x => x.Amount),
                         entries = g.Count(),
                         rate_percent = g.Min(x => x.RatePercent) == g.Max(x => x.RatePercent)
                             ? (decimal?)g.Min(x => x.RatePercent) : null,
                         rate_is_mixed = g.Min(x => x.RatePercent) != g.Max(x => x.RatePercent),
                     };
        if (!string.IsNullOrWhiteSpace(search)) {
            var term = search.Trim();
            groups = groups.Where(x => x.school_name.Contains(term) || x.contract_code.Contains(term));
        }
        var total = await groups.CountAsync(ct);
        var selectedRows = await groups.OrderBy(x => x.school_name).ThenBy(x => x.contract_id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToArrayAsync(ct);
        var ids = selectedRows.Select(x => x.contract_id).ToArray();

        // Allocate the full payout before narrowing by contract/role/period.
        // Net paid and tax withholding are separate from gross settled amounts.
        var paidShares = (await LoadShares(db, actor, true, ct))
            .Where(x => x.BeneficiaryUserId == actor
                && (selected == null || x.Period == selected)
                && (selectedRole == null || x.BeneficiaryRole == selectedRole))
            .ToArray();
        var paidPerContract = paidShares.GroupBy(x => x.ContractId)
            .ToDictionary(g => g.Key, g => new {
                settled_gross = g.Sum(x => x.Gross),
                withholding = g.Sum(x => x.Withholding),
                paid = g.Sum(x => x.Net)
            });

        var payouts = await db.Payouts.AsNoTracking()
            .Where(x => x.BeneficiaryUserId == actor && (selected == null || x.Period == selected)
                && (selectedRole == null || x.BeneficiaryRole == selectedRole))
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new { id = x.Id, code = x.Code, period = x.Period,
                amount = x.NetAmount, status = x.Status, paid_at = x.PaidAt,
                payment_reference = x.PaymentReference })
            .Take(100).ToArrayAsync(ct);

        var accrued = await ledger.SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
        // All-page totals are derived from the same payout-item allocation as each row.
        var settledGross = paidShares.Sum(x => x.Gross);
        var withholding = paidShares.Sum(x => x.Withholding);
        var paid = paidShares.Sum(x => x.Net);
        return Results.Ok(new {
            period = selected ?? "ALL", page, page_size = pageSize, total,
            summary = new { accrued, settled_gross = settledGross,
                withholding, paid, unpaid = accrued - settledGross, contracts = total },
            data = selectedRows.Select(x => {
                paidPerContract.TryGetValue(x.contract_id, out var amounts);
                var settled = amounts?.settled_gross ?? 0m;
                return new {
                    x.contract_id, x.contract_code, x.school_name, x.commission,
                    x.rate_percent, x.rate_is_mixed,
                    settled_gross = settled, withholding = amounts?.withholding ?? 0m,
                    paid = amounts?.paid ?? 0m, unpaid = x.commission - settled,
                    x.entries
                };
            }),
            payouts
        });
    }
    public static async Task<IResult> Detail(long contractId, HttpContext http, KidsfitDbContext db,
        string? period, CancellationToken ct, string? beneficiaryRole = null)
    {
        var actor = http.UserId();
        var access = await ChannelSalesAccess.Load(db, actor, ct);
        if (!access.Has(Permissions.ChannelSalesCommissionView)) return Results.Forbid();
        var selectedRole = beneficiaryRole is null or "" ? null : beneficiaryRole.ToUpperInvariant();
        if (selectedRole is not null && selectedRole != "SALES" && selectedRole != "MANAGER")
            return Results.BadRequest(new { message = "Vai trò hưởng hoa hồng không hợp lệ." });
        var ledger = db.CommissionLedgerEntries.AsNoTracking()
            .Where(x => x.BeneficiaryUserId == actor && x.ContractId == contractId);
        if (selectedRole is not null) ledger = ledger.Where(x => x.BeneficiaryRole == selectedRole);
        if (!string.IsNullOrWhiteSpace(period) && period != "ALL") {
            var selected = ChannelSalesValidation.Period(period);
            ledger = ledger.Where(x => x.Period == selected);
        }
        if (!await ledger.AnyAsync(ct)) throw new KeyNotFoundException();
        var contract = await (from c in db.SalesContracts.AsNoTracking()
            join school in db.ChannelCustomers.AsNoTracking() on c.CustomerId equals school.Id
            where c.Id == contractId
            select new { contract_code = c.ContractCode, school_name = school.DisplayName,
                contract_value = c.TotalValue, contract_status = c.Status }).SingleAsync(ct);
        var entries = await (from entry in ledger
            orderby entry.OccurredAt descending, entry.Id descending
            select new { id = entry.Id, entry_type = entry.EntryType, amount = entry.Amount,
                calculation_base = entry.CalculationBase, rate_percent = entry.RatePercent,
                policy_code = entry.LegacyPolicyCode ?? entry.PolicySource,
                beneficiary_role = entry.BeneficiaryRole,
                board_policy_version_id = entry.BoardPolicyVersionId,
                period = entry.Period,
                occurred_at = entry.OccurredAt, reason = entry.Reason, receipt_id = entry.RevenueReceiptId
            }).ToArrayAsync(ct);
        var entryIds = entries.Select(e => e.id).ToArray();
        var paymentItems = await (
            from item in db.PayoutItems.AsNoTracking()
            join payout in db.Payouts.AsNoTracking() on item.PayoutId equals payout.Id
            where entryIds.Contains(item.CommissionLedgerEntryId) && payout.BeneficiaryUserId == actor
            select new { payout.Id, payout.Code, payout.Period, payout.Status,
                payout.PaidAt, payout.PaymentReference }
        ).Distinct().ToArrayAsync(ct);
        var payoutIds = paymentItems.Select(x => x.Id).Distinct().ToArray();
        var proofs = await db.FinancialEvidences.AsNoTracking()
            .Where(x => x.PayoutId.HasValue && payoutIds.Contains(x.PayoutId.Value)
                && x.Kind == "PAYOUT" && x.AttachedAt != null)
            .Select(x => new { x.Id, x.PayoutId, x.FileName }).ToArrayAsync(ct);
        var allShares = await LoadShares(db, actor, false, ct, payoutIds);
        var eligibleIds = entryIds.ToHashSet();
        var selectedShares = allShares.Where(x => eligibleIds.Contains(x.EntryId)
            && x.BeneficiaryUserId == actor).ToArray();
        var payments = paymentItems.GroupBy(x => x.Id).Select(group => {
            var first = group.First();
            var shares = selectedShares.Where(x => x.PayoutId == first.Id).ToArray();
            return new {
                id = first.Id, code = first.Code, period = first.Period,
                status = first.Status, paid_at = first.PaidAt,
                payment_reference = first.PaymentReference,
                allocated_gross = shares.Sum(x => x.Gross),
                allocated_withholding = shares.Sum(x => x.Withholding),
                allocated_amount = shares.Sum(x => x.Net),
                withholding_reason = shares.FirstOrDefault()?.WithholdingReason,
                evidence_id = proofs.FirstOrDefault(x => x.PayoutId == first.Id)?.Id,
                evidence_name = proofs.FirstOrDefault(x => x.PayoutId == first.Id)?.FileName
            };
        }).OrderByDescending(x => x.paid_at).ToArray();
        var receiptIds = entries.Where(x => x.receipt_id.HasValue)
            .Select(x => x.receipt_id!.Value).Distinct().ToArray();
        var receipts = await db.RevenueReceipts.AsNoTracking()
            .Where(x => receiptIds.Contains(x.Id) && x.Status == "COMPLETED")
            .OrderByDescending(x => x.ReceivedAt)
            .Select(x => new { id = x.Id, amount = x.Amount, received_at = x.ReceivedAt,
                reference_code = x.ReferenceCode }).ToArrayAsync(ct);
        var reconciliation = await db.ReconciliationCases.AsNoTracking()
            .Where(x => x.ContractId == contractId).Select(x => x.Status).FirstOrDefaultAsync(ct);
        return Results.Ok(new { contract, reconciliation_status = reconciliation,
            ledger = entries, receipts, payments });
    }

    private static async Task<IncomePayoutAllocation.Share[]> LoadShares(
        KidsfitDbContext db, long actor, bool paidOnly, CancellationToken ct, long[]? payoutIds = null)
    {
        // Select every item of an actor's payout, including other contracts, to
        // preserve the full gross/withholding/net totals before scoped filtering.
        var query = from item in db.PayoutItems.AsNoTracking()
                    join payout in db.Payouts.AsNoTracking() on item.PayoutId equals payout.Id
                    join entry in db.CommissionLedgerEntries.AsNoTracking()
                        on item.CommissionLedgerEntryId equals entry.Id
                    where payout.BeneficiaryUserId == actor
                    select new { payout, item, entry };
        if (payoutIds is { Length: 0 }) return [];
        if (payoutIds is not null) query = query.Where(x => payoutIds.Contains(x.payout.Id));
        if (paidOnly) query = query.Where(x => x.payout.Status == "PAID");
        var source = await query.Select(x => new IncomePayoutAllocation.Item(
            x.payout.Id, x.item.Id, x.entry.Id, x.entry.ContractId,
            x.entry.BeneficiaryUserId, x.entry.BeneficiaryRole, x.entry.Period,
            x.item.Amount, x.payout.GrossAmount, x.payout.WithholdingAmount,
            x.payout.WithholdingReason)).ToArrayAsync(ct);
        return IncomePayoutAllocation.Allocate(source);
    }

}

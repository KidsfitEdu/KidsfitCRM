using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>Personal, read-only commission history. Never accepts a beneficiary user id.</summary>
public static class SalesIncomeEndpoints
{
    public static async Task<IResult> Mine(HttpContext http, KidsfitDbContext db, string? period,
        CancellationToken ct, int page = 1, int pageSize = 20, string? search = null)
    {
        var actor = http.UserId();
        var access = await ChannelSalesAccess.Load(db, actor, ct);
        if (!access.Has(Permissions.ChannelSalesCommissionView)) return Results.Forbid();
        var selected = string.IsNullOrWhiteSpace(period) || period == "ALL"
            ? null : ChannelSalesValidation.Period(period);
        page = Math.Clamp(page, 1, 100000);
        pageSize = Math.Clamp(pageSize, 1, 100);

        // Beneficiary ID is the security boundary, not the current owner of the contract.
        // Historical commissions remain visible after an authorized staff transfer.
        var ledger = db.CommissionLedgerEntries.AsNoTracking()
            .Where(x => x.BeneficiaryUserId == actor);
        if (selected is not null) ledger = ledger.Where(x => x.Period == selected);

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
                     };
        if (!string.IsNullOrWhiteSpace(search)) {
            var term = search.Trim();
            groups = groups.Where(x => x.school_name.Contains(term) || x.contract_code.Contains(term));
        }
        var total = await groups.CountAsync(ct);
        var selectedRows = await groups.OrderBy(x => x.school_name).ThenBy(x => x.contract_id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToArrayAsync(ct);
        var ids = selectedRows.Select(x => x.contract_id).ToArray();

        // Payouts may include several contracts. Allocate a payout proportionally by ledger
        // item amounts. This is a display allocation, not an additional payment record.
        var allocated = await (
            from item in db.PayoutItems.AsNoTracking()
            join entry in db.CommissionLedgerEntries.AsNoTracking() on item.CommissionLedgerEntryId equals entry.Id
            join payout in db.Payouts.AsNoTracking() on item.PayoutId equals payout.Id
            where entry.BeneficiaryUserId == actor && ids.Contains(entry.ContractId)
                && payout.BeneficiaryUserId == actor
                && (selected == null || entry.Period == selected)
                && payout.Status == "PAID" && payout.GrossAmount > 0
            select new { entry.ContractId, item.Amount, payout.NetAmount, payout.GrossAmount }
        ).ToArrayAsync(ct);
        var paidPerContract = allocated.GroupBy(x => x.ContractId)
            .ToDictionary(g => g.Key, g => Math.Round(g.Sum(x => x.Amount * x.NetAmount / x.GrossAmount), 0));

        var payouts = await db.Payouts.AsNoTracking()
            .Where(x => x.BeneficiaryUserId == actor && (selected == null || x.Period == selected))
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new { id = x.Id, code = x.Code, period = x.Period,
                amount = x.NetAmount, status = x.Status, paid_at = x.PaidAt,
                payment_reference = x.PaymentReference })
            .Take(100).ToArrayAsync(ct);

        var accrued = await ledger.SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
        // Totals are computed independently of the current page and from actual paid items.
        var allPaid = await (
            from item in db.PayoutItems.AsNoTracking()
            join entry in ledger on item.CommissionLedgerEntryId equals entry.Id
            join payout in db.Payouts.AsNoTracking() on item.PayoutId equals payout.Id
            where payout.BeneficiaryUserId == actor && payout.Status == "PAID" && payout.GrossAmount > 0
            select new { item.Amount, payout.NetAmount, payout.GrossAmount }
        ).ToArrayAsync(ct);
        var paid = Math.Round(allPaid.Sum(x => x.Amount * x.NetAmount / x.GrossAmount), 0);
        return Results.Ok(new {
            period = selected ?? "ALL", page, page_size = pageSize, total,
            summary = new { accrued, paid, unpaid = accrued - paid, contracts = total },
            data = selectedRows.Select(x => new {
                x.contract_id, x.contract_code, x.school_name, x.commission,
                paid = paidPerContract.GetValueOrDefault(x.contract_id, 0m),
                unpaid = x.commission - paidPerContract.GetValueOrDefault(x.contract_id, 0m),
                x.entries
            }),
            payouts
        });
    }
    public static async Task<IResult> Detail(long contractId, HttpContext http, KidsfitDbContext db,
        string? period, CancellationToken ct)
    {
        var actor = http.UserId();
        var access = await ChannelSalesAccess.Load(db, actor, ct);
        if (!access.Has(Permissions.ChannelSalesCommissionView)) return Results.Forbid();
        var ledger = db.CommissionLedgerEntries.AsNoTracking()
            .Where(x => x.BeneficiaryUserId == actor && x.ContractId == contractId);
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
            join policy in db.CommissionPolicyVersions.AsNoTracking() on entry.PolicyVersionId equals policy.Id
            orderby entry.OccurredAt descending, entry.Id descending
            select new { id = entry.Id, entry_type = entry.EntryType, amount = entry.Amount,
                calculation_base = entry.CalculationBase, rate_percent = entry.RatePercent,
                policy_code = policy.Code, period = entry.Period,
                occurred_at = entry.OccurredAt, reason = entry.Reason, receipt_id = entry.RevenueReceiptId
            }).ToArrayAsync(ct);
        var entryIds = entries.Select(e => e.id).ToArray();
        var paymentItems = await (
            from item in db.PayoutItems.AsNoTracking()
            join payout in db.Payouts.AsNoTracking() on item.PayoutId equals payout.Id
            where entryIds.Contains(item.CommissionLedgerEntryId) && payout.BeneficiaryUserId == actor
            select new { payout.Id, payout.Code, payout.Period, payout.Status,
                payout.PaidAt, payout.PaymentReference, payout.NetAmount, payout.GrossAmount,
                item.Amount }
        ).ToArrayAsync(ct);
        var payoutIds = paymentItems.Select(x => x.Id).Distinct().ToArray();
        var proofs = await db.FinancialEvidences.AsNoTracking()
            .Where(x => x.PayoutId.HasValue && payoutIds.Contains(x.PayoutId.Value)
                && x.Kind == "PAYOUT" && x.AttachedAt != null)
            .Select(x => new { x.Id, x.PayoutId, x.FileName }).ToArrayAsync(ct);
        var payments = paymentItems.GroupBy(x => x.Id).Select(g => {
            var first = g.First();
            var allocation = first.GrossAmount > 0
                ? Math.Round(g.Sum(x => x.Amount * first.NetAmount / first.GrossAmount), 0)
                : 0m;
            return new { id = first.Id, code = first.Code, period = first.Period,
                status = first.Status, paid_at = first.PaidAt,
                payment_reference = first.PaymentReference, allocated_amount = allocation,
                evidence_id = proofs.FirstOrDefault(x => x.PayoutId == first.Id)?.Id,
                evidence_name = proofs.FirstOrDefault(x => x.PayoutId == first.Id)?.FileName };
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

}

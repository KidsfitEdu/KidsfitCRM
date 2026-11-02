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
}

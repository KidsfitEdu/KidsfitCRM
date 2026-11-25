namespace KidsfitCRM.Api.Features;

/// <summary>
/// Read-only distribution of a completed payout across its ledger items.
/// All items of the payout must be supplied before filtering by period/contract.
/// A largest-remainder split preserves whole-dong totals, including withholding.
/// </summary>
public static class IncomePayoutAllocation
{
    public sealed record Item(long PayoutId, long ItemId, long EntryId, long ContractId,
        long BeneficiaryUserId, string BeneficiaryRole, string Period, decimal Weight,
        decimal GrossAmount, decimal WithholdingAmount, string? WithholdingReason);

    public sealed record Share(long PayoutId, long EntryId, long ContractId,
        long BeneficiaryUserId, string BeneficiaryRole, string Period,
        decimal Gross, decimal Withholding, decimal Net, string? WithholdingReason);

    private static decimal[] Distribute(decimal amount, IReadOnlyList<Item> items)
    {
        var totalWeight = items.Sum(x => Math.Max(0m, x.Weight));
        if (items.Count == 0 || totalWeight <= 0m || amount < 0m)
            throw new InvalidOperationException("Invalid payout allocation source.");

        var result = new decimal[items.Count];
        var remainders = new (int Index, decimal Remainder)[items.Count];
        for (var i = 0; i < items.Count; i++)
        {
            var exact = amount * Math.Max(0m, items[i].Weight) / totalWeight;
            result[i] = decimal.Floor(exact);
            remainders[i] = (i, exact - result[i]);
        }

        // Payout amounts are validated as whole VND at creation/edit.
        var remainder = amount - result.Sum();
        foreach (var candidate in remainders.OrderByDescending(x => x.Remainder)
                     .ThenBy(x => items[x.Index].ItemId))
        {
            if (remainder < 1m) break;
            result[candidate.Index] += 1m;
            remainder -= 1m;
        }
        if (remainder != 0m) throw new InvalidOperationException("Payout contains fractional VND.");
        return result;
    }

    public static Share[] Allocate(IEnumerable<Item> source)
    {
        var output = new List<Share>();
        foreach (var group in source.GroupBy(x => x.PayoutId))
        {
            var items = group.OrderBy(x => x.ItemId).ToArray();
            var first = items[0];
            if (items.Any(x => x.GrossAmount != first.GrossAmount
                               || x.WithholdingAmount != first.WithholdingAmount))
                throw new InvalidOperationException("Inconsistent payout snapshot.");
            var gross = Distribute(first.GrossAmount, items);
            var withheld = Distribute(first.WithholdingAmount, items);
            for (var i = 0; i < items.Length; i++)
            {
                output.Add(new Share(items[i].PayoutId, items[i].EntryId, items[i].ContractId,
                    items[i].BeneficiaryUserId, items[i].BeneficiaryRole, items[i].Period,
                    gross[i], withheld[i], gross[i] - withheld[i], first.WithholdingReason));
            }
        }
        return output.ToArray();
    }
}

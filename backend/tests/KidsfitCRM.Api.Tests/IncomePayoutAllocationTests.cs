using KidsfitCRM.Api.Features;
using Xunit;

namespace KidsfitCRM.Api.Tests;

public sealed class IncomePayoutAllocationTests
{
    private static IncomePayoutAllocation.Item Item(long payout, long item, long contract,
        decimal weight, decimal gross, decimal withheld, string role = "SALES",
        string period = "2026-11") =>
        new(payout, item, item, contract, 101, role, period, weight, gross, withheld, "Thuế");

    [Fact]
    public void Paid_payout_deduction_is_not_outstanding_commission()
    {
        var share = Assert.Single(IncomePayoutAllocation.Allocate([
            Item(1, 1, 5, 950682m, 950682m, 100000m)
        ]));
        Assert.Equal(950682m, share.Gross);
        Assert.Equal(100000m, share.Withholding);
        Assert.Equal(850682m, share.Net);
        Assert.Equal(0m, 950682m - share.Gross);
    }

    [Fact]
    public void Split_payout_reconciles_whole_vnd_totals_and_contracts()
    {
        var result = IncomePayoutAllocation.Allocate([
            Item(1, 2, 7, 30m, 1000001m, 123457m),
            Item(1, 1, 5, 70m, 1000001m, 123457m),
        ]);
        Assert.Equal(1000001m, result.Sum(x => x.Gross));
        Assert.Equal(123457m, result.Sum(x => x.Withholding));
        Assert.Equal(876544m, result.Sum(x => x.Net));
        Assert.All(result, x => Assert.Equal(x.Gross - x.Withholding, x.Net));
        Assert.Equal(700001m, result.Single(x => x.ContractId == 5).Gross);
    }

    [Fact]
    public void Manual_gross_adjustment_does_not_rewrite_accrued_ledger()
    {
        var shares = IncomePayoutAllocation.Allocate([
            Item(1, 1, 5, 1000000m, 950000m, 100000m)
        ]);
        Assert.Equal(50000m, 1000000m - shares.Sum(x => x.Gross));
        Assert.Equal(850000m, shares.Sum(x => x.Net));
    }

    [Fact]
    public void Separate_paid_payouts_and_roles_preserve_each_scope()
    {
        var all = IncomePayoutAllocation.Allocate([
            Item(1, 1, 5, 1000m, 1000m, 100m),
            Item(2, 2, 6, 2000m, 2000m, 200m, "MANAGER"),
        ]);
        Assert.Equal(900m, all.Where(x => x.BeneficiaryRole == "SALES").Sum(x => x.Net));
        Assert.Equal(1800m, all.Where(x => x.BeneficiaryRole == "MANAGER").Sum(x => x.Net));
    }

    [Fact]
    public void Zero_withholding_keeps_paid_equal_to_gross()
    {
        var share = Assert.Single(IncomePayoutAllocation.Allocate([Item(1, 1, 5, 300000m, 300000m, 0m)]));
        Assert.Equal(300000m, share.Net);
        Assert.Equal(0m, share.Withholding);
    }
}

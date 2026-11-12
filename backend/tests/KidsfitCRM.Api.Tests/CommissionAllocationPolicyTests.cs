using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Features;

namespace KidsfitCRM.Api.Tests;

public sealed class CommissionAllocationPolicyTests
{
    private static CommissionAllocationVersion Rule(string scope, long? manager = null, long? sales = null, decimal ceiling = 30m) => new()
    {
        OrganizationId = 10, ManagerUserId = manager, SalesUserId = sales,
        Scope = scope, ConfiguredBy = "DIRECTOR", CeilingPercent = ceiling,
        SalesPercent = ceiling - 5m, ManagerPercent = 5m,
        EffectiveFrom = new DateOnly(2026, 11, 13), Status = "ACTIVE"
    };

    [Fact]
    public void Sales_specific_limit_overrides_manager_and_organization()
    {
        var org = Rule("ORGANIZATION", ceiling: 30m);
        var manager = Rule("MANAGER", manager: 20, ceiling: 36m);
        var sales = Rule("SALES", manager: 20, sales: 30, ceiling: 40m);
        var selected = CommissionAllocationEndpoints.ResolveBoard([org, manager, sales], 10, 20, 30);
        Assert.Same(sales, selected);
        Assert.Equal(40m, selected!.CeilingPercent);
    }

    [Fact]
    public void Manager_rule_is_inherited_by_new_sales_and_other_organizations_are_ignored()
    {
        var other = Rule("SALES", manager: 20, sales: 30, ceiling: 90m);
        other.OrganizationId = 11;
        var manager = Rule("MANAGER", manager: 20, ceiling: 36m);
        var selected = CommissionAllocationEndpoints.ResolveBoard([other, manager], 10, 20, 30);
        Assert.Same(manager, selected);
    }

    [Fact]
    public void Configuration_versions_do_not_require_existing_financial_entries()
    {
        var configuration = Rule("ORGANIZATION");
        Assert.Equal(30m, configuration.CeilingPercent);
        Assert.Equal(25m, configuration.SalesPercent);
        Assert.Equal(5m, configuration.ManagerPercent);
        Assert.Equal("DIRECTOR", configuration.ConfiguredBy);
    }
}

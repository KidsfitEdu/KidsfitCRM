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
    public void System_default_is_inherited_when_partner_has_no_own_rule()
    {
        var global = Rule("SYSTEM", ceiling: 30m);
        global.OrganizationId = 1; // KIDSFIT owner of shared default
        var selected = CommissionAllocationEndpoints.ResolveBoard([global], 10, 20, 30);
        Assert.Same(global, selected);
        Assert.Equal(25m, selected!.SalesPercent);
        Assert.Equal(5m, selected.ManagerPercent);
    }

    [Fact]
    public void Partner_override_takes_precedence_over_system_default()
    {
        var global = Rule("SYSTEM", ceiling: 30m);
        global.OrganizationId = 1;
        var partner = Rule("ORGANIZATION", ceiling: 36m);
        var selected = CommissionAllocationEndpoints.ResolveBoard([global, partner], 10, 20, 30);
        Assert.Same(partner, selected);
    }

    [Fact]
    public void Later_immediate_save_outlives_older_previously_scheduled_version()
    {
        var scheduled = Rule("ORGANIZATION", ceiling: 36m);
        scheduled.EffectiveFrom = new DateOnly(2026, 11, 20);
        scheduled.CreatedAt = new DateTime(2026, 11, 12, 1, 0, 0, DateTimeKind.Utc);
        var immediate = Rule("ORGANIZATION", ceiling: 30m);
        immediate.EffectiveFrom = new DateOnly(2026, 11, 12);
        immediate.CreatedAt = scheduled.CreatedAt.AddMinutes(3);
        Assert.Same(immediate, CommissionAllocationEndpoints.ResolveBoard([scheduled, immediate], 10, 20, 30));
    }

    [Fact]
    public void Manager_share_has_its_own_ceiling_and_may_use_less_than_total()
    {
        var limit = Rule("MANAGER", manager: 20, ceiling: 36m);
        limit.ManagerCeilingPercent = 11m;
        Assert.True(CommissionAllocationEndpoints.FitsWithin(limit, 25m, 11m));
        Assert.True(CommissionAllocationEndpoints.FitsWithin(limit, 20m, 8m));
        Assert.False(CommissionAllocationEndpoints.FitsWithin(limit, 24m, 12m));
        Assert.False(CommissionAllocationEndpoints.FitsWithin(limit, 30m, 11m));
    }

    [Fact]
    public void Same_day_replacement_is_ordered_by_server_timestamp_not_day_only()
    {
        var old = Rule("ORGANIZATION", ceiling: 30m);
        old.CreatedAt = new DateTime(2026, 11, 13, 2, 0, 0, DateTimeKind.Utc);
        var changed = Rule("ORGANIZATION", ceiling: 36m);
        changed.CreatedAt = old.CreatedAt.AddMinutes(1);
        Assert.Same(changed, CommissionAllocationEndpoints.ResolveBoard([old, changed], 10, 20, 30));
        Assert.Equal(30m, CommissionAllocationEndpoints.ResolveBoard([old], 10, 20, 30)!.CeilingPercent);
    }

    [Fact]
    public void Board_reset_restores_inherited_policy_without_erasing_old_record()
    {
        var global = Rule("SYSTEM", ceiling: 30m); global.OrganizationId = 1;
        var specific = Rule("MANAGER", manager: 20, ceiling: 36m);
        specific.CreatedAt = new DateTime(2026, 11, 13, 2, 0, 0, DateTimeKind.Utc);
        var reset = Rule("MANAGER", manager: 20); reset.Status = "RESET";
        reset.CreatedAt = specific.CreatedAt.AddMinutes(1);
        Assert.Same(global, CommissionAllocationEndpoints.ResolveBoard([global, specific, reset], 10, 20, 30));
    }

    [Fact]
    public void Manager_reset_disables_only_the_manager_specific_override()
    {
        var day = new DateOnly(2026, 11, 13);
        var old = Rule("SALES", manager: 20, sales: 30);
        old.ConfiguredBy = "MANAGER";
        old.CreatedAt = new DateTime(2026, 11, 13, 2, 0, 0, DateTimeKind.Utc);
        var reset = Rule("SALES", manager: 20, sales: 30);
        reset.ConfiguredBy = "MANAGER"; reset.Status = "RESET";
        reset.CreatedAt = old.CreatedAt.AddMinutes(1);
        Assert.Null(CommissionAllocationEndpoints.ResolveManager([old, reset], 10, 20, 30, day));
        Assert.Same(old, CommissionAllocationEndpoints.ResolveManager([old], 10, 20, 30, day));
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

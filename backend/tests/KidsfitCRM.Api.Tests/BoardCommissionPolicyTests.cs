using System.Text.Json;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Features;

namespace KidsfitCRM.Api.Tests;

public sealed class BoardCommissionPolicyTests
{
    private static BoardCommissionPolicyVersion Policy(
        string scope, decimal sales, decimal manager,
        long? organization = null, long? managerId = null, long? salesId = null,
        string status = "ACTIVE", int version = 1) => new()
    {
        Id = version, Scope = scope, OrganizationId = organization,
        ManagerUserId = managerId, SalesUserId = salesId,
        SalesPercent = sales, ManagerPercent = manager, Status = status,
        CreatedAt = new DateTime(2026, 11, 13, 0, 0, 0, DateTimeKind.Utc).AddMinutes(version)
    };

    [Fact]
    public void New_sales_without_specific_policy_inherits_25_and_5()
    {
        var result = BoardCommissionPolicyEndpoints.Resolve([], 10, 20, 30);
        Assert.Equal(25m, result.Sales);
        Assert.Equal(5m, result.Manager);
        Assert.Equal("SYSTEM_DEFAULT", result.Source);
    }

    [Fact]
    public void Sales_policy_wins_over_manager_and_system()
    {
        var policies = new[] {
            Policy("SYSTEM",25m,5m,version:1),
            Policy("MANAGER",30m,6m,10,20,version:2),
            Policy("SALES",20m,10m,10,salesId:30,version:3)
        };
        var first = BoardCommissionPolicyEndpoints.Resolve(policies,10,20,30);
        var second = BoardCommissionPolicyEndpoints.Resolve(policies,10,20,31);
        Assert.Equal((20m,10m), (first.Sales,first.Manager));
        Assert.Equal("SALES", first.Source);
        Assert.Equal((30m,6m), (second.Sales,second.Manager));
        Assert.Equal("MANAGER", second.Source);
    }

    [Fact]
    public void Two_sales_under_same_manager_may_have_different_splits()
    {
        var policies = new[] {
            Policy("SYSTEM",25m,5m,version:1),
            Policy("SALES",20m,10m,10,salesId:100,version:2),
            Policy("SALES",25m,5m,10,salesId:101,version:3)
        };
        var one = BoardCommissionPolicyEndpoints.Resolve(policies,10,20,100);
        var two = BoardCommissionPolicyEndpoints.Resolve(policies,10,20,101);
        Assert.Equal(10m, one.Manager);
        Assert.Equal(5m, two.Manager);
        Assert.Equal(30m, one.Sales+one.Manager);
        Assert.Equal(30m, two.Sales+two.Manager);
    }

    [Fact]
    public void Reset_sales_policy_inherits_manager_and_keeps_history()
    {
        var policies = new[] {
            Policy("SYSTEM",25m,5m,version:1),
            Policy("MANAGER",26m,4m,10,20,version:2),
            Policy("SALES",20m,10m,10,salesId:30,version:3),
            Policy("SALES",0m,0m,10,salesId:30,status:"RESET",version:4)
        };
        var result = BoardCommissionPolicyEndpoints.Resolve(policies,10,20,30);
        Assert.Equal("MANAGER", result.Source);
        Assert.Equal(26m, result.Sales);
        Assert.Equal(4, policies.Length);
    }

    [Fact]
    public void Same_day_updates_are_ordered_by_server_timestamp()
    {
        var old = Policy("SYSTEM",25m,5m,version:1);
        var newer = Policy("SYSTEM",24m,6m,version:2);
        var result = BoardCommissionPolicyEndpoints.Resolve([old,newer],10,20,30);
        Assert.Equal(24m,result.Sales);
        Assert.Equal(6m,result.Manager);
    }


    [Fact]
    public void Policy_snapshot_is_frozen_at_receipt_time()
    {
        var original = Policy("SYSTEM", 25m, 5m, version: 1);
        var later = Policy("SYSTEM", 20m, 10m, version: 2);
        var atFirst = BoardCommissionPolicyEndpoints.ResolveAt(
            [original, later], 10, 20, 30, original.CreatedAt.AddSeconds(1));
        var atSecond = BoardCommissionPolicyEndpoints.ResolveAt(
            [original, later], 10, 20, 30, later.CreatedAt.AddSeconds(1));
        Assert.Equal(25m, atFirst.Sales);
        Assert.Equal(5m, atFirst.Manager);
        Assert.Equal(20m, atSecond.Sales);
        Assert.Equal(10m, atSecond.Manager);
    }

    [Fact]
    public void Snake_case_request_binds_25_and_5()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        };
        var input = """
            {"scope":"SYSTEM","sales_percent":25,"manager_percent":5,"expected_version_id":1}
            """;
        var request = JsonSerializer.Deserialize<SaveBoardCommissionRequest>(input, options);
        Assert.NotNull(request);
        Assert.Equal(25m, request.SalesPercent);
        Assert.Equal(5m, request.ManagerPercent);
        Assert.Equal(1L, request.ExpectedVersionId);
    }

    [Fact]
    public void Missing_rates_remain_null_instead_of_silently_becoming_zero()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        };
        var request = JsonSerializer.Deserialize<SaveBoardCommissionRequest>("""{"scope":"SYSTEM"}""", options);
        Assert.NotNull(request);
        Assert.Null(request.SalesPercent);
        Assert.Null(request.ManagerPercent);
    }

    [Theory]
    [InlineData(25,5,true)]
    [InlineData(20,10,true)]
    [InlineData(0,0,true)]
    [InlineData(-1,5,false)]
    [InlineData(99,2,false)]
    [InlineData(25,101,false)]
    public void Rejects_invalid_rate_bounds_and_precision(int sales, int manager, bool valid) =>
        Assert.Equal(valid,BoardCommissionPolicyEndpoints.ValidRates(sales,manager));

    [Fact]
    public void Five_decimal_places_are_not_allowed() =>
        Assert.False(BoardCommissionPolicyEndpoints.ValidRates(25.12345m,5m));

    [Fact]
    public void Reset_only_affects_matching_organization_sales()
    {
        var policies = new[] {
            Policy("SYSTEM",25m,5m,version:1),
            Policy("SALES",20m,10m,10,salesId:30,version:2),
            Policy("SALES",0m,0m,10,salesId:30,status:"RESET",version:3)
        };
        Assert.Equal("SYSTEM",BoardCommissionPolicyEndpoints.Resolve(policies,10,20,30).Source);
        Assert.Equal("SYSTEM",BoardCommissionPolicyEndpoints.Resolve(policies,11,20,30).Source);
    }
}

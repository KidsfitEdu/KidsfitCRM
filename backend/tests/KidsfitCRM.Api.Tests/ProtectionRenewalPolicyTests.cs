using KidsfitCRM.Api.Infrastructure;
using Xunit;

namespace KidsfitCRM.Api.Tests;

public sealed class ProtectionRenewalPolicyTests
{
    private static readonly DateTime Expires = new(2026, 11, 10, 0, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void PriorityBeginsOnlyAfterFiveYearProtectionActuallyEnds()
    {
        var endDate = ProtectionRenewalPolicy.BusinessDay(Expires);
        Assert.False(ProtectionRenewalPolicy.ReservationApplies(Expires.AddMinutes(-1), Expires, endDate));
        Assert.True(ProtectionRenewalPolicy.ReservationApplies(Expires, Expires, endDate));
    }

    [Fact]
    public void PriorityLastsExactlyFifteenDays()
    {
        var serviceEnd = ProtectionRenewalPolicy.BusinessDay(Expires).AddDays(-1);
        Assert.True(ProtectionRenewalPolicy.ReservationApplies(Expires.AddDays(14), Expires, serviceEnd));
        Assert.False(ProtectionRenewalPolicy.ReservationApplies(Expires.AddDays(15), Expires, serviceEnd));
    }

    [Fact]
    public void UnrelatedServiceExpiryCannotReserveCustomer()
    {
        var unrelated = ProtectionRenewalPolicy.BusinessDay(Expires).AddMonths(-4);
        Assert.False(ProtectionRenewalPolicy.ReservationApplies(Expires.AddDays(1), Expires, unrelated));
    }

    [Fact]
    public void NoAutomaticFiveYearGrantOccursOnRequestWindow()
    {
        Assert.True(ProtectionRenewalPolicy.EligibleWindow(Expires.AddDays(-30), Expires));
        Assert.False(ProtectionRenewalPolicy.EligibleWindow(Expires.AddDays(-31), Expires));
        Assert.False(ProtectionRenewalPolicy.EligibleWindow(Expires.AddDays(15), Expires));
        Assert.Equal(Expires.AddDays(15), ProtectionRenewalPolicy.PriorityEnds(Expires));
    }
}

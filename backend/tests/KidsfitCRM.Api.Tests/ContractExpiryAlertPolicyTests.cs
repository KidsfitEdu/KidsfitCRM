using KidsfitCRM.Api.Infrastructure;
using Xunit;

namespace KidsfitCRM.Api.Tests;

public sealed class ContractExpiryAlertPolicyTests
{
    [Theory]
    [InlineData("SERVICE", 30, "SERVICE_BEFORE_30")]
    [InlineData("SERVICE", 15, "SERVICE_BEFORE_15")]
    [InlineData("SERVICE", 7, "SERVICE_BEFORE_7")]
    [InlineData("SERVICE", 0, "SERVICE_EXPIRED")]
    [InlineData("SERVICE", -30, "SERVICE_AFTER_30")]
    [InlineData("PROTECTION", 30, "PROTECTION_BEFORE_30")]
    [InlineData("PROTECTION", 7, "PROTECTION_BEFORE_7")]
    [InlineData("PROTECTION", 0, "PROTECTION_EXPIRED")]
    public void ReminderKindMatchesBusinessMilestone(string prefix, int daysBefore, string expected)
    {
        var end = new DateOnly(2027, 11, 5);
        var today = end.AddDays(-daysBefore);
        var events = ContractExpiryAlertService.Milestones(prefix, end, today).ToArray();
        Assert.Single(events);
        Assert.Equal(expected, events[0].Kind);
        Assert.Equal(today, events[0].DueOn);
    }

    [Fact]
    public void NonMilestoneDatesDoNotGenerateNewNotices()
    {
        var expires = new DateOnly(2027, 11, 5);
        Assert.Empty(ContractExpiryAlertService.Milestones("SERVICE", expires, expires.AddDays(-8)));
        Assert.Empty(ContractExpiryAlertService.Milestones("PROTECTION", expires, expires.AddDays(1)));
    }

    [Fact]
    public void VietnamBusinessDayUsesLocalDateRatherThanUtcDate()
    {
        var utc = new DateTime(2026, 11, 5, 18, 30, 0, DateTimeKind.Utc);
        Assert.Equal(new DateOnly(2026, 11, 6), ContractExpiryAlertService.BusinessDate(utc));
    }
}

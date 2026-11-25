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

    [Theory]
    [InlineData("GI01_THRESHOLD", null, null, "THRESHOLDREACHED", true, false)]
    [InlineData("GI01_THRESHOLD", "2026-11-25", null, "THRESHOLDREACHED", true, false)]
    [InlineData("GI01_THRESHOLD", "2026-11-25", "2026-11-26", "THRESHOLDREACHED", true, false)]
    [InlineData("GI01_THRESHOLD", "2026-11-25", "2026-11-25", null, true, false)]
    [InlineData("GI01_THRESHOLD", "2026-11-25", "2026-11-25", "CONTINUOUS", true, false)]
    [InlineData("GI01_THRESHOLD", "2026-11-25", "2026-11-25", "MISSINGSERVICETERM", true, false)]
    [InlineData("GI01_THRESHOLD", "2026-11-25", "2026-11-25", "THRESHOLDREACHED", false, false)]
    [InlineData("GI01_THRESHOLD", "2026-11-25", "2026-11-25", "THRESHOLDREACHED", true, true)]
    [InlineData("GI01_EXCEPTION_OVERDUE", "2026-11-25", "2026-11-25", "EXCEPTION_OVERDUE", false, true)]
    [InlineData("GI01_EXCEPTION_OVERDUE", "2026-11-25", "2026-11-25", "EXCEPTION_CONFIG_REQUIRED", true, false)]
    [InlineData("GI01_CONFIG_REQUIRED", "2026-11-25", "2026-11-25", "EXCEPTION_CONFIG_REQUIRED", false, true)]
    [InlineData("GI01_CONFIG_REQUIRED", "2026-11-25", "2026-11-25", "EXCEPTION_OVERDUE", true, false)]
    public void Gi01NoticeValidityRequiresMatchingThresholdAndStatus(
        string kind, string? milestone, string? threshold, string? status,
        bool activeRecipient, bool expected)
    {
        var milestoneOn = milestone is null ? (DateOnly?)null : DateOnly.Parse(milestone);
        var thresholdOn = threshold is null ? (DateOnly?)null : DateOnly.Parse(threshold);
        Assert.Equal(expected, ContractExpiryAlertService.IsGi01NoticeApplicable(
            kind, milestoneOn, thresholdOn, status, activeRecipient));
    }

    [Fact]
    public void VietnamBusinessDayUsesLocalDateRatherThanUtcDate()
    {
        var utc = new DateTime(2026, 11, 5, 18, 30, 0, DateTimeKind.Utc);
        Assert.Equal(new DateOnly(2026, 11, 6), ContractExpiryAlertService.BusinessDate(utc));
    }

}

using KidsfitCRM.Api.Infrastructure;
using Xunit;

namespace KidsfitCRM.Api.Tests;

public sealed class ServiceInterruptionPolicyTests
{
    private static readonly DateOnly Start = new(2025, 1, 1);
    private static readonly DateOnly End = new(2025, 12, 31);

    [Fact]
    public void OneDayAfterExpirationIsNotTwelveMonths()
    {
        var result = ServiceInterruptionPolicy.Evaluate(new(2026, 1, 1), Start, End, []);
        Assert.Equal(ServiceInterruptionPolicy.AssessmentStatus.Interrupted, result.Status);
        Assert.Equal(new DateOnly(2027, 1, 1), result.ThresholdOn);
        Assert.False(result.CanAutomaticallyRelease);
    }

    [Fact]
    public void TwelveCalendarMonthsIsExactInclusiveBusinessBoundary()
    {
        var result = ServiceInterruptionPolicy.Evaluate(new(2027, 1, 1), Start, End, []);
        Assert.Equal(ServiceInterruptionPolicy.AssessmentStatus.ThresholdReached, result.Status);
        Assert.True(result.CanAutomaticallyRelease);
    }

    [Fact]
    public void ConfirmedFutureTermDoesNotEraseCurrentGap()
    {
        var future = new ServiceInterruptionPolicy.ServicePeriod(new(2027, 2, 1), new(2028, 1, 31));
        var result = ServiceInterruptionPolicy.Evaluate(new(2027, 1, 1), Start, End, [future]);
        Assert.Equal(ServiceInterruptionPolicy.AssessmentStatus.ThresholdReached, result.Status);
        Assert.Equal(new DateOnly(2027, 2, 1), result.NextServiceStartOn);
    }

    [Fact]
    public void ValidRenewalResetsTheCurrentInterruption()
    {
        var renewal = new ServiceInterruptionPolicy.ServicePeriod(new(2026, 9, 1), new(2027, 8, 31));
        var result = ServiceInterruptionPolicy.Evaluate(new(2026, 10, 1), Start, End, [renewal]);
        Assert.Equal(ServiceInterruptionPolicy.AssessmentStatus.Continuous, result.Status);
        Assert.False(result.CanAutomaticallyRelease);
    }

    [Fact]
    public void PastQualifyingGapMustBeReviewedNotAutomaticallyReleased()
    {
        var later = new ServiceInterruptionPolicy.ServicePeriod(new(2027, 3, 1), new(2028, 2, 29));
        var result = ServiceInterruptionPolicy.Evaluate(new(2027, 4, 1), Start, End, [later]);
        Assert.Equal(ServiceInterruptionPolicy.AssessmentStatus.HistoricalThresholdRequiresReview, result.Status);
        Assert.False(result.CanAutomaticallyRelease);
    }

    [Fact]
    public void MissingLegacyDatesAreNotAssumed()
    {
        var result = ServiceInterruptionPolicy.Evaluate(new(2027, 1, 1), null, End, []);
        Assert.Equal(ServiceInterruptionPolicy.AssessmentStatus.MissingServiceTerm, result.Status);
        Assert.False(result.CanAutomaticallyRelease);
    }

    [Fact]
    public void AdjacentPeriodsCountAsContinuousEvenOnLeapYears()
    {
        var renewal = new ServiceInterruptionPolicy.ServicePeriod(new(2026, 1, 1), new(2026, 12, 31));
        var result = ServiceInterruptionPolicy.Evaluate(new(2026, 6, 1), Start, End, [renewal]);
        Assert.Equal(ServiceInterruptionPolicy.AssessmentStatus.Continuous, result.Status);
    }

    [Fact]
    public void WarningsMatchApprovedMilestones()
    {
        var alerts = ServiceInterruptionPolicy.WarningMilestones(new(2027, 1, 1));
        Assert.Equal(new[] { 30, 15, 7, 0 }, alerts.Select(x => x.DaysBefore));
        Assert.Equal(new DateOnly(2026, 12, 2), alerts[0].DueOn);
    }

    [Fact]
    public void CompletedShortGapDoesNotTriggerHistoricalReview()
    {
        var renewal = new ServiceInterruptionPolicy.ServicePeriod(new(2026, 7, 1), new(2027, 6, 30));
        var result = ServiceInterruptionPolicy.Evaluate(new(2027, 2, 1), Start, End, [renewal]);
        Assert.Equal(ServiceInterruptionPolicy.AssessmentStatus.Continuous, result.Status);
    }
}

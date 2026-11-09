namespace KidsfitCRM.Api.Infrastructure;

/// <summary>
/// GI-01 calendar policy. Dates represent inclusive, Accounting-confirmed service days
/// in the Asia/Ho_Chi_Minh business calendar. It does not mutate rights or contracts.
/// A previously completed twelve-month gap is flagged for review, never silently
/// backdated into a new ownership decision.
/// </summary>
public static class ServiceInterruptionPolicy
{
    public readonly record struct ServicePeriod(DateOnly StartOn, DateOnly EndOn);
    public enum AssessmentStatus
    {
        MissingServiceTerm,
        Continuous,
        Interrupted,
        ThresholdReached,
        HistoricalThresholdRequiresReview
    }

    public sealed record Assessment(
        AssessmentStatus Status,
        DateOnly? GapStartOn,
        DateOnly? ThresholdOn,
        DateOnly? NextServiceStartOn)
    {
        public bool CanAutomaticallyRelease => Status == AssessmentStatus.ThresholdReached;
    }

    public static Assessment Evaluate(
        DateOnly today,
        DateOnly? originalStart,
        DateOnly? originalEnd,
        IEnumerable<ServicePeriod> confirmedRenewals)
    {
        ArgumentNullException.ThrowIfNull(confirmedRenewals);
        if (!originalStart.HasValue || !originalEnd.HasValue
            || originalEnd.Value < originalStart.Value)
            return new(AssessmentStatus.MissingServiceTerm, null, null, null);

        var periods = new List<ServicePeriod> { new(originalStart.Value, originalEnd.Value) };
        foreach (var period in confirmedRenewals)
        {
            if (period.EndOn < period.StartOn)
                return new(AssessmentStatus.MissingServiceTerm, null, null, null);
            periods.Add(period);
        }

        var sorted = periods.OrderBy(p => p.StartOn).ThenBy(p => p.EndOn).ToArray();
        var end = sorted[0].EndOn;
        for (var i = 1; i < sorted.Length; i++)
        {
            var next = sorted[i];
            // Adjacent inclusive service periods form an uninterrupted chain.
            if (next.StartOn <= end.AddDays(1))
            {
                if (next.EndOn > end) end = next.EndOn;
                continue;
            }

            var gapStart = end.AddDays(1);
            var threshold = gapStart.AddMonths(12);
            // A future signed period does not erase its preceding gap.
            if (today >= gapStart && today < next.StartOn)
                return new(today >= threshold ? AssessmentStatus.ThresholdReached
                        : AssessmentStatus.Interrupted, gapStart, threshold, next.StartOn);

            // A previously completed gap must not retroactively revoke rights.
            if (next.StartOn >= threshold && today >= next.StartOn)
                return new(AssessmentStatus.HistoricalThresholdRequiresReview,
                    gapStart, threshold, next.StartOn);

            end = next.EndOn;
        }

        if (today <= end) return new(AssessmentStatus.Continuous, null, null, null);
        var currentStart = end.AddDays(1);
        var currentThreshold = currentStart.AddMonths(12);
        return new(today >= currentThreshold ? AssessmentStatus.ThresholdReached
                : AssessmentStatus.Interrupted, currentStart, currentThreshold, null);
    }

    public static IReadOnlyList<(int DaysBefore, DateOnly DueOn)> WarningMilestones(DateOnly threshold) =>
        new[] { 30, 15, 7, 0 }
            .Select(days => (DaysBefore: days, DueOn: threshold.AddDays(-days)))
            .ToArray();
}

using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Features.Schools.Extensions;

namespace KidsfitCRM.Api.Tests;

public sealed class SchoolExtensionLimitPolicyTests
{
    private static readonly DateTime Registered = new(2026, 11, 20, 0, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime ProtectedUntil = Registered.AddHours(120);

    [Fact]
    public void Maximum_uses_shorter_of_per_request_and_cumulative_limit()
    {
        Assert.Equal(ProtectedUntil.AddDays(7),
            SchoolExtensionLimitPolicy.MaximumUntil(Registered, ProtectedUntil, 7, 21));
        var previouslyExtended = ProtectedUntil.AddDays(18);
        Assert.Equal(ProtectedUntil.AddDays(21),
            SchoolExtensionLimitPolicy.MaximumUntil(Registered, previouslyExtended, 7, 21));
    }

    [Fact]
    public void Exhausted_extension_window_preserves_conflict()
    {
        var current = ProtectedUntil.AddDays(21);
        var maximum = SchoolExtensionLimitPolicy.MaximumUntil(Registered, current, 7, 21);
        Assert.Throws<ApiConflictException>(() =>
            SchoolExtensionLimitPolicy.EnsureRequestWindow(current, maximum));
    }

    [Fact]
    public void Requested_limit_preserves_validation_field()
    {
        var maximum = ProtectedUntil.AddDays(7);
        var ex = Assert.Throws<ApiValidationException>(() =>
            SchoolExtensionLimitPolicy.EnsureRequestedUntil(maximum.AddTicks(1), maximum));
        Assert.Contains("requested_until", ex.Errors.Keys);
        SchoolExtensionLimitPolicy.EnsureRequestedUntil(maximum, maximum);
    }

    [Fact]
    public void Approval_at_exact_limits_is_allowed()
    {
        SchoolExtensionLimitPolicy.EnsureApprovedWithinLimits(
            ProtectedUntil.AddDays(7), ProtectedUntil, Registered,
            ProtectedUntil.AddDays(7), ProtectedUntil.AddDays(7),
            7, 21, 2, 3);
    }

    [Fact]
    public void Approval_cannot_exceed_request_or_policy_window()
    {
        var ex = Assert.Throws<ApiValidationException>(() =>
            SchoolExtensionLimitPolicy.EnsureApprovedWithinLimits(
                ProtectedUntil.AddDays(6), ProtectedUntil, Registered,
                ProtectedUntil.AddDays(7), ProtectedUntil.AddDays(7),
                7, 21, 0, 3));
        Assert.Contains("approved_until", ex.Errors.Keys);
    }

    [Fact]
    public void Approval_rejects_exhausted_count()
    {
        var ex = Assert.Throws<ApiValidationException>(() =>
            SchoolExtensionLimitPolicy.EnsureApprovedWithinLimits(
                ProtectedUntil.AddDays(7), ProtectedUntil, Registered,
                ProtectedUntil.AddDays(7), ProtectedUntil.AddDays(7),
                7, 21, 3, 3));
        Assert.Contains("approved_until", ex.Errors.Keys);
    }

    [Fact]
    public void Approval_rejects_review_after_end()
    {
        var ex = Assert.Throws<ApiValidationException>(() =>
            SchoolExtensionLimitPolicy.EnsureApprovedWithinLimits(
                ProtectedUntil.AddDays(7), ProtectedUntil, Registered,
                ProtectedUntil.AddDays(7), ProtectedUntil.AddDays(8),
                7, 21, 0, 3));
        Assert.Contains("next_review_at", ex.Errors.Keys);
    }

    [Fact]
    public void Approval_rejects_exceeding_cumulative_limit()
    {
        var current = ProtectedUntil.AddDays(20);
        var ex = Assert.Throws<ApiValidationException>(() =>
            SchoolExtensionLimitPolicy.EnsureApprovedWithinLimits(
                ProtectedUntil.AddDays(22), current, Registered,
                ProtectedUntil.AddDays(22), ProtectedUntil.AddDays(22),
                7, 21, 1, 3));
        Assert.Contains("approved_until", ex.Errors.Keys);
    }
}

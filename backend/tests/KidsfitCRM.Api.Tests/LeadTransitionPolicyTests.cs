using KidsfitCRM.Api.Features;

namespace KidsfitCRM.Api.Tests;

public sealed class LeadTransitionPolicyTests
{
    [Theory]
    [InlineData("NEW", "CONTACTED")]
    [InlineData("NEW", "LOST")]
    [InlineData("CONTACTED", "QUALIFIED")]
    [InlineData("TRIAL_COMPLETED", "CONSIDERING")]
    [InlineData("LOST", "NEW")]
    public void Allows_supported_transitions(string from, string to) => Assert.True(LeadTransitionPolicy.Allows(from, to));

    [Theory]
    [InlineData("NEW", "WON")]
    [InlineData("QUALIFIED", "TRIAL_BOOKED")]
    [InlineData("CONSIDERING", "WON")]
    [InlineData("WON", "NEW")]
    public void Rejects_transitions_that_require_a_business_action(string from, string to) => Assert.False(LeadTransitionPolicy.Allows(from, to));
}

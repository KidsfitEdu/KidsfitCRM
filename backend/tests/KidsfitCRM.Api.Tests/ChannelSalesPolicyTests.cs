using KidsfitCRM.Api.Features;

namespace KidsfitCRM.Api.Tests;

public sealed class ChannelSalesPolicyTests
{
    [Theory]
    [InlineData("2026-00")]
    [InlineData("2026-13")]
    [InlineData("2026-1")]
    [InlineData("anything")]
    public void Invalid_financial_period_is_rejected(string period) => Assert.Throws<KidsfitCRM.Api.Common.ApiValidationException>(() => ChannelSalesValidation.Period(period));

    [Theory]
    [InlineData(0.4)]
    [InlineData(-1)]
    [InlineData(0)]
    public void Money_requires_positive_whole_dong(decimal amount) => Assert.Throws<KidsfitCRM.Api.Common.ApiValidationException>(() => ChannelSalesValidation.WholeDong(amount, "amount"));

    [Fact]
    public void Period_uses_Vietnam_business_midnight() => Assert.Equal("2026-11", ChannelSalesValidation.BusinessPeriod(new DateTime(2026, 10, 31, 17, 0, 0, DateTimeKind.Utc)));

    [Theory]
    [InlineData(false, false, "AVAILABLE")]
    [InlineData(false, true, "APPROACHING")]
    [InlineData(true, false, "CONTRACTED")]
    [InlineData(true, true, "CONTRACTED")]
    public void Visible_status_is_derived_from_active_protection(bool contractProtection, bool approachProtection, string expected) =>
        Assert.Equal(expected, ChannelCustomerStatusPolicy.Calculate(contractProtection, approachProtection));
}

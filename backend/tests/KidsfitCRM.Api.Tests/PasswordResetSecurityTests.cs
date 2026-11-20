using KidsfitCRM.Api.Features;

namespace KidsfitCRM.Api.Tests;

public sealed class PasswordResetSecurityTests
{
    [Fact]
    public void OtpIsAlwaysSixAsciiDigitsAndContainsLeadingZeroes()
    {
        for (var i = 0; i < 500; i++)
        {
            var code = PasswordResetFeatures.NewOtp();
            Assert.Equal(6, code.Length);
            Assert.All(code, digit => Assert.InRange(digit, '0', '9'));
        }
    }

    [Fact]
    public void OtpDigestUsesChallengeAndSeparateSecret()
    {
        var first = PasswordResetFeatures.HashOtp(new string('a', 32), "challenge-1", "012345");
        var second = PasswordResetFeatures.HashOtp(new string('a', 32), "challenge-2", "012345");
        var third = PasswordResetFeatures.HashOtp(new string('b', 32), "challenge-1", "012345");
        Assert.Equal(64, first.Length);
        Assert.NotEqual(first, second);
        Assert.NotEqual(first, third);
        Assert.True(PasswordResetFeatures.EqualHex(first, PasswordResetFeatures.HashOtp(new string('a', 32), "challenge-1", "012345")));
        Assert.False(PasswordResetFeatures.EqualHex(first, PasswordResetFeatures.HashOtp(new string('a', 32), "challenge-1", "012346")));
    }

    [Fact]
    public void ResetTicketUsesCryptographicallyRandomOpaqueToken()
    {
        var ticket1 = PasswordResetFeatures.NewToken();
        var ticket2 = PasswordResetFeatures.NewToken();
        Assert.Equal(64, ticket1.Length);
        Assert.NotEqual(ticket1, ticket2);
        Assert.Equal(64, PasswordResetFeatures.HashToken(ticket1).Length);
        Assert.NotEqual(ticket1, PasswordResetFeatures.HashToken(ticket1));
        Assert.False(PasswordResetFeatures.EqualHex(null, PasswordResetFeatures.HashToken(ticket1)));
    }

    [Theory]
    [InlineData("TEAM@kidsfit.vn", "team@kidsfit.vn")]
    [InlineData("  Team@KIDSFIT.vn  ", "team@kidsfit.vn")]
    public void NormalizeEmailHandlesCaseAndWhitespace(string email, string expected)
    {
        Assert.Equal(expected, PasswordResetFeatures.NormalizeEmail(email));
        Assert.True(PasswordResetFeatures.IsEmailValid(expected));
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    [InlineData("a@b")]
    public void InvalidEmailsAreRejected(string email)
    {
        Assert.False(PasswordResetFeatures.IsEmailValid(email));
    }
}

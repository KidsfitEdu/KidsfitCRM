using KidsfitCRM.Api.Features;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using KidsfitCRM.Api.Domain;

namespace KidsfitCRM.Api.Tests;

public sealed class PasswordResetMySqlTests(ChannelMySqlFixture fixture) : IClassFixture<ChannelMySqlFixture>
{
    private sealed class CaptureEmailSender : IPasswordResetMailSender
    {
        public string? LastRecipient { get; private set; }
        public string? LastCode { get; private set; }
        public Task SendOtpAsync(string destination, string code, CancellationToken cancellationToken)
        {
            LastRecipient = destination;
            LastCode = code;
            return Task.CompletedTask;
        }
    }

    private static IConfiguration Settings() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["PasswordReset:HmacKey"] = "test-only-ephemeral-32-byte-plus-hmac-secret"
        }).Build();

    [MySqlFact]
    public async Task OTPResetsPasswordOnceAndChangesSecurityStamp()
    {
        var email = "admin@kidsfit.vn";
        var mailer = new CaptureEmailSender();
        var config = Settings();

        await using (var db = fixture.Open())
        {
            await PasswordResetFeatures.Forgot(new ForgotPasswordRequest(email), db, config, mailer,
                NullLoggerFactory.Instance, CancellationToken.None);
        }
        Assert.Equal(email, mailer.LastRecipient);
        Assert.Matches("^[0-9]{6}$", mailer.LastCode!);

        string ticket;
        await using (var db = fixture.Open())
        {
            var verified = await PasswordResetFeatures.Verify(
                new VerifyPasswordOtpRequest(email, mailer.LastCode), db, config, CancellationToken.None);
            // Verify returns a Results.Ok<T> whose public Value contains reset_token.
            var body = System.Text.Json.JsonSerializer.Serialize(((Microsoft.AspNetCore.Http.IValueHttpResult)verified).Value);
            using var json = System.Text.Json.JsonDocument.Parse(body);
            ticket = json.RootElement.GetProperty("reset_token").GetString()!;
        }

        var hasher = new PasswordHasher<User>();
        await using (var db = fixture.Open())
        {
            var before = await db.Users.AsNoTracking().SingleAsync(x => x.Email == email);
            var oldPasswordHash = before.Password;
            var oldStamp = before.SecurityStamp;
            await PasswordResetFeatures.Reset(
                new ResetPasswordRequest(email, ticket, "Replacement-Password-Only-For-Test!", "Replacement-Password-Only-For-Test!"),
                db, hasher, CancellationToken.None);
            var after = await db.Users.AsNoTracking().SingleAsync(x => x.Email == email);
            Assert.NotEqual(oldPasswordHash, after.Password);
            Assert.NotEqual(oldStamp, after.SecurityStamp);
            Assert.Equal(PasswordVerificationResult.Success,
                hasher.VerifyHashedPassword(after, after.Password, "Replacement-Password-Only-For-Test!"));
        }

        await using (var db = fixture.Open())
        {
            var reused = await PasswordResetFeatures.Reset(
                new ResetPasswordRequest(email, ticket, "Second-Password-Only-For-Test!", "Second-Password-Only-For-Test!"),
                db, hasher, CancellationToken.None);
            Assert.IsAssignableFrom<Microsoft.AspNetCore.Http.IStatusCodeHttpResult>(reused);
            Assert.Equal(400, ((Microsoft.AspNetCore.Http.IStatusCodeHttpResult)reused).StatusCode);
        }
    }

    [MySqlFact]
    public async Task UnknownAddressReturnsGenericAndDoesNotSend()
    {
        var mailer = new CaptureEmailSender();
        await using var db = fixture.Open();
        var result = await PasswordResetFeatures.Forgot(
            new ForgotPasswordRequest("nobody@example.net"), db, Settings(), mailer,
            NullLoggerFactory.Instance, CancellationToken.None);
        Assert.Null(mailer.LastCode);
        Assert.Equal(200, ((Microsoft.AspNetCore.Http.IStatusCodeHttpResult)result).StatusCode);
    }
}

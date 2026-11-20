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

    private sealed class SimulatedMailer(bool fail = false) : IPasswordResetMailSender
    {
        private int _count;
        public int Count => Volatile.Read(ref _count);
        public string? Code { get; private set; }
        public Task SendOtpAsync(string recipient, string otp, CancellationToken ct)
        {
            Interlocked.Increment(ref _count);
            if (fail) throw new InvalidOperationException("Synthetic SMTP failure (test only).");
            Code = otp;
            return Task.CompletedTask;
        }
    }

    private static async Task ClearAdminChallenges(KidsfitDbContext db)
    {
        var id = await db.Users.Where(x => x.Email == "admin@kidsfit.vn").Select(x => x.Id).SingleAsync();
        var challenges = await db.PasswordResetChallenges.Where(x => x.UserId == id).ToListAsync();
        db.PasswordResetChallenges.RemoveRange(challenges);
        await db.SaveChangesAsync();
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
    [MySqlFact]
    public async Task ResendBeforeCooldownDoesNotSendAndOriginalOtpStillWorks()
    {
        const string email = "admin@kidsfit.vn";
        var mailer = new SimulatedMailer();
        await using (var db = fixture.Open())
        {
            await ClearAdminChallenges(db);
            await PasswordResetFeatures.Forgot(new ForgotPasswordRequest(email), db, Settings(), mailer,
                NullLoggerFactory.Instance, CancellationToken.None);
            await PasswordResetFeatures.Forgot(new ForgotPasswordRequest(email), db, Settings(), mailer,
                NullLoggerFactory.Instance, CancellationToken.None);
            Assert.Equal(1, mailer.Count);
            var result = await PasswordResetFeatures.Verify(
                new VerifyPasswordOtpRequest(email, mailer.Code), db, Settings(), CancellationToken.None);
            Assert.Equal(200, ((Microsoft.AspNetCore.Http.IStatusCodeHttpResult)result).StatusCode);
        }
    }

    [MySqlFact]
    public async Task ResendAfterCooldownCreatesNewOtpAndConsumesPreviousChallenge()
    {
        const string email = "admin@kidsfit.vn";
        var mailer = new SimulatedMailer();
        await using var db = fixture.Open();
        await ClearAdminChallenges(db);
        await PasswordResetFeatures.Forgot(new ForgotPasswordRequest(email), db, Settings(), mailer,
            NullLoggerFactory.Instance, CancellationToken.None);
        var first = await db.PasswordResetChallenges.OrderByDescending(x => x.Id).FirstAsync();
        first.CreatedAt = DateTime.UtcNow.AddSeconds(-65);
        await db.SaveChangesAsync();

        await PasswordResetFeatures.Forgot(new ForgotPasswordRequest(email), db, Settings(), mailer,
            NullLoggerFactory.Instance, CancellationToken.None);
        Assert.Equal(2, mailer.Count);
        await db.Entry(first).ReloadAsync();
        Assert.NotNull(first.ConsumedAt);
        Assert.Equal(1, await db.PasswordResetChallenges.CountAsync(x => x.UserId == first.UserId && x.ConsumedAt == null));
    }

    [MySqlFact]
    public async Task FiveChallengesWithinFifteenMinutesPreventAnotherSend()
    {
        const string email = "admin@kidsfit.vn";
        await using var db = fixture.Open();
        await ClearAdminChallenges(db);
        var userId = await db.Users.Where(x => x.Email == email).Select(x => x.Id).SingleAsync();
        var now = DateTime.UtcNow;
        for (var i = 0; i < 5; i++)
        {
            db.PasswordResetChallenges.Add(new PasswordResetChallenge
            {
                UserId = userId, PublicId = Guid.NewGuid().ToString("N"),
                OtpDigest = new string('A', 64), CreatedAt = now.AddMinutes(-i - 2),
                UpdatedAt = now.AddMinutes(-i - 2), ExpiresAt = now.AddMinutes(-i + 3),
                ConsumedAt = now.AddMinutes(-i - 1)
            });
        }
        await db.SaveChangesAsync();
        var mailer = new SimulatedMailer();
        var result = await PasswordResetFeatures.Forgot(new ForgotPasswordRequest(email), db, Settings(), mailer,
            NullLoggerFactory.Instance, CancellationToken.None);
        Assert.Equal(200, ((Microsoft.AspNetCore.Http.IStatusCodeHttpResult)result).StatusCode);
        Assert.Equal(0, mailer.Count);
        Assert.Equal(5, await db.PasswordResetChallenges.CountAsync(x => x.UserId == userId));
    }

    [MySqlFact]
    public async Task FailedSmtpResendKeepsOldOtpValidAndRollsBackNewChallenge()
    {
        const string email = "admin@kidsfit.vn";
        var initialMailer = new SimulatedMailer();
        await using var db = fixture.Open();
        await ClearAdminChallenges(db);
        await PasswordResetFeatures.Forgot(new ForgotPasswordRequest(email), db, Settings(), initialMailer,
            NullLoggerFactory.Instance, CancellationToken.None);
        var original = await db.PasswordResetChallenges.OrderByDescending(x => x.Id).FirstAsync();
        original.CreatedAt = DateTime.UtcNow.AddSeconds(-65);
        await db.SaveChangesAsync();

        var failing = new SimulatedMailer(fail: true);
        var result = await PasswordResetFeatures.Forgot(new ForgotPasswordRequest(email), db, Settings(), failing,
            NullLoggerFactory.Instance, CancellationToken.None);
        Assert.Equal(200, ((Microsoft.AspNetCore.Http.IStatusCodeHttpResult)result).StatusCode);
        Assert.Equal(1, failing.Count);
        await db.Entry(original).ReloadAsync();
        Assert.Null(original.ConsumedAt);
        Assert.Equal(1, await db.PasswordResetChallenges.CountAsync(x => x.UserId == original.UserId));
        var verified = await PasswordResetFeatures.Verify(
            new VerifyPasswordOtpRequest(email, initialMailer.Code), db, Settings(), CancellationToken.None);
        Assert.Equal(200, ((Microsoft.AspNetCore.Http.IStatusCodeHttpResult)verified).StatusCode);
    }

    [MySqlFact]
    public async Task ConcurrentResendRequestsAreSerializedPerUser()
    {
        const string email = "admin@kidsfit.vn";
        await using (var db = fixture.Open()) await ClearAdminChallenges(db);
        var mailer = new SimulatedMailer();
        async Task Send() {
            await using var db = fixture.Open();
            await PasswordResetFeatures.Forgot(new ForgotPasswordRequest(email), db, Settings(), mailer,
                NullLoggerFactory.Instance, CancellationToken.None);
        }
        await Task.WhenAll(Send(), Send(), Send());
        Assert.Equal(1, mailer.Count);
        await using var check = fixture.Open();
        var id = await check.Users.Where(x => x.Email == email).Select(x => x.Id).SingleAsync();
        Assert.Equal(1, await check.PasswordResetChallenges.CountAsync(x => x.UserId == id));
    }

}

using System.Security.Claims;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Features;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace KidsfitCRM.Api.Tests;

public sealed class ChangePasswordMySqlTests(ChannelMySqlFixture fixture) : IClassFixture<ChannelMySqlFixture>
{
    private static DefaultHttpContext AsUser(long id)
    {
        var context = new DefaultHttpContext();
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, id.ToString())], "test"));
        return context;
    }

    [MySqlFact]
    public async Task ChangingPasswordRequiresCurrentCredentialAndRevokesOldTokens()
    {
        await using var db = fixture.Open();
        var user = await db.Users.SingleAsync(x => x.Email == "admin@kidsfit.vn");
        var id = user.Id;
        var hasher = new PasswordHasher<User>();
        var beforeStamp = user.SecurityStamp;
        var beforeHash = user.Password;
        const string current = "EphemeralTestOnly-CRM-Password!";
        const string replacement = "Changed-Crm-Password-For-Test-987!";

        await Assert.ThrowsAsync<ApiValidationException>(async () =>
            await AuthFeatures.ChangeOwnPassword(
                new ChangeOwnPasswordRequest("incorrect", replacement, replacement),
                AsUser(id), db, hasher, NullLoggerFactory.Instance, CancellationToken.None));
        Assert.Equal(beforeStamp, user.SecurityStamp);
        Assert.Equal(beforeHash, user.Password);

        await Assert.ThrowsAsync<ApiValidationException>(async () =>
            await AuthFeatures.ChangeOwnPassword(
                new ChangeOwnPasswordRequest(current, "short", "short"),
                AsUser(id), db, hasher, NullLoggerFactory.Instance, CancellationToken.None));
        Assert.Equal(beforeStamp, user.SecurityStamp);

        await Assert.ThrowsAsync<ApiValidationException>(async () =>
            await AuthFeatures.ChangeOwnPassword(
                new ChangeOwnPasswordRequest(current, replacement, "does-not-match"),
                AsUser(id), db, hasher, NullLoggerFactory.Instance, CancellationToken.None));

        await AuthFeatures.ChangeOwnPassword(
            new ChangeOwnPasswordRequest(current, replacement, replacement),
            AsUser(id), db, hasher, NullLoggerFactory.Instance, CancellationToken.None);
        await db.Entry(user).ReloadAsync();

        Assert.NotEqual(beforeStamp, user.SecurityStamp);
        Assert.NotEqual(beforeHash, user.Password);
        Assert.Equal(PasswordVerificationResult.Failed, hasher.VerifyHashedPassword(user, user.Password, current));
        Assert.Equal(PasswordVerificationResult.Success, hasher.VerifyHashedPassword(user, user.Password, replacement));
    }
}

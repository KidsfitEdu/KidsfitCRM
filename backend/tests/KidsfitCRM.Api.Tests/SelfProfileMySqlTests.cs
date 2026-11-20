using System.Security.Claims;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Tests;

public sealed class SelfProfileMySqlTests(ChannelMySqlFixture fixture) : IClassFixture<ChannelMySqlFixture>
{
    private static DefaultHttpContext AsUser(long id)
    {
        var context = new DefaultHttpContext();
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, id.ToString())], "test"));
        return context;
    }

    [MySqlFact]
    public async Task SelfUpdateOnlyChangesCurrentUserAndWritesOneAuditForRealChange()
    {
        await using var db = fixture.Open();
        var user = await db.Users.SingleAsync(x => x.Email == "admin@kidsfit.vn");
        var other = await db.Users.AsNoTracking().FirstAsync(x => x.Id != user.Id);
        var oldOtherName = other.Name;
        var oldOtherPhone = other.Phone;
        var email = user.Email;
        var code = user.Code;
        var stamp = user.SecurityStamp;
        var oldName = user.Name;
        var oldPhone = user.Phone;
        var baseline = await db.AuditLogs.CountAsync(x => x.UserId == user.Id && x.Action == "UPDATE_OWN_PROFILE");

        await Assert.ThrowsAsync<ApiValidationException>(async () =>
            await AuthFeatures.UpdateOwnProfile(new UpdateOwnProfileRequest("", "0912345678"),
                AsUser(user.Id), db, CancellationToken.None));
        await Assert.ThrowsAsync<ApiValidationException>(async () =>
            await AuthFeatures.UpdateOwnProfile(new UpdateOwnProfileRequest("Test", "bad-number"),
                AsUser(user.Id), db, CancellationToken.None));
        await Assert.ThrowsAsync<ApiValidationException>(async () =>
            await AuthFeatures.UpdateOwnProfile(new UpdateOwnProfileRequest("Test", new string('1', 41)),
                AsUser(user.Id), db, CancellationToken.None));
        Assert.Equal(baseline, await db.AuditLogs.CountAsync(x => x.UserId == user.Id && x.Action == "UPDATE_OWN_PROFILE"));

        await AuthFeatures.UpdateOwnProfile(new UpdateOwnProfileRequest("  Tên mới  ", " 0912345678 "),
            AsUser(user.Id), db, CancellationToken.None);
        await db.Entry(user).ReloadAsync();
        Assert.Equal("Tên mới", user.Name);
        Assert.Equal("0912345678", user.Phone);
        Assert.Equal(email, user.Email);
        Assert.Equal(code, user.Code);
        Assert.Equal(stamp, user.SecurityStamp);
        Assert.Equal(baseline + 1, await db.AuditLogs.CountAsync(x => x.UserId == user.Id && x.Action == "UPDATE_OWN_PROFILE"));

        await AuthFeatures.UpdateOwnProfile(new UpdateOwnProfileRequest(user.Name, user.Phone),
            AsUser(user.Id), db, CancellationToken.None);
        Assert.Equal(baseline + 1, await db.AuditLogs.CountAsync(x => x.UserId == user.Id && x.Action == "UPDATE_OWN_PROFILE"));

        var unchangedOther = await db.Users.AsNoTracking().SingleAsync(x => x.Id == other.Id);
        Assert.Equal(oldOtherName, unchangedOther.Name);
        Assert.Equal(oldOtherPhone, unchangedOther.Phone);

        await AuthFeatures.UpdateOwnProfile(new UpdateOwnProfileRequest(oldName, oldPhone),
            AsUser(user.Id), db, CancellationToken.None);
    }
}

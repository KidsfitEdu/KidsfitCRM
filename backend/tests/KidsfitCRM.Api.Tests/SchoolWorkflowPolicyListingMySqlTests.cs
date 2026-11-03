using System.Security.Claims;
using System.Text.Json;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Features;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Tests;

[Collection("MySQLIntegration")]
public sealed class SchoolWorkflowPolicyListingMySqlTests(ChannelMySqlFixture fixture) : IClassFixture<ChannelMySqlFixture>
{
    private static readonly CancellationToken Ct = CancellationToken.None;

    [MySqlFact]
    public async Task BoardCanReadAllPagesOfPolicyHistoryWithoutHundredRowCap()
    {
        await using var db = fixture.Open();
        var director = await db.Users.Where(x => x.Email == "board@kidsfit.vn").Select(x => x.Id).SingleAsync(Ct);
        var suffix = Guid.NewGuid().ToString("N");
        var org = new Organization
        {
            Code = "POL-" + suffix[..16], Name = "Tổ chức phân trang " + suffix[..8],
            OrganizationType = "PARTNER", CommissionRateCeiling = 15
        };
        db.Organizations.Add(org);
        await db.SaveChangesAsync(Ct);

        var now = DateTime.UtcNow;
        for (var version = 1; version <= 105; version++)
            db.SchoolWorkflowPolicies.Add(new SchoolWorkflowPolicyVersion
            {
                OrganizationId = org.Id, Version = version, Status = "DRAFT",
                ManagerReviewHours = 24, AdminReviewHours = 48, InvitationHours = 24,
                MaxExtensionDays = 7, MaxExtensionCount = 3, MaxTotalExtensionDays = 21,
                DecisionReference = "POL-TEST-" + suffix[..8] + "-" + version,
                RequestFingerprint = suffix + "-" + version,
                CreatedByUserId = director,
                CreatedAt = now.AddSeconds(version), UpdatedAt = now.AddSeconds(version)
            });
        await db.SaveChangesAsync(Ct);
        db.ChangeTracker.Clear();

        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, director.ToString())], "test"))
        };
        context.Request.QueryString = new QueryString($"?organization_id={org.Id}&page=11&page_size=10");
        var response = await SchoolOperationsEndpoints.PolicyListPage(context, db, Ct);
        var json = JsonSerializer.SerializeToElement(((IValueHttpResult)response).Value,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower });

        Assert.Equal(105, json.GetProperty("pagination").GetProperty("total").GetInt32());
        Assert.Equal(11, json.GetProperty("pagination").GetProperty("page").GetInt32());
        Assert.Equal(5, json.GetProperty("items").GetArrayLength());
        Assert.Equal(5, json.GetProperty("items")[0].GetProperty("version").GetInt32());

        context.Request.QueryString = new QueryString($"?organization_id={org.Id}&search=103&page_size=10");
        response = await SchoolOperationsEndpoints.PolicyListPage(context, db, Ct);
        json = JsonSerializer.SerializeToElement(((IValueHttpResult)response).Value,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower });
        Assert.Equal(1, json.GetProperty("pagination").GetProperty("total").GetInt32());
        Assert.Equal(103, json.GetProperty("items")[0].GetProperty("version").GetInt32());
    }
}

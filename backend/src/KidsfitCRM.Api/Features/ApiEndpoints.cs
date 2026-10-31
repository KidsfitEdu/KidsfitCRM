using KidsfitCRM.Api.Common;
using Microsoft.AspNetCore.RateLimiting;

namespace KidsfitCRM.Api.Features;

/// <summary>Public login and protected CRM KIDSFIT/CHECKEE routes only.</summary>
public static class ApiEndpoints
{
    public static IEndpointRouteBuilder MapKidsfitApi(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("/api");
        api.MapPost("/login", AuthFeatures.Login).RequireRateLimiting("login");
        var secured = api.MapGroup("").RequireAuthorization();
        secured.MapGet("/me", AuthFeatures.Me);
        secured.MapPost("/logout", AuthFeatures.Logout);
        secured.MapChannelSalesApi();
        secured.MapSchoolProposalAlerts();
        return app;
    }
}

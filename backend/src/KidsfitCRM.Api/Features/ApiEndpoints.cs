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
        api.MapPost("/auth/password/forgot", PasswordResetFeatures.Forgot).RequireRateLimiting("password-reset");
        api.MapPost("/auth/password/verify-otp", PasswordResetFeatures.Verify).RequireRateLimiting("password-reset");
        api.MapPost("/auth/password/reset", PasswordResetFeatures.Reset).RequireRateLimiting("password-reset");
        var secured = api.MapGroup("").RequireAuthorization();
        secured.MapGet("/me", AuthFeatures.Me);
        secured.MapGet("/me/avatar", UserAvatarFeatures.Download);
        secured.MapPost("/me/avatar", UserAvatarFeatures.Upload).RequireRateLimiting("avatar-upload");
        secured.MapDelete("/me/avatar", UserAvatarFeatures.Remove);
        secured.MapPost("/logout", AuthFeatures.Logout);
        secured.MapChannelSalesApi();
        secured.MapSchoolProposalAlerts();
        return app;
    }
}

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace KidsfitCRM.Api.Features;

public sealed class JwtTokenService(IConfiguration configuration)
{
    public string Create(User user, IReadOnlyCollection<string> permissions)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
        };
        claims.AddRange(permissions.Select(permission => new Claim("permission", permission)));
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!));
        var token = new JwtSecurityToken(
            configuration["Jwt:Issuer"], configuration["Jwt:Audience"], claims,
            expires: DateTime.UtcNow.AddHours(8), signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public static class AuthFeatures
{
    public static async Task<IResult> Login(LoginRequest request, KidsfitDbContext db, IPasswordHasher<User> hasher, JwtTokenService tokens)
    {
        var email = Validation.Required(request.Email, "email", "Vui lòng nhập email.", 190).ToLowerInvariant();
        var password = Validation.Required(request.Password, "password", "Vui lòng nhập mật khẩu.", 200);
        var user = await db.Users.SingleOrDefaultAsync(x => x.Email == email);
        if (user is null || user.Status != "ACTIVE" || hasher.VerifyHashedPassword(user, user.Password, password) == PasswordVerificationResult.Failed)
            throw ApiValidationException.For("email", "Email hoặc mật khẩu không chính xác.");

        var permissions = await PermissionCodes(db, user.Id);
        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Ok(new { token = tokens.Create(user, permissions), user = UserPayload(user, permissions) });
    }

    public static async Task<IResult> Me(HttpContext http, KidsfitDbContext db)
    {
        var user = await db.Users.FindAsync(http.UserId()) ?? throw new KeyNotFoundException();
        return Results.Ok(new { user = UserPayload(user, await PermissionCodes(db, user.Id)) });
    }

    public static IResult Logout() => Results.Ok(new { message = "Đã đăng xuất." });

    internal static async Task<string[]> PermissionCodes(KidsfitDbContext db, long userId) => await (
        from userRole in db.UserRoles
        join permissionRole in db.PermissionRoles on userRole.RoleId equals permissionRole.RoleId
        join permission in db.Permissions on permissionRole.PermissionId equals permission.Id
        where userRole.UserId == userId
        select permission.Code).Distinct().OrderBy(code => code).ToArrayAsync();

    private static object UserPayload(User user, IReadOnlyCollection<string> permissions) => new
    {
        user.Id, user.Code, user.Name, user.Email, user.Phone, abilities = permissions,
    };
}

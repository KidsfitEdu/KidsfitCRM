using System.Text;
using System.Text.Json;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Features;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("MySql")
    ?? throw new InvalidOperationException("ConnectionStrings:MySql is required.");
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key is required.");
if (Encoding.UTF8.GetByteCount(jwtKey) < 32) throw new InvalidOperationException("Jwt:Key must contain at least 32 UTF-8 bytes.");

builder.Services.AddDbContext<KidsfitDbContext>(options => options.UseMySQL(connectionString));
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<LeadActions>();
builder.Services.AddScoped<BillingActions>();
builder.Services.AddScoped<ChannelSalesActions>();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
    options.SerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.SnakeCaseLower;
    options.SerializerOptions.Converters.Add(new UtcDateTimeConverter());
});
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.FromMinutes(1),
    };
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var userIdValue = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!long.TryParse(userIdValue, out var userId)) { context.Fail("Invalid identity."); return; }
            var db = context.HttpContext.RequestServices.GetRequiredService<KidsfitDbContext>();
            if (!await db.Users.AnyAsync(x => x.Id == userId && x.Status == "ACTIVE")) { context.Fail("Inactive account."); return; }
            if (context.Principal?.Identity is System.Security.Claims.ClaimsIdentity identity)
            {
                foreach (var claim in identity.FindAll("permission").ToArray()) identity.RemoveClaim(claim);
                identity.AddClaims((await AuthFeatures.PermissionCodes(db, userId)).Select(code => new System.Security.Claims.Claim("permission", code)));
            }
        },
    };
});
builder.Services.AddAuthorization(options =>
{
    foreach (var permission in Permissions.All)
        options.AddPolicy(permission, policy => policy.RequireClaim("permission", permission));
});
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:3000"])
    .AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddRateLimiter(options => options.AddFixedWindowLimiter("login", limiter =>
{
    limiter.PermitLimit = 6;
    limiter.Window = TimeSpan.FromMinutes(1);
    limiter.QueueLimit = 0;
}));

var app = builder.Build();

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (ApiValidationException exception)
    {
        context.Response.StatusCode = StatusCodes.Status422UnprocessableEntity;
        await context.Response.WriteAsJsonAsync(new { message = exception.Message, errors = exception.Errors });
    }
    catch (ApiConflictException exception)
    {
        context.Response.StatusCode = StatusCodes.Status409Conflict;
        await context.Response.WriteAsJsonAsync(new { message = exception.Message });
    }
    catch (KeyNotFoundException)
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        await context.Response.WriteAsJsonAsync(new { message = "Không tìm thấy dữ liệu yêu cầu." });
    }
});
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", async (KidsfitDbContext db) => await db.Database.CanConnectAsync()
    ? Results.Ok(new { status = "healthy" })
    : Results.StatusCode(StatusCodes.Status503ServiceUnavailable));
app.MapKidsfitApi();

if (args.Contains("--migrate", StringComparer.OrdinalIgnoreCase))
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<KidsfitDbContext>();
    await db.Database.MigrateAsync();
    if (args.Contains("--seed-demo", StringComparer.OrdinalIgnoreCase) || builder.Configuration.GetValue<bool>("Seed:DemoEnabled"))
        await DatabaseSeeder.SeedAsync(scope.ServiceProvider);
    return;
}

await app.RunAsync();

public static class Permissions
{
    public const string DashboardView = "crm.dashboard.view";
    public const string LeadView = "crm.lead.view";
    public const string LeadCreate = "crm.lead.create";
    public const string LeadUpdate = "crm.lead.update";
    public const string LeadAssign = "crm.lead.assign";
    public const string StudentView = "student.view";
    public const string StudentUpdate = "student.update";
    public const string CourseView = "course.view";
    public const string CourseManage = "course.manage";
    public const string PaymentView = "payment.view";
    public const string PaymentCreate = "payment.create";
    public const string ReportView = "crm.report.view";
    public const string ChannelSalesView = "channel_sales.customer.view";
    public const string ChannelSalesRegister = "channel_sales.approach.register";
    public const string ChannelSalesActivity = "channel_sales.activity.create";
    public const string ChannelSalesReportContract = "channel_sales.contract.report";
    public const string ChannelSalesRecordRevenue = "channel_sales.revenue.record";
    public const string ChannelSalesCommissionView = "channel_sales.commission.view";
    public const string ChannelSalesReconcile = "channel_sales.reconcile";
    public const string ChannelSalesManage = "channel_sales.manage";
    public const string ChannelSalesOrganizationScope = "channel_sales.scope.organization";
    public const string ChannelSalesAllScope = "channel_sales.scope.all";
    public const string ChannelSalesPayoutCreate = "channel_sales.payout.create";
    public const string ChannelSalesPayoutApprove = "channel_sales.payout.approve";
    public const string ChannelSalesPayoutComplete = "channel_sales.payout.complete";
    public const string ChannelSalesPolicyManage = "channel_sales.policy.manage";
    public const string ChannelSalesTeamManage = "channel_sales.team.manage";
    public const string ChannelSalesIdentityManage = "channel_sales.identity.manage";
    public const string ChannelSalesCommissionAdjust = "channel_sales.commission.adjust";
    public const string SchoolDirectoryManage = "channel_sales.school.directory.manage";
    public const string SchoolCapacityManage = "channel_sales.school.capacity.manage";
    public const string SchoolContractReview = "channel_sales.school.contract.review";
    public const string SchoolProtectionGrant = "channel_sales.school.protection.grant";
    public static readonly string[] All = [SchoolDirectoryManage, SchoolCapacityManage, SchoolContractReview, SchoolProtectionGrant, DashboardView, LeadView, LeadCreate, LeadUpdate, LeadAssign, StudentView, StudentUpdate, CourseView, CourseManage, PaymentView, PaymentCreate, ReportView, ChannelSalesView, ChannelSalesRegister, ChannelSalesActivity, ChannelSalesReportContract, ChannelSalesRecordRevenue, ChannelSalesCommissionView, ChannelSalesReconcile, ChannelSalesManage, ChannelSalesOrganizationScope, ChannelSalesAllScope, ChannelSalesPayoutCreate, ChannelSalesPayoutApprove, ChannelSalesPayoutComplete, ChannelSalesPolicyManage, ChannelSalesTeamManage, ChannelSalesIdentityManage, ChannelSalesCommissionAdjust];
}

public partial class Program;

using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed record CheckeeTechnicalReplyRequest(string? Content, bool Completed);

public static class CheckeeSupportEndpoints
{
    public static void Map(RouteGroupBuilder channel)
    {
        channel.MapGet("/checkee/support-cases", List)
            .RequireAuthorization(Permissions.SchoolTechnicalSupportHandle);
        channel.MapPost("/checkee/support-cases/{id:long}/progress", async (
            long id, CheckeeTechnicalReplyRequest request, HttpContext http,
            ChannelSalesActions actions, CancellationToken ct) =>
            Results.Ok(new { data = new { id = await actions.RecordCheckeeSupportProgress(id, request, http.UserId(), http, ct) } }))
            .RequireAuthorization(Permissions.SchoolTechnicalSupportHandle);
    }

    public static async Task<IResult> List(HttpContext http, KidsfitDbContext db,
        string? status, string? search, int? page, int? page_size, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.SchoolTechnicalSupportHandle)) throw new KeyNotFoundException();
        var state = (status ?? "ALL").ToUpperInvariant();
        if (state is not ("ALL" or "OPEN" or "IN_PROGRESS" or "RESOLVED"))
            throw ApiValidationException.For("status", "Trạng thái ticket không hợp lệ.");
        var term = search?.Trim() ?? "";
        if (term.Length > 190) throw ApiValidationException.For("search", "Từ khóa tối đa 190 ký tự.");
        var query = db.CustomerSupportCases.AsNoTracking().Where(t => t.TicketType == "SYSTEM_ERROR"
            && t.CheckeeOrganizationId.HasValue && access.OrganizationIds.Contains(t.CheckeeOrganizationId.Value)
            && t.ForwardedAt.HasValue
            && (state == "ALL" || t.Status == state)
            && (term == "" || t.Subject.Contains(term)
                || db.ChannelCustomers.Any(c => c.Id == t.CustomerId && c.DisplayName.Contains(term))));
        var p = Math.Clamp(page ?? 1, 1, 10000);
        var size = Math.Clamp(page_size ?? 20, 1, 100);
        var total = await query.CountAsync(ct);
        var rows = await query.OrderBy(t => t.Status == "RESOLVED").ThenByDescending(t => t.CreatedAt)
            .Skip((p - 1) * size).Take(size)
            .Select(t => new {
                t.Id, t.Subject, t.Description, t.Status, t.ForwardedAt, t.CheckeeRespondedAt, t.CreatedAt,
                school_name = db.ChannelCustomers.Where(c => c.Id == t.CustomerId).Select(c => c.DisplayName).First(),
                activities = db.CustomerActivities.Where(a => a.SupportCaseId == t.Id && (a.ActivityType == "CHECKEE_SUPPORT" || a.ActivityType == "SUPPORT"))
                    .OrderBy(a => a.CreatedAt).Select(a => new { a.Id, a.Content, a.CreatedAt,
                        author_name = db.Users.Where(u => u.Id == a.UserId).Select(u => u.Name).FirstOrDefault(),
                        author_role = a.ActivityType == "CHECKEE_SUPPORT" ? "CHECKEE" : "CSKH", activity_type = a.ActivityType }).ToArray()
            }).ToArrayAsync(ct);
        return Results.Ok(new { data = rows, total, page = p, page_size = size });
    }
}

public sealed partial class ChannelSalesActions
{
    public Task<long> RecordCheckeeSupportProgress(long id, CheckeeTechnicalReplyRequest request,
        long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolTechnicalSupportHandle, ct);
        var content = Validation.Required(request.Content, "content", "Cần ghi nội dung xử lý kỹ thuật.", 4000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var item = await db.CustomerSupportCases.FromSqlInterpolated($"SELECT * FROM customer_support_cases WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (item.TicketType != "SYSTEM_ERROR" || !item.CheckeeOrganizationId.HasValue || !item.ForwardedAt.HasValue
            || !access.InOrganization(item.CheckeeOrganizationId.Value)) throw new KeyNotFoundException();
        if (item.Status == "RESOLVED") throw new ApiConflictException("CSKH đã hoàn tất ticket.");
        if (item.CheckeeRespondedAt.HasValue) throw new ApiConflictException("CHECKEE đã hoàn tất kỹ thuật. Chờ CSKH xác nhận với trường.");
        var now = DateTime.UtcNow;
        item.Status = "IN_PROGRESS";
        if (request.Completed) item.CheckeeRespondedAt = now;
        item.UpdatedAt = now;
        db.CustomerActivities.Add(new CustomerActivity {
            CustomerId = item.CustomerId, SupportCaseId = item.Id, UserId = actorId,
            ActivityType = "CHECKEE_SUPPORT", Content = content, OccurredAt = now,
            CreatedAt = now, UpdatedAt = now
        });
        Audit.Add(db, actorId, "CHECKEE_SUPPORT_PROGRESS", nameof(CustomerSupportCase), id,
            null, new { request.Completed, item.Status, item.CheckeeRespondedAt }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return id;
    }, ct);
}

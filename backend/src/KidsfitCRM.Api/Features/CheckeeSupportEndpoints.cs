using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>Technical error tickets routed by the assigned CSKH, scoped to CHECKEE's active organization.</summary>
public static class CheckeeSupportEndpoints
{
    public static void Map(RouteGroupBuilder group)
    {
        group.MapGet("/checkee/support-cases", List)
            .RequireAuthorization(Permissions.SchoolTechnicalSupportHandle);
        group.MapPost("/checkee/support-cases/{id:long}/progress",
            async (long id, UpdateCheckeeSupportCaseRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
                Results.Ok(new { data = new { id = await actions.RecordCheckeeSupportProgress(id, request, http.UserId(), http, ct) } }))
            .RequireAuthorization(Permissions.SchoolTechnicalSupportHandle);
    }

    public static async Task<IResult> List(HttpContext http, KidsfitDbContext db,
        string? search, string? status, int? page, int? page_size, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.SchoolTechnicalSupportHandle)) return Results.Forbid();
        var scoped = db.CustomerSupportCases.AsNoTracking().Where(x =>
            x.TicketType == "SYSTEM_ERROR" && x.ForwardedAt.HasValue
            && x.CheckeeOrganizationId.HasValue && access.OrganizationIds.Contains(x.CheckeeOrganizationId.Value));
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            if (term.Length > 190) throw ApiValidationException.For("search", "Từ khóa tối đa 190 ký tự.");
            scoped = scoped.Where(x => x.Subject.Contains(term) ||
                db.ChannelCustomers.Any(c => c.Id == x.CustomerId && c.DisplayName.Contains(term)));
        }
        var summary = new
        {
            open = await scoped.CountAsync(x => x.Status == "OPEN", ct),
            in_progress = await scoped.CountAsync(x => x.Status == "IN_PROGRESS", ct),
            resolved = await scoped.CountAsync(x => x.Status == "RESOLVED", ct)
        };
        if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
        {
            if (status is not ("OPEN" or "IN_PROGRESS" or "RESOLVED")) throw ApiValidationException.For("status", "Trạng thái không hợp lệ.");
            scoped = scoped.Where(x => x.Status == status);
        }
        var number = Math.Clamp(page ?? 1, 1, 100_000);
        var size = Math.Clamp(page_size ?? 20, 1, 100);
        var total = await scoped.CountAsync(ct);
        var rows = await scoped.OrderBy(x => x.Status == "RESOLVED").ThenByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id).Skip((number - 1) * size).Take(size)
            .Select(x => new
            {
                x.Id, x.ContractId, x.Subject, x.Description, x.Status, x.CreatedAt,
                x.ForwardedAt, x.CheckeeRespondedAt, x.Outcome,
                school_name = db.ChannelCustomers.Where(c => c.Id == x.CustomerId).Select(c => c.DisplayName).First(),
                contract_code = db.SalesContracts.Where(c => c.Id == x.ContractId).Select(c => c.ContractCode).First(),
                activities = db.CustomerActivities.Where(a => a.SupportCaseId == x.Id && a.ActivityType == "CHECKEE_SUPPORT")
                    .OrderBy(a => a.CreatedAt).Select(a => new { a.Id, a.Content, a.OccurredAt,
                        author_name = db.Users.Where(u => u.Id == a.UserId).Select(u => u.Name).First() }).ToArray(),
            }).ToArrayAsync(ct);
        return Results.Ok(new { data = rows, total, page = number, page_size = size, summary });
    }
}

public sealed partial class ChannelSalesActions
{
    public Task<long> RecordCheckeeSupportProgress(long id, UpdateCheckeeSupportCaseRequest request,
        long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolTechnicalSupportHandle, ct);
        var content = Validation.Required(request.Content, "content", "Cần nội dung kiểm tra hoặc kết quả kỹ thuật.", 4000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var item = await db.CustomerSupportCases.FromSqlInterpolated($"SELECT * FROM customer_support_cases WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (item.TicketType != "SYSTEM_ERROR" || !item.ForwardedAt.HasValue || !item.CheckeeOrganizationId.HasValue
            || !access.InOrganization(item.CheckeeOrganizationId.Value)) throw new KeyNotFoundException();
        if (item.Status == "RESOLVED") throw new ApiConflictException("Ticket đã được CSKH đóng.");
        var now = DateTime.UtcNow;
        item.Status = "IN_PROGRESS";
        if (request.Completed) item.CheckeeRespondedAt = now;
        item.UpdatedAt = now;
        db.CustomerActivities.Add(new CustomerActivity
        {
            CustomerId = item.CustomerId, SupportCaseId = item.Id, UserId = actorId,
            ActivityType = "CHECKEE_SUPPORT", Content = content, OccurredAt = now, CreatedAt = now, UpdatedAt = now
        });
        Audit.Add(db, actorId, "CHECKEE_SUPPORT_PROGRESS", nameof(CustomerSupportCase), id,
            null, new { item.Status, request.Completed, item.CheckeeRespondedAt }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return id;
    }, ct);
}

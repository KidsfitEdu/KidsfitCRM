using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed record CustomerCareCallRequest(string? Content, DateTime? NextFollowUpAt);

/// <summary>Small, paged, server-scoped CSKH read models. No global customer/financial payloads.</summary>
public static class CustomerCareEndpoints
{
    public static void Map(RouteGroupBuilder channel)
    {
        channel.MapGet("/care/schools", Schools).RequireAuthorization(Permissions.SchoolSupportManage);
        channel.MapGet("/care/schools/{id:long}", SchoolDetail).RequireAuthorization(Permissions.SchoolSupportManage);
        channel.MapGet("/care/tickets", Tickets).RequireAuthorization(Permissions.SchoolSupportManage);
        channel.MapGet("/care/summary", Summary).RequireAuthorization(Permissions.SchoolSupportManage);
        channel.MapPost("/care/schools/{id:long}/calls", LogCall).RequireAuthorization(Permissions.SchoolSupportManage);
        channel.MapGet("/care/assignments", Assignments).RequireAuthorization(Permissions.SchoolCareAssign);
    }

    private static IQueryable<SalesContract> Assigned(KidsfitDbContext db, ChannelSalesAccess access) =>
        db.SalesContracts.Where(c => c.CareUserId == access.UserId && c.CareOrganizationId.HasValue
            && access.OrganizationIds.Contains(c.CareOrganizationId.Value));

    private static async Task<ChannelSalesAccess> CareAccess(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.SchoolSupportManage)) throw new KeyNotFoundException();
        return access;
    }

    private static (int page, int size) Pagination(int? page, int? page_size) =>
        (Math.Clamp(page ?? 1, 1, 10000), Math.Clamp(page_size ?? 20, 1, 100));

    public static async Task<IResult> Schools(HttpContext http, KidsfitDbContext db,
        string? search, int? page, int? page_size, CancellationToken ct)
    {
        var access = await CareAccess(http, db, ct);
        var (p, size) = Pagination(page, page_size);
        var term = search?.Trim() ?? "";
        if (term.Length > 190) throw ApiValidationException.For("search", "Tìm kiếm tối đa 190 ký tự.");
        // Ticket selection lists only actively supported contracts assigned to the caller.
        var eligible = Assigned(db, access).AsNoTracking()
            .Where(c => c.Status == "ACTIVE" && c.VerifiedAt.HasValue);
        var query = eligible.Where(c => term == ""
            || c.ContractCode.Contains(term)
            || db.ChannelCustomers.Any(x => x.Id == c.CustomerId
                && (x.DisplayName.Contains(term) || (x.Phone != null && x.Phone.Contains(term)))));
        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(c => c.CreatedAt).ThenByDescending(c => c.Id)
            .Skip((p - 1) * size).Take(size)
            .Select(c => new {
                c.Id, c.CustomerId, c.ContractCode, c.Status, c.VerifiedAt,
                eligible_contract_count = eligible.Count(other => other.CustomerId == c.CustomerId),
                school_name = db.ChannelCustomers.Where(x => x.Id == c.CustomerId).Select(x => x.DisplayName).First(),
                contact_name = db.ChannelCustomers.Where(x => x.Id == c.CustomerId).Select(x => x.ContactName).First(),
                phone = db.ChannelCustomers.Where(x => x.Id == c.CustomerId).Select(x => x.Phone).First(),
                email = db.ChannelCustomers.Where(x => x.Id == c.CustomerId).Select(x => x.Email).First(),
                open_tickets = db.CustomerSupportCases.Count(t => t.ContractId == c.Id && t.Status != "RESOLVED"),
                last_support_at = db.CustomerActivities.Where(a => a.CustomerId == c.CustomerId && a.ActivityType == "SUPPORT")
                    .Max(a => (DateTime?)a.CreatedAt),
            }).ToArrayAsync(ct);
        return Results.Ok(new { data = rows, total, page = p, page_size = size });
    }

    public static async Task<IResult> SchoolDetail(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await CareAccess(http, db, ct);
        var contract = await Assigned(db, access).AsNoTracking().Where(c => c.Id == id).Select(c => new {
            c.Id, c.CustomerId, c.ContractCode, c.Status, c.VerifiedAt,
            school_name = db.ChannelCustomers.Where(x => x.Id == c.CustomerId).Select(x => x.DisplayName).First(),
            address = db.ChannelCustomers.Where(x => x.Id == c.CustomerId).Select(x => x.Address).First(),
            contact_name = db.ChannelCustomers.Where(x => x.Id == c.CustomerId).Select(x => x.ContactName).First(),
            contact_position = db.ChannelCustomers.Where(x => x.Id == c.CustomerId).Select(x => x.ContactPosition).First(),
            phone = db.ChannelCustomers.Where(x => x.Id == c.CustomerId).Select(x => x.Phone).First(),
            email = db.ChannelCustomers.Where(x => x.Id == c.CustomerId).Select(x => x.Email).First(),
        }).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        var logs = await db.CustomerActivities.AsNoTracking().Where(a => a.CustomerId == contract.CustomerId
            && (a.ActivityType == "SUPPORT" || a.SupportCaseId != null))
            .OrderByDescending(a => a.CreatedAt).Take(100).Select(a => new {
                a.Id, a.ActivityType, a.SupportCaseId, a.Content, a.NextFollowUpAt, a.CreatedAt,
                user_name = db.Users.Where(u => u.Id == a.UserId).Select(u => u.Name).FirstOrDefault(),
            }).ToArrayAsync(ct);
        var tickets = await db.CustomerSupportCases.AsNoTracking().Where(t => t.ContractId == id)
            .OrderByDescending(t => t.CreatedAt).Take(100).Select(t => new {
                t.Id, t.Subject, t.Description, t.Status, t.TicketType, t.CheckeeRespondedAt, t.Outcome, t.CreatedAt
            }).ToArrayAsync(ct);
        var handovers = await db.ContractCareHandovers.AsNoTracking().Where(h => h.ContractId == id)
            .OrderByDescending(h => h.CreatedAt).Take(50).Select(h => new {
                h.Id, h.Reason, h.CreatedAt,
                assigned_name = db.Users.Where(u => u.Id == h.AssignedUserId).Select(u => u.Name).FirstOrDefault(),
                assigned_by = db.Users.Where(u => u.Id == h.ActorUserId).Select(u => u.Name).FirstOrDefault(),
            }).ToArrayAsync(ct);
        var schoolUnits = await (from school in db.DirectorySchools.AsNoTracking()
            join unit in db.SchoolUnits.AsNoTracking() on school.Id equals unit.DirectorySchoolId
            where school.CustomerId == contract.CustomerId && !school.IsDeleted
            orderby unit.UnitType == "MAIN" descending, unit.SourceRow, unit.Id
            select new {
                unit.Id, unit.Name, unit.UnitType, unit.Address, unit.Province, unit.Ward,
                unit.ContactName, unit.ContactPosition, unit.ContactPhone,
                unit.SchoolPhone, unit.Email, unit.Note
            }).ToArrayAsync(ct);
        return Results.Ok(new { data = contract, school_units = schoolUnits, calls = logs, tickets, handovers });
    }

    public static async Task<IResult> Tickets(HttpContext http, KidsfitDbContext db, string? status,
        string? search, int? page, int? page_size, CancellationToken ct)
    {
        var access = await CareAccess(http, db, ct);
        var (p, size) = Pagination(page, page_size);
        var term = search?.Trim() ?? "";
        if (term.Length > 190) throw ApiValidationException.For("search", "Từ khóa tối đa 190 ký tự.");
        var normalized = (status ?? "ALL").ToUpperInvariant();
        if (normalized is not ("ALL" or "OPEN" or "IN_PROGRESS" or "RESOLVED"))
            throw ApiValidationException.For("status", "Trạng thái không hợp lệ.");
        var contractIds = Assigned(db, access).Select(c => c.Id);
        var query = db.CustomerSupportCases.AsNoTracking().Where(t => contractIds.Contains(t.ContractId)
            && (normalized == "ALL" || t.Status == normalized)
            && (term == "" || t.Subject.Contains(term) || db.ChannelCustomers.Any(c => c.Id == t.CustomerId && c.DisplayName.Contains(term))));
        var total = await query.CountAsync(ct);
        var rows = await query.OrderBy(t => t.Status == "RESOLVED").ThenByDescending(t => t.CreatedAt).ThenByDescending(t => t.Id)
            .Skip((p - 1) * size).Take(size).Select(t => new {
                t.Id, t.ContractId, t.CustomerId, t.Subject, t.Description, t.Status, t.TicketType,
                t.CheckeeRespondedAt, t.Outcome, t.CreatedAt,
                school_name = db.ChannelCustomers.Where(c => c.Id == t.CustomerId).Select(c => c.DisplayName).First(),
                activities = db.CustomerActivities.Where(a => a.SupportCaseId == t.Id).OrderBy(a => a.CreatedAt)
                    .Select(a => new { a.Id, a.Content, a.ActivityType, a.CreatedAt, a.NextFollowUpAt,
                        author_name = db.Users.Where(u => u.Id == a.UserId).Select(u => u.Name).FirstOrDefault(),
                        author_role = a.ActivityType == "CHECKEE_SUPPORT" ? "CHECKEE" : "CSKH" }).ToArray(),
            }).ToArrayAsync(ct);
        return Results.Ok(new { data = rows, total, page = p, page_size = size });
    }

    public static async Task<IResult> Summary(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await CareAccess(http, db, ct);
        var assigned = Assigned(db, access);
        var contractIds = assigned.Select(x => x.Id);
        var customerIds = assigned.Select(x => x.CustomerId);
        var tickets = db.CustomerSupportCases.Where(t => contractIds.Contains(t.ContractId));
        var now = DateTime.UtcNow;
        return Results.Ok(new { data = new {
            schools = await assigned.Select(c => c.CustomerId).Distinct().CountAsync(ct),
            open_tickets = await tickets.CountAsync(x => x.Status != "RESOLVED", ct),
            waiting_checkee = await tickets.CountAsync(x => x.TicketType == "SYSTEM_ERROR" && x.Status != "RESOLVED" && x.CheckeeRespondedAt == null, ct),
            resolved_tickets = await tickets.CountAsync(x => x.Status == "RESOLVED", ct),
            due_calls = await db.CustomerActivities.CountAsync(x => customerIds.Contains(x.CustomerId)
                && x.ActivityType == "SUPPORT" && x.NextFollowUpAt != null && x.NextFollowUpAt <= now, ct)
        } });
    }

    public static async Task<IResult> LogCall(long id, CustomerCareCallRequest request, HttpContext http,
        KidsfitDbContext db, CancellationToken ct)
    {
        var access = await CareAccess(http, db, ct);
        var content = Validation.Required(request.Content, "content", "Cần nội dung cuộc gọi hỗ trợ.", 4000);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var contract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (contract.Status != "ACTIVE" || contract.VerifiedAt == null || contract.CareUserId != access.UserId
            || !contract.CareOrganizationId.HasValue || !access.InOrganization(contract.CareOrganizationId.Value))
            throw new KeyNotFoundException();
        var now = DateTime.UtcNow;
        var log = new CustomerActivity {
            CustomerId = contract.CustomerId, UserId = access.UserId, ActivityType = "SUPPORT",
            Content = content, OccurredAt = now, NextFollowUpAt = request.NextFollowUpAt?.ToUniversalTime(),
            CreatedAt = now, UpdatedAt = now
        };
        db.CustomerActivities.Add(log);
        await db.SaveChangesAsync(ct);
        Audit.Add(db, access.UserId, "RECORD_CUSTOMER_SUPPORT", nameof(CustomerActivity), log.Id, null,
            new { log.CustomerId, contract.Id, log.NextFollowUpAt }, http);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Results.Ok(new { data = new { id = log.Id } });
    }

    /// <summary>Admin's cross-partner assignment screen: all eligible contracts plus KIDSFIT care staff.</summary>
    public static async Task<IResult> Assignments(HttpContext http, KidsfitDbContext db,
        string? search, int? page, int? page_size, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.All || !access.Has(Permissions.ChannelSalesIdentityManage) || !access.Has(Permissions.SchoolCareAssign)
            || !await db.Organizations.AnyAsync(o => o.Code == "KIDSFIT" && o.Status == "ACTIVE"
                && access.OrganizationIds.Contains(o.Id), ct))
            throw new KeyNotFoundException();
        var (p, size) = Pagination(page, page_size);
        var term = search?.Trim() ?? "";
        if (term.Length > 190) throw ApiValidationException.For("search", "Từ khóa tối đa 190 ký tự.");
        var all = db.SalesContracts.AsNoTracking().Where(c => c.Status == "ACTIVE" && c.VerifiedAt.HasValue)
            .Where(c => term == "" || c.ContractCode.Contains(term)
                || db.ChannelCustomers.Any(x => x.Id == c.CustomerId && x.DisplayName.Contains(term)));
        var total = await all.CountAsync(ct);
        var contracts = await all.OrderBy(c => c.CareUserId.HasValue).ThenByDescending(c => c.CreatedAt)
            .Skip((p - 1) * size).Take(size)
            .Select(c => new {
                c.Id, c.ContractCode, c.CustomerId, c.CareUserId, c.CareOrganizationId,
                school_name = db.ChannelCustomers.Where(x => x.Id == c.CustomerId).Select(x => x.DisplayName).First(),
                care_name = db.Users.Where(u => u.Id == c.CareUserId).Select(u => u.Name).FirstOrDefault(),
                partner = db.Organizations.Where(o => o.Id == c.OwnerOrganizationId).Select(o => o.Name).First(),
                open_tickets = db.CustomerSupportCases.Count(t => t.ContractId == c.Id && t.Status != "RESOLVED"),
            }).ToArrayAsync(ct);
        var users = await (from m in db.OrganizationMemberships join o in db.Organizations on m.OrganizationId equals o.Id
            join u in db.Users on m.UserId equals u.Id
            where m.Status == "ACTIVE" && u.Status == "ACTIVE" && o.Code == "KIDSFIT" && o.Status == "ACTIVE"
                && db.UserRoles.Any(ur => ur.UserId == u.Id
                    && db.PermissionRoles.Any(pr => pr.RoleId == ur.RoleId && db.Permissions.Any(pe =>
                        pe.Id == pr.PermissionId && pe.Code == Permissions.SchoolSupportManage)))
            orderby u.Name select new { id = u.Id, name = u.Name, email = u.Email, organization_id = o.Id,
                schools = db.SalesContracts.Where(c => c.CareUserId == u.Id && c.Status == "ACTIVE")
                    .Select(c => c.CustomerId).Distinct().Count(),
                open_tickets = db.CustomerSupportCases.Count(t => t.AssignedUserId == u.Id && t.Status != "RESOLVED")
            }).ToArrayAsync(ct);
        return Results.Ok(new { data = contracts, users, total, page = p, page_size = size });
    }
}

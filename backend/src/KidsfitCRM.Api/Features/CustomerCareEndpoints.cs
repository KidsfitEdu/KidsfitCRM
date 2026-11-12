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

    /// <summary>
    /// Server-scoped CSKH overview, exactly one row per school. Filter before
    /// pagination; preserve a representative assigned contract for call/ticket URLs.
    /// </summary>
    public static async Task<IResult> Schools(HttpContext http, KidsfitDbContext db,
        IConfiguration configuration, string? search, string? status,
        int? page, int? page_size, CancellationToken ct)
    {
        var access = await CareAccess(http, db, ct);
        var (p, size) = Pagination(page, page_size);
        var term = search?.Trim() ?? "";
        if (term.Length > 190)
            throw ApiValidationException.For("search", "Tìm kiếm tối đa 190 ký tự.");
        var requestedStatus = (status ?? "ALL").Trim().ToUpperInvariant();
        if (requestedStatus is not ("ALL" or "HAS_TICKET" or "SUPPORTED" or "NOT_SUPPORTED"))
            throw ApiValidationException.For("status", "Bộ lọc hỗ trợ không hợp lệ.");

        var assignedContracts = await Assigned(db, access).AsNoTracking()
            .Where(c => c.Status == "ACTIVE" && c.VerifiedAt.HasValue)
            .OrderByDescending(c => c.CreatedAt).ThenByDescending(c => c.Id)
            .Select(c => new { c.Id, c.CustomerId, c.ContractCode, c.Status, c.VerifiedAt,
                c.CreatedAt })
            .ToArrayAsync(ct);
        var groups = assignedContracts.GroupBy(c => c.CustomerId).ToArray();
        var customerIds = groups.Select(g => g.Key).ToArray();
        var customers = await db.ChannelCustomers.AsNoTracking()
            .Where(c => customerIds.Contains(c.Id))
            .Select(c => new { c.Id, c.DisplayName, c.ContactName, c.Phone, c.Email })
            .ToDictionaryAsync(c => c.Id, ct);
        var contractIds = assignedContracts.Select(c => c.Id).ToArray();
        var tickets = await db.CustomerSupportCases.AsNoTracking()
            .Where(t => contractIds.Contains(t.ContractId) && t.Status != "RESOLVED")
            .GroupBy(t => t.ContractId)
            .Select(g => new { ContractId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(t => t.ContractId, t => t.Count, ct);
        var lastCalls = await db.CustomerActivities.AsNoTracking()
            .Where(a => customerIds.Contains(a.CustomerId) && a.ActivityType == "SUPPORT")
            .GroupBy(a => a.CustomerId)
            .Select(g => new { CustomerId = g.Key, LastAt = g.Max(a => a.CreatedAt) })
            .ToDictionaryAsync(a => a.CustomerId, a => a.LastAt, ct);

        var result = new List<CareSchoolOverview>();
        foreach (var group in groups)
        {
            if (!customers.TryGetValue(group.Key, out var school)) continue;
            if (term.Length != 0 && !school.DisplayName.Contains(term, StringComparison.OrdinalIgnoreCase)
                && !(school.Phone?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false)
                && !group.Any(c => c.ContractCode.Contains(term, StringComparison.OrdinalIgnoreCase)))
                continue;
            var contract = group.First();
            var openTickets = group.Sum(c => tickets.GetValueOrDefault(c.Id));
            var hasSupport = lastCalls.TryGetValue(group.Key, out var last);
            if (requestedStatus == "HAS_TICKET" && openTickets == 0 ||
                requestedStatus == "SUPPORTED" && !hasSupport ||
                requestedStatus == "NOT_SUPPORTED" && hasSupport)
                continue;
            result.Add(new CareSchoolOverview(
                contract.Id, group.Key, contract.ContractCode, contract.Status,
                contract.VerifiedAt, school.DisplayName, school.ContactName,
                school.Phone, school.Email, openTickets,
                hasSupport ? last : null, group.Count()));
        }
        var total = result.Count;
        return Results.Ok(new { data = result.Skip((p - 1) * size).Take(size).ToArray(),
            total, page = p, page_size = size });
    }

    private sealed record CareSchoolOverview(
        long Id, long CustomerId, string ContractCode, string Status, DateTime? VerifiedAt,
        string SchoolName, string? ContactName, string? Phone, string? Email,
        int OpenTickets, DateTime? LastSupportAt, int EligibleContractCount);

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
        var assignedContractIds = await Assigned(db, access).AsNoTracking()
            .Where(c => c.CustomerId == contract.CustomerId && c.Status == "ACTIVE"
                && c.VerifiedAt.HasValue)
            .Select(c => c.Id).ToArrayAsync(ct);
        var logs = await db.CustomerActivities.AsNoTracking().Where(a => a.CustomerId == contract.CustomerId
            && (a.ActivityType == "SUPPORT" || a.SupportCaseId != null))
            .OrderByDescending(a => a.CreatedAt).Take(100).Select(a => new {
                a.Id, a.ActivityType, a.SupportCaseId, a.Content, a.NextFollowUpAt, a.CreatedAt,
                user_name = db.Users.Where(u => u.Id == a.UserId).Select(u => u.Name).FirstOrDefault(),
            }).ToArrayAsync(ct);
        var tickets = await db.CustomerSupportCases.AsNoTracking().Where(t => assignedContractIds.Contains(t.ContractId))
            .OrderByDescending(t => t.CreatedAt).Take(100).Select(t => new {
                t.Id, t.Subject, t.Description, t.Status, t.TicketType, t.CheckeeRespondedAt, t.Outcome, t.CreatedAt
            }).ToArrayAsync(ct);
        var handovers = await db.ContractCareHandovers.AsNoTracking().Where(h => assignedContractIds.Contains(h.ContractId))
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
            where m.Status == "ACTIVE" && m.MembershipType == "CUSTOMER_SERVICE"
                && u.Status == "ACTIVE" && o.Code == "KIDSFIT" && o.Status == "ACTIVE"
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

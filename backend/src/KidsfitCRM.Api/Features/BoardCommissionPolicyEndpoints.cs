using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed record SaveBoardCommissionRequest(
    string Scope, long? OrganizationId, long? ManagerUserId, long? SalesUserId,
    decimal? SalesPercent, decimal? ManagerPercent, long? ExpectedVersionId);

public sealed record ResetBoardCommissionRequest(long ExpectedVersionId);

/// <summary>
/// Director-owned configuration; receipts resolve the latest applicable version at their effective timestamp.
/// Every write appends a version with server timestamp and an audit record.
/// </summary>
public static class BoardCommissionPolicyEndpoints
{
    private const decimal DefaultSales = 25m;
    private const decimal DefaultManager = 5m;

    public static void MapBoardCommissionPolicies(this RouteGroupBuilder group)
    {
        group.MapGet("/board-commission", List)
            .RequireAuthorization(Permissions.ChannelSalesPolicyManage);
        group.MapPost("/board-commission", Save)
            .RequireAuthorization(Permissions.ChannelSalesPolicyManage);
        group.MapPost("/board-commission/{id:long}/reset", Reset)
            .RequireAuthorization(Permissions.ChannelSalesPolicyManage);
    }

    internal static bool ValidRates(decimal sales, decimal manager) =>
        sales >= 0 && manager >= 0 && sales <= 100 && manager <= 100 &&
        sales + manager <= 100 &&
        decimal.Round(sales, 4) == sales && decimal.Round(manager, 4) == manager;

    private static async Task<bool> IsDirector(KidsfitDbContext db, long id, CancellationToken ct) =>
        await (from ur in db.UserRoles
               join r in db.Roles on ur.RoleId equals r.Id
               where ur.UserId == id && r.Code == "DIRECTOR"
               select ur.UserId).AnyAsync(ct);

    private static async Task<bool> HasDirectorAccess(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        return access.Has(Permissions.ChannelSalesPolicyManage)
            && await IsDirector(db, access.UserId, ct);
    }

    internal static BoardCommissionPolicyVersion? Latest(
        IEnumerable<BoardCommissionPolicyVersion> policies, string scope,
        long? organizationId = null, long? managerUserId = null, long? salesUserId = null) =>
        policies.Where(x => x.Scope == scope &&
                    (scope == "SYSTEM" ||
                     (x.OrganizationId == organizationId &&
                      (scope == "MANAGER" ? x.ManagerUserId == managerUserId :
                       x.SalesUserId == salesUserId))))
            .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
            .FirstOrDefault();

    internal static (decimal Sales, decimal Manager, string Source, long? VersionId) Resolve(
        IEnumerable<BoardCommissionPolicyVersion> policies,
        long organizationId, long? managerUserId, long salesUserId)
    {
        var rules = policies as BoardCommissionPolicyVersion[] ?? policies.ToArray();
        var own = Latest(rules, "SALES", organizationId, salesUserId: salesUserId);
        if (own?.Status == "ACTIVE") return (own.SalesPercent, own.ManagerPercent, "SALES", own.Id);
        if (managerUserId.HasValue)
        {
            var team = Latest(rules, "MANAGER", organizationId, managerUserId);
            if (team?.Status == "ACTIVE") return (team.SalesPercent, team.ManagerPercent, "MANAGER", team.Id);
        }
        var system = Latest(rules, "SYSTEM");
        if (system?.Status == "ACTIVE") return (system.SalesPercent, system.ManagerPercent, "SYSTEM", system.Id);
        return (DefaultSales, DefaultManager, "SYSTEM_DEFAULT", null);
    }

    /// <summary>
    /// Freeze the policy that existed when the cash was received. A subsequent
    /// Director edit never recalculates previously accrued commission.
    /// </summary>
    internal static (decimal Sales, decimal Manager, string Source, long? VersionId) ResolveAt(
        IEnumerable<BoardCommissionPolicyVersion> policies,
        long organizationId, long? managerUserId, long salesUserId, DateTime receivedAt)
    {
        var eligible = policies.Where(p => p.CreatedAt <= receivedAt);
        return Resolve(eligible, organizationId, managerUserId, salesUserId);
    }

    private static async Task<IResult> List(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        if (!await HasDirectorAccess(http, db, ct)) return Results.Forbid();
        var organizations = await db.Organizations.AsNoTracking().Where(x => x.Status == "ACTIVE")
            .OrderBy(x => x.Name).Select(x => new { x.Id, x.Name, x.Code }).ToArrayAsync(ct);
        var personnel = await (from m in db.OrganizationMemberships.AsNoTracking()
            join u in db.Users.AsNoTracking() on m.UserId equals u.Id
            where m.Status == "ACTIVE" && u.Status == "ACTIVE" &&
                db.UserRoles.Any(ur => ur.UserId == u.Id &&
                    db.Roles.Any(r => r.Id == ur.RoleId && r.Code == "SALES"))
            select new { m.OrganizationId, m.UserId, m.ManagerUserId, u.Name, u.Email, u.Code })
            .ToArrayAsync(ct);
        var managers = await (from m in db.OrganizationMemberships.AsNoTracking()
            join u in db.Users.AsNoTracking() on m.UserId equals u.Id
            where m.Status == "ACTIVE" && u.Status == "ACTIVE" &&
                db.UserRoles.Any(ur => ur.UserId == u.Id &&
                    db.Roles.Any(r => r.Id == ur.RoleId && r.Code == "SALES_MANAGER"))
            select new { u.Id, m.OrganizationId, u.Name, u.Email, u.Code })
            .ToArrayAsync(ct);
        var policies = await db.BoardCommissionPolicyVersions.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).ToArrayAsync(ct);
        var current = personnel.Select(s =>
        {
            var resolved = Resolve(policies, s.OrganizationId, s.ManagerUserId, s.UserId);
            var manager = managers.FirstOrDefault(m => m.Id == s.ManagerUserId);
            return new {
                s.UserId, s.OrganizationId, s.ManagerUserId, s.Name, s.Email, s.Code,
                ManagerName = manager?.Name, ManagerEmail = manager?.Email,
                SalesPercent = resolved.Sales, ManagerPercent = resolved.Manager,
                TotalPercent = resolved.Sales + resolved.Manager,
                Source = resolved.Source, VersionId = resolved.VersionId,
                OwnVersionId = Latest(policies, "SALES", s.OrganizationId, salesUserId: s.UserId)?.Id,
                HasOwnOverride = Latest(policies, "SALES", s.OrganizationId, salesUserId: s.UserId)?.Status == "ACTIVE"
            };
        }).OrderBy(x => x.Name).ThenBy(x => x.UserId).ToArray();
        var system = Latest(policies, "SYSTEM");
        return Results.Ok(new {
            defaults = new {
                salesPercent = system?.Status == "ACTIVE" ? system.SalesPercent : DefaultSales,
                managerPercent = system?.Status == "ACTIVE" ? system.ManagerPercent : DefaultManager,
                versionId = system?.Id,
                isConfigured = system?.Status == "ACTIVE"
            },
            organizations, managers, data = current, history = policies
        });
    }

    private static async Task<IResult> Save(SaveBoardCommissionRequest request, HttpContext http,
        KidsfitDbContext db, CancellationToken ct)
    {
        if (!await HasDirectorAccess(http, db, ct)) return Results.Forbid();
        var scope = request.Scope?.Trim().ToUpperInvariant();
        if (scope is not ("SYSTEM" or "MANAGER" or "SALES"))
            throw ApiValidationException.For("scope", "Phạm vi phải là SYSTEM, MANAGER hoặc SALES.");
        if (!request.SalesPercent.HasValue)
            throw ApiValidationException.For("sales_percent", "Bắt buộc nhập tỷ lệ hoa hồng Sales.");
        if (!request.ManagerPercent.HasValue)
            throw ApiValidationException.For("manager_percent", "Bắt buộc nhập tỷ lệ hoa hồng Quản lý.");
        if (!ValidRates(request.SalesPercent.Value, request.ManagerPercent.Value))
            throw ApiValidationException.For("sales_percent", "Tỷ lệ phải từ 0 đến 100%, tổng tối đa 100%, tối đa 4 chữ số thập phân.");
        if (scope == "SYSTEM" && (request.OrganizationId.HasValue ||
            request.ManagerUserId.HasValue || request.SalesUserId.HasValue))
            throw ApiValidationException.For("scope", "Mặc định toàn hệ thống không chọn nhân sự hoặc tổ chức.");
        if (scope != "SYSTEM" && !request.OrganizationId.HasValue)
            throw ApiValidationException.For("organization_id", "Vui lòng chọn tổ chức.");
        if (scope == "MANAGER" && (!request.ManagerUserId.HasValue || request.SalesUserId.HasValue))
            throw ApiValidationException.For("manager_user_id", "Vui lòng chọn Quản lý hợp lệ.");
        if (scope == "SALES" && (!request.SalesUserId.HasValue || request.ManagerUserId.HasValue))
            throw ApiValidationException.For("sales_user_id", "Vui lòng chọn Sales hợp lệ.");

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await LockWrites(db, ct);
        if (scope != "SYSTEM" && !await db.Organizations.AnyAsync(x =>
            x.Id == request.OrganizationId && x.Status == "ACTIVE", ct))
            throw ApiValidationException.For("organization_id", "Tổ chức không còn hoạt động.");
        if (scope == "MANAGER" && !await db.OrganizationMemberships.AnyAsync(m =>
            m.OrganizationId == request.OrganizationId && m.UserId == request.ManagerUserId &&
            m.Status == "ACTIVE" &&
            db.Users.Any(u => u.Id == m.UserId && u.Status == "ACTIVE") &&
            db.UserRoles.Any(ur => ur.UserId == m.UserId &&
                db.Roles.Any(r => r.Id == ur.RoleId && r.Code == "SALES_MANAGER")), ct))
            throw ApiValidationException.For("manager_user_id", "Quản lý không còn thuộc tổ chức đang hoạt động.");
        if (scope == "SALES" && !await db.OrganizationMemberships.AnyAsync(m =>
            m.OrganizationId == request.OrganizationId && m.UserId == request.SalesUserId &&
            m.Status == "ACTIVE" &&
            db.Users.Any(u => u.Id == m.UserId && u.Status == "ACTIVE") &&
            db.UserRoles.Any(ur => ur.UserId == m.UserId &&
                db.Roles.Any(r => r.Id == ur.RoleId && r.Code == "SALES")), ct))
            throw ApiValidationException.For("sales_user_id", "Sales không còn thuộc tổ chức đang hoạt động.");

        var versions = await db.BoardCommissionPolicyVersions.AsNoTracking().ToArrayAsync(ct);
        var previous = Latest(versions, scope!, request.OrganizationId, request.ManagerUserId, request.SalesUserId);
        if (previous?.Id != request.ExpectedVersionId)
            throw new ApiConflictException("Chính sách đã thay đổi trên phiên khác. Hãy tải lại trước khi lưu.");
        var now = DateTime.UtcNow;
        var record = new BoardCommissionPolicyVersion {
            Scope = scope!, OrganizationId = scope == "SYSTEM" ? null : request.OrganizationId,
            ManagerUserId = scope == "MANAGER" ? request.ManagerUserId : null,
            SalesUserId = scope == "SALES" ? request.SalesUserId : null,
            SalesPercent = request.SalesPercent.Value, ManagerPercent = request.ManagerPercent.Value,
            Status = "ACTIVE", CreatedByUserId = http.UserId(), CreatedAt = now, UpdatedAt = now
        };
        await Append(db, http, previous, record, ct);
        await transaction.CommitAsync(ct);
        return Results.Created("/api/channel-sales/board-commission",
            new { data = new { id = record.Id, appliedAt = now } });
    }

    private static async Task<IResult> Reset(long id, ResetBoardCommissionRequest request,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        if (!await HasDirectorAccess(http, db, ct)) return Results.Forbid();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await LockWrites(db, ct);
        var target = await db.BoardCommissionPolicyVersions.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (target.Scope == "SYSTEM")
            throw ApiValidationException.For("scope", "Không thể khôi phục mặc định hệ thống về trạng thái trống.");
        var versions = await db.BoardCommissionPolicyVersions.AsNoTracking().ToArrayAsync(ct);
        var latest = Latest(versions, target.Scope, target.OrganizationId, target.ManagerUserId, target.SalesUserId);
        if (latest?.Id != id || request.ExpectedVersionId != id || target.Status != "ACTIVE")
            throw new ApiConflictException("Chính sách đã thay đổi. Hãy tải lại danh sách.");
        var now = DateTime.UtcNow;
        var reset = new BoardCommissionPolicyVersion {
            Scope = target.Scope, OrganizationId = target.OrganizationId,
            ManagerUserId = target.ManagerUserId, SalesUserId = target.SalesUserId,
            Status = "RESET", SalesPercent = 0m, ManagerPercent = 0m,
            CreatedByUserId = http.UserId(), CreatedAt = now, UpdatedAt = now
        };
        await Append(db, http, target, reset, ct);
        await transaction.CommitAsync(ct);
        return Results.Ok(new { message = "Đã khôi phục chính sách kế thừa.", appliedAt = now });
    }

    private static async Task LockWrites(KidsfitDbContext db, CancellationToken ct)
    {
        var lockId = await db.Organizations.AsNoTracking().OrderBy(x => x.Id)
            .Select(x => x.Id).FirstOrDefaultAsync(ct);
        if (lockId == 0) throw new ApiConflictException("Chưa có tổ chức để cấu hình hoa hồng.");
        await db.Organizations.FromSqlInterpolated(
            $"SELECT * FROM organizations WHERE id = {lockId} FOR UPDATE").SingleAsync(ct);
    }

    private static async Task Append(KidsfitDbContext db, HttpContext http,
        BoardCommissionPolicyVersion? previous, BoardCommissionPolicyVersion record, CancellationToken ct)
    {
        db.BoardCommissionPolicyVersions.Add(record);
        await db.SaveChangesAsync(ct);
        Audit.Add(db, http.UserId(), "SAVE_BOARD_COMMISSION_POLICY",
            nameof(BoardCommissionPolicyVersion), record.Id,
            previous is null ? null : new {
                previous.Id, previous.Status, previous.SalesPercent,
                previous.ManagerPercent, previous.CreatedAt
            }, new {
                record.Scope, record.OrganizationId, record.ManagerUserId, record.SalesUserId,
                record.Status, record.SalesPercent, record.ManagerPercent, record.CreatedAt
            }, http);
        await db.SaveChangesAsync(ct);
    }
}

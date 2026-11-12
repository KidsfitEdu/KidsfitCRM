using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>The client never controls effective time or audit reason: successful writes apply immediately.</summary>
public sealed record SaveCommissionAllocationRequest(
    long OrganizationId, long? ManagerUserId, long? SalesUserId,
    decimal SalesPercent, decimal ManagerPercent, decimal CeilingPercent,
    decimal? ManagerCeilingPercent = null, string? ApplyScope = null);

/// <summary>
/// Configuration only. Does not create commission ledger entries, approve payments, or change historical money.
/// BGĐ limit versions and manager split versions remain separate; the server owns effective timestamps.
/// </summary>
public static class CommissionAllocationEndpoints
{
    public static void MapCommissionAllocation(this RouteGroupBuilder group)
    {
        group.MapGet("/commission-config/board", BoardList)
            .RequireAuthorization(Permissions.ChannelSalesPolicyManage);
        group.MapPost("/commission-config/board", CreateBoard)
            .RequireAuthorization(Permissions.ChannelSalesPolicyManage);
        group.MapGet("/commission-config/manager", ManagerList)
            .RequireAuthorization(Permissions.ChannelSalesTeamManage);
        group.MapPost("/commission-config/manager", CreateManager)
            .RequireAuthorization(Permissions.ChannelSalesTeamManage);
        group.MapPost("/commission-config/board/{id:long}/cancel", CancelBoard)
            .RequireAuthorization(Permissions.ChannelSalesPolicyManage);
        group.MapPost("/commission-config/manager/{id:long}/cancel", CancelManager)
            .RequireAuthorization(Permissions.ChannelSalesTeamManage);
    }

    private static async Task<IResult> BoardList(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesPolicyManage)) return Results.Forbid();
        var items = await db.CommissionAllocationVersions.AsNoTracking()
            .Where(x => x.ConfiguredBy == "DIRECTOR" && (access.All || access.OrganizationIds.Contains(x.OrganizationId)))
            .OrderByDescending(x => x.EffectiveFrom).ThenByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id).Take(500).ToArrayAsync(ct);
        var organizations = await db.Organizations.AsNoTracking()
            .Where(x => access.All || access.OrganizationIds.Contains(x.Id))
            .Select(x => new { x.Id, x.Name, x.Code }).ToArrayAsync(ct);
        var members = await (from m in db.OrganizationMemberships.AsNoTracking()
            join u in db.Users.AsNoTracking() on m.UserId equals u.Id
            where m.Status == "ACTIVE" && u.Status == "ACTIVE"
                && (access.All || access.OrganizationIds.Contains(m.OrganizationId))
            select new { m.OrganizationId, m.UserId, m.ManagerUserId, u.Name }).ToArrayAsync(ct);
        return Results.Ok(new { data = items, organizations, members });
    }

    private static async Task<IResult> ManagerList(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesTeamManage)) return Results.Forbid();
        var today = ChannelSalesValidation.BusinessDate(DateTime.UtcNow);
        var team = await (from m in db.OrganizationMemberships.AsNoTracking()
            join u in db.Users.AsNoTracking() on m.UserId equals u.Id
            where m.ManagerUserId == access.UserId && m.Status == "ACTIVE"
                && access.OrganizationIds.Contains(m.OrganizationId) && u.Status == "ACTIVE"
            select new { m.UserId, m.OrganizationId, u.Name }).ToArrayAsync(ct);
        var orgIds = team.Select(x => x.OrganizationId).Distinct().ToArray();
        var salesIds = team.Select(x => x.UserId).Distinct().ToArray();
        var systemOrgId = await db.Organizations.AsNoTracking().Where(x => x.Code == "KIDSFIT")
            .Select(x => x.Id).SingleOrDefaultAsync(ct);
        var director = await db.CommissionAllocationVersions.AsNoTracking()
            .Where(x => x.ConfiguredBy == "DIRECTOR" && x.EffectiveFrom <= today
                && (orgIds.Contains(x.OrganizationId) || (x.Scope == "SYSTEM" && x.OrganizationId == systemOrgId)))
            .ToArrayAsync(ct);
        var manager = await db.CommissionAllocationVersions.AsNoTracking()
            .Where(x => x.ConfiguredBy == "MANAGER" && x.ManagerUserId == access.UserId
                && orgIds.Contains(x.OrganizationId) && salesIds.Contains(x.SalesUserId ?? -1))
            .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).ToArrayAsync(ct);
        var data = team.Select(s =>
        {
            var limit = ResolveBoard(director, s.OrganizationId, access.UserId, s.UserId);
            var split = ResolveManager(manager, s.OrganizationId, access.UserId, s.UserId, today);
            var valid = split is not null && limit is not null
                && FitsWithin(limit, split.SalesPercent, split.ManagerPercent);
            var invalid = split is not null && !valid;
            return new
            {
                s.UserId, s.OrganizationId, s.Name,
                CeilingPercent = limit?.CeilingPercent,
                ManagerCeilingPercent = limit is null ? (decimal?)null : ManagerCap(limit),
                SalesPercent = invalid ? (decimal?)null : valid ? split!.SalesPercent : limit?.SalesPercent,
                ManagerPercent = invalid ? (decimal?)null : valid ? split!.ManagerPercent : limit?.ManagerPercent,
                Source = invalid ? "INVALID_OVERRIDE" : valid ? "MANAGER"
                    : limit is null ? "UNCONFIGURED" : "DIRECTOR_DEFAULT",
                HasInvalidOverride = invalid,
                EffectiveFrom = valid ? split!.EffectiveFrom : limit?.EffectiveFrom
            };
        }).ToArray();
        return Results.Ok(new { data, history = manager });
    }

    private static async Task<IResult> CreateBoard(SaveCommissionAllocationRequest request,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesPolicyManage) || !access.CanManageOrganization(request.OrganizationId))
            return Results.Forbid();
        ValidateRates(request, true);
        var scope = request.ApplyScope == "SYSTEM" ? "SYSTEM"
            : request.SalesUserId.HasValue ? "SALES"
            : request.ManagerUserId.HasValue ? "MANAGER" : "ORGANIZATION";
        if (scope == "SYSTEM")
        {
            if (request.ManagerUserId.HasValue || request.SalesUserId.HasValue
                || !await db.Organizations.AnyAsync(x => x.Id == request.OrganizationId && x.Code == "KIDSFIT", ct))
                throw ApiValidationException.For("apply_scope", "Mặc định hệ thống phải thuộc KIDSFIT và không chọn nhân sự.");
        }
        else if (request.ApplyScope is not null && request.ApplyScope != "ORGANIZATION")
            throw ApiValidationException.For("apply_scope", "Phạm vi áp dụng không hợp lệ.");
        if (scope is "MANAGER" or "SALES")
            await CheckMembership(db, request.OrganizationId, request.ManagerUserId, request.SalesUserId, ct);

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await db.Organizations.FromSqlInterpolated(
            $"SELECT * FROM organizations WHERE id = {request.OrganizationId} FOR UPDATE").SingleAsync(ct);
        var now = DateTime.UtcNow;
        var existing = await db.CommissionAllocationVersions.AsNoTracking()
            .Where(x => x.ConfiguredBy == "DIRECTOR").ToArrayAsync(ct);
        var next = NewRecord(request, scope, "DIRECTOR", http.UserId(), now);
        var relevant = existing.Where(x => x.EffectiveFrom <= ChannelSalesValidation.BusinessDate(now))
            .Append(next).ToArray();
        var memberships = await (from m in db.OrganizationMemberships.AsNoTracking()
            join u in db.Users.AsNoTracking() on m.UserId equals u.Id
            where m.Status == "ACTIVE" && u.Status == "ACTIVE" && m.ManagerUserId != null
            select new { m.OrganizationId, m.ManagerUserId, m.UserId }).ToArrayAsync(ct);
        var allSplits = await db.CommissionAllocationVersions.AsNoTracking()
            .Where(x => x.ConfiguredBy == "MANAGER"
                && x.EffectiveFrom <= ChannelSalesValidation.BusinessDate(now)).ToArrayAsync(ct);
        var conflicts = memberships.Count(m =>
        {
            var allocation = ResolveManager(allSplits, m.OrganizationId,
                m.ManagerUserId!.Value, m.UserId, ChannelSalesValidation.BusinessDate(now));
            if (allocation is null) return false;
            var prior = ResolveBoard(existing.Where(x => x.EffectiveFrom <= ChannelSalesValidation.BusinessDate(now)),
                m.OrganizationId, m.ManagerUserId.Value, m.UserId);
            var after = ResolveBoard(relevant, m.OrganizationId, m.ManagerUserId.Value, m.UserId);
            return prior is not null && after is not null
                && FitsWithin(prior, allocation.SalesPercent, allocation.ManagerPercent)
                && !FitsWithin(after, allocation.SalesPercent, allocation.ManagerPercent);
        });
        if (conflicts > 0)
            throw new ApiConflictException(
                $"Không thể áp dụng hạn mức mới: {conflicts} Sales đang có phân bổ vượt ngưỡng. Quản lý cần điều chỉnh hoặc khôi phục trước.");
        await Save(db, next, http, ct);
        await transaction.CommitAsync(ct);
        return Results.Created("/api/channel-sales/commission-config/board",
            new { data = new { id = next.Id, applied_at = next.CreatedAt } });
    }

    private static async Task<IResult> CreateManager(SaveCommissionAllocationRequest request,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesTeamManage) || !access.InOrganization(request.OrganizationId))
            return Results.Forbid();
        if (!request.SalesUserId.HasValue
            || (request.ManagerUserId.HasValue && request.ManagerUserId.Value != access.UserId))
            throw ApiValidationException.For("sales_user_id", "Chỉ được phân bổ cho Sales trực thuộc.");
        request = request with { ManagerUserId = access.UserId };
        ValidateRates(request, false);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await db.Organizations.FromSqlInterpolated(
            $"SELECT * FROM organizations WHERE id = {request.OrganizationId} FOR UPDATE").SingleAsync(ct);
        await CheckMembership(db, request.OrganizationId, access.UserId, request.SalesUserId, ct);
        var now = DateTime.UtcNow;
        var today = ChannelSalesValidation.BusinessDate(now);
        var director = await db.CommissionAllocationVersions.AsNoTracking()
            .Where(x => x.ConfiguredBy == "DIRECTOR" && x.EffectiveFrom <= today).ToArrayAsync(ct);
        var limit = ResolveBoard(director, request.OrganizationId, access.UserId, request.SalesUserId.Value)
            ?? throw ApiValidationException.For("organization_id", "BGĐ chưa cấu hình hạn mức hoa hồng.");
        if (!FitsWithin(limit, request.SalesPercent, request.ManagerPercent))
            throw ApiValidationException.For("manager_percent",
                $"Phân bổ vượt hạn mức BGĐ (tổng {limit.CeilingPercent}%, phần Quản lý tối đa {ManagerCap(limit)}%).");
        var record = NewRecord(request with
        {
            CeilingPercent = limit.CeilingPercent,
            ManagerCeilingPercent = ManagerCap(limit)
        }, "SALES", "MANAGER", access.UserId, now);
        await Save(db, record, http, ct);
        await transaction.CommitAsync(ct);
        return Results.Created("/api/channel-sales/commission-config/manager",
            new { data = new { id = record.Id, applied_at = record.CreatedAt } });
    }

    private static Task<IResult> CancelBoard(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
        => Cancel(id, http, db, "DIRECTOR", Permissions.ChannelSalesPolicyManage, ct);
    private static Task<IResult> CancelManager(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
        => Cancel(id, http, db, "MANAGER", Permissions.ChannelSalesTeamManage, ct);

    private static async Task<IResult> Cancel(long id, HttpContext http, KidsfitDbContext db,
        string owner, string permission, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(permission)) return Results.Forbid();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var lookup = await db.CommissionAllocationVersions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException();
        await db.Organizations.FromSqlInterpolated(
            $"SELECT * FROM organizations WHERE id = {lookup.OrganizationId} FOR UPDATE").SingleAsync(ct);
        var item = await db.CommissionAllocationVersions.FromSqlInterpolated(
            $"SELECT * FROM commission_allocation_versions WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (item.ConfiguredBy != owner || (!access.All && !access.InOrganization(item.OrganizationId)))
            return Results.Forbid();
        if (owner == "MANAGER" && item.ManagerUserId != access.UserId) return Results.Forbid();
        var now = DateTime.UtcNow;
        var today = ChannelSalesValidation.BusinessDate(now);
        var versions = await db.CommissionAllocationVersions.AsNoTracking().Where(x =>
            x.ConfiguredBy == owner && x.OrganizationId == item.OrganizationId
            && x.Scope == item.Scope && x.ManagerUserId == item.ManagerUserId
            && x.SalesUserId == item.SalesUserId && x.EffectiveFrom <= today).ToArrayAsync(ct);
        var latest = versions.OrderByDescending(x => x.EffectiveFrom)
            .ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).FirstOrDefault();
        if (item.Status != "ACTIVE" || latest?.Id != item.Id)
            throw new ApiConflictException("Chỉ được khôi phục phiên bản đang áp dụng mới nhất.");
        var reset = new CommissionAllocationVersion
        {
            OrganizationId = item.OrganizationId, ManagerUserId = item.ManagerUserId,
            SalesUserId = item.SalesUserId, Scope = item.Scope,
            ConfiguredBy = owner, SalesPercent = 0, ManagerPercent = 0,
            CeilingPercent = 0, ManagerCeilingPercent = null,
            EffectiveFrom = today, Status = "RESET", Reason = "AUTO_RESET",
            CreatedByUserId = access.UserId, CreatedAt = now, UpdatedAt = now
        };
        await Save(db, reset, http, ct);
        await transaction.CommitAsync(ct);
        return Results.Ok(new { message = "Đã khôi phục chính sách kế thừa.", applied_at = now });
    }

    /// <summary>Scope precedence is independent of author: Sales > Manager > Organization > System.</summary>
    internal static CommissionAllocationVersion? ResolveBoard(IEnumerable<CommissionAllocationVersion> rules,
        long organizationId, long managerId, long salesId)
    {
        var all = rules.Where(x => x.ConfiguredBy == "DIRECTOR"
            && (x.OrganizationId == organizationId || x.Scope == "SYSTEM")).ToArray();
        foreach (var scope in new[] { "SALES", "MANAGER", "ORGANIZATION", "SYSTEM" })
        {
            var version = all.Where(x => x.Scope == scope && (scope switch
            {
                "SALES" => x.OrganizationId == organizationId && x.ManagerUserId == managerId && x.SalesUserId == salesId,
                "MANAGER" => x.OrganizationId == organizationId && x.ManagerUserId == managerId,
                "ORGANIZATION" => x.OrganizationId == organizationId,
                "SYSTEM" => true,
                _ => false
            })).OrderByDescending(x => x.EffectiveFrom).ThenByDescending(x => x.CreatedAt)
              .ThenByDescending(x => x.Id).FirstOrDefault();
            if (version?.Status == "ACTIVE") return version;
            // RESET tombstones disable only this scope; fall back to the next scope.
        }
        return null;
    }

    internal static CommissionAllocationVersion? ResolveManager(IEnumerable<CommissionAllocationVersion> versions,
        long organizationId, long managerId, long salesId, DateOnly today)
    {
        var version = versions.Where(x => x.ConfiguredBy == "MANAGER"
            && x.OrganizationId == organizationId && x.ManagerUserId == managerId
            && x.SalesUserId == salesId && x.EffectiveFrom <= today)
            .OrderByDescending(x => x.EffectiveFrom).ThenByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id).FirstOrDefault();
        return version?.Status == "ACTIVE" ? version : null;
    }

    internal static decimal ManagerCap(CommissionAllocationVersion limit)
        => limit.ManagerCeilingPercent ?? limit.CeilingPercent;

    internal static bool FitsWithin(CommissionAllocationVersion limit, decimal sales, decimal manager)
        => sales >= 0 && manager >= 0 && sales + manager <= limit.CeilingPercent
            && manager <= ManagerCap(limit);

    private static async Task CheckMembership(KidsfitDbContext db, long org, long? manager, long? sales, CancellationToken ct)
    {
        if (!manager.HasValue || !await db.OrganizationMemberships.AnyAsync(x =>
            x.OrganizationId == org && x.UserId == manager && x.Status == "ACTIVE", ct))
            throw ApiValidationException.For("manager_user_id", "Quản lý không thuộc tổ chức đang hoạt động.");
        if (sales.HasValue && !await db.OrganizationMemberships.AnyAsync(x =>
            x.OrganizationId == org && x.UserId == sales && x.ManagerUserId == manager && x.Status == "ACTIVE", ct))
            throw ApiValidationException.For("sales_user_id", "Sales không trực thuộc Quản lý đã chọn.");
    }

    private static void ValidateRates(SaveCommissionAllocationRequest request, bool board)
    {
        if (request.SalesPercent < 0 || request.ManagerPercent < 0
            || request.SalesPercent > 100 || request.ManagerPercent > 100
            || decimal.Round(request.SalesPercent, 4) != request.SalesPercent
            || decimal.Round(request.ManagerPercent, 4) != request.ManagerPercent)
            throw ApiValidationException.For("sales_percent", "Tỷ lệ phải từ 0 đến 100%, tối đa bốn chữ số thập phân.");
        if (board)
        {
            var cap = request.ManagerCeilingPercent ?? request.CeilingPercent;
            if (request.CeilingPercent < 0 || request.CeilingPercent > 100
                || decimal.Round(request.CeilingPercent, 4) != request.CeilingPercent
                || cap < request.ManagerPercent || cap > request.CeilingPercent || cap < 0
                || decimal.Round(cap, 4) != cap
                || request.SalesPercent + request.ManagerPercent > request.CeilingPercent)
                throw ApiValidationException.For("ceiling_percent", "Hạn mức tổng hoặc trần riêng Quản lý không hợp lệ.");
        }
    }

    private static CommissionAllocationVersion NewRecord(SaveCommissionAllocationRequest request,
        string scope, string configuredBy, long actorId, DateTime now)
        => new()
        {
            OrganizationId = request.OrganizationId,
            ManagerUserId = request.ManagerUserId, SalesUserId = request.SalesUserId,
            Scope = scope, ConfiguredBy = configuredBy,
            SalesPercent = request.SalesPercent, ManagerPercent = request.ManagerPercent,
            CeilingPercent = request.CeilingPercent,
            ManagerCeilingPercent = request.ManagerCeilingPercent,
            EffectiveFrom = ChannelSalesValidation.BusinessDate(now),
            Status = "ACTIVE", Reason = "AUTO_POLICY_UPDATE",
            CreatedByUserId = actorId, CreatedAt = now, UpdatedAt = now
        };

    private static async Task Save(KidsfitDbContext db, CommissionAllocationVersion record,
        HttpContext http, CancellationToken ct)
    {
        db.CommissionAllocationVersions.Add(record);
        await db.SaveChangesAsync(ct);
        Audit.Add(db, http.UserId(), "SAVE_COMMISSION_ALLOCATION_VERSION",
            nameof(CommissionAllocationVersion), record.Id, null, new
            {
                record.OrganizationId, record.ManagerUserId, record.SalesUserId,
                record.Scope, record.ConfiguredBy, record.CeilingPercent, record.ManagerCeilingPercent,
                record.SalesPercent, record.ManagerPercent, record.EffectiveFrom, record.Status,
                applied_at = record.CreatedAt
            }, http);
        await db.SaveChangesAsync(ct);
    }
}

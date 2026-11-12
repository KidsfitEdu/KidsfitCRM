using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed record SaveCommissionAllocationRequest(
    long OrganizationId, long? ManagerUserId, long? SalesUserId,
    decimal SalesPercent, decimal ManagerPercent, decimal CeilingPercent,
    DateOnly EffectiveFrom, string? Reason, string? ApplyScope = null);

/// <summary>
/// Configuration-only commission splits. This does not create ledger entries or change payout rules.
/// Board limits and manager allocations live in separate version streams.
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
            .OrderByDescending(x => x.EffectiveFrom).ThenByDescending(x => x.Id).Take(500).ToArrayAsync(ct);
        var organizations = await db.Organizations.AsNoTracking().Where(x => access.All || access.OrganizationIds.Contains(x.Id))
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
        var systemOrgId = await db.Organizations.Where(x => x.Code == "KIDSFIT").Select(x => x.Id).SingleOrDefaultAsync(ct);
        var salesIds = team.Select(x => x.UserId).ToArray();
        var director = await db.CommissionAllocationVersions.AsNoTracking()
            .Where(x => x.ConfiguredBy == "DIRECTOR" && x.Status == "ACTIVE" && x.EffectiveFrom <= today
                && (orgIds.Contains(x.OrganizationId) || (x.Scope == "SYSTEM" && x.OrganizationId == systemOrgId)))
            .OrderByDescending(x => x.EffectiveFrom).ThenByDescending(x => x.Id).ToArrayAsync(ct);
        var manager = await db.CommissionAllocationVersions.AsNoTracking()
            .Where(x => x.ConfiguredBy == "MANAGER" && x.ManagerUserId == access.UserId
                && orgIds.Contains(x.OrganizationId) && salesIds.Contains(x.SalesUserId ?? -1))
            .OrderByDescending(x => x.EffectiveFrom).ThenByDescending(x => x.Id).ToArrayAsync(ct);
        var data = team.Select(s =>
        {
            var limit = ResolveBoard(director, s.OrganizationId, access.UserId, s.UserId);
            var split = manager.FirstOrDefault(x => x.SalesUserId == s.UserId && x.OrganizationId == s.OrganizationId
                && x.Status == "ACTIVE" && x.EffectiveFrom <= today);
            var validSplit = split != null && limit != null && split.SalesPercent + split.ManagerPercent <= limit.CeilingPercent;
            return new
            {
                s.UserId, s.OrganizationId, s.Name,
                CeilingPercent = limit?.CeilingPercent,
                SalesPercent = validSplit ? split!.SalesPercent : limit?.SalesPercent,
                ManagerPercent = validSplit ? split!.ManagerPercent : limit?.ManagerPercent,
                Source = validSplit ? "MANAGER" : limit == null ? "UNCONFIGURED" : "DIRECTOR_DEFAULT",
                HasInvalidOverride = split != null && !validSplit,
                EffectiveFrom = validSplit ? split!.EffectiveFrom : limit?.EffectiveFrom
            };
        }).ToArray();
        return Results.Ok(new { data, history = manager });
    }

    private static async Task<IResult> CreateBoard(SaveCommissionAllocationRequest request, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesPolicyManage) || !access.CanManageOrganization(request.OrganizationId))
            return Results.Forbid();
        ValidateRates(request, requireCeiling: true);
        var scope = request.ApplyScope == "SYSTEM" ? "SYSTEM"
            : request.SalesUserId.HasValue ? "SALES" : request.ManagerUserId.HasValue ? "MANAGER" : "ORGANIZATION";
        if (scope == "SYSTEM")
        {
            if (request.ManagerUserId.HasValue || request.SalesUserId.HasValue
                || !await db.Organizations.AnyAsync(x => x.Id == request.OrganizationId && x.Code == "KIDSFIT", ct))
                throw ApiValidationException.For("apply_scope", "Mặc định toàn hệ thống phải thuộc tổ chức KIDSFIT và không chọn nhân sự.");
        }
        else if (request.ApplyScope is not null && request.ApplyScope != "ORGANIZATION")
            throw ApiValidationException.For("apply_scope", "Phạm vi áp dụng không hợp lệ.");
        if (scope != "ORGANIZATION")
            await CheckMembership(db, request.OrganizationId, request.ManagerUserId, request.SalesUserId, ct);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await db.Organizations.FromSqlInterpolated($"SELECT * FROM organizations WHERE id = {request.OrganizationId} FOR UPDATE").SingleAsync(ct);
        var newVersion = await Save(db, request, scope, "DIRECTOR", http, ct);
        await transaction.CommitAsync(ct);
        return Results.Created("/api/channel-sales/commission-config/board", new { data = new { id = newVersion.Id } });
    }

    private static async Task<IResult> CreateManager(SaveCommissionAllocationRequest request, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesTeamManage) || !access.InOrganization(request.OrganizationId))
            return Results.Forbid();
        if (!request.SalesUserId.HasValue || (request.ManagerUserId.HasValue && request.ManagerUserId != access.UserId))
            throw ApiValidationException.For("sales_user_id", "Quản lý chỉ phân bổ cho Sales trực thuộc.");
        request = request with { ManagerUserId = access.UserId };
        ValidateRates(request, requireCeiling: false);
        await CheckMembership(db, request.OrganizationId, access.UserId, request.SalesUserId, ct);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await db.Organizations.FromSqlInterpolated($"SELECT * FROM organizations WHERE id = {request.OrganizationId} FOR UPDATE").SingleAsync(ct);
        var today = ChannelSalesValidation.BusinessDate(DateTime.UtcNow);
        var director = await db.CommissionAllocationVersions.AsNoTracking()
            .Where(x => x.OrganizationId == request.OrganizationId && x.ConfiguredBy == "DIRECTOR"
                && x.Status == "ACTIVE" && x.EffectiveFrom <= request.EffectiveFrom)
            .OrderByDescending(x => x.EffectiveFrom).ThenByDescending(x => x.Id).ToArrayAsync(ct);
        var limit = ResolveBoard(director, request.OrganizationId, access.UserId, request.SalesUserId.Value)
            ?? throw ApiValidationException.For("organization_id", "BGĐ chưa cấp chính sách hoa hồng cho nhân sự này.");
        if (request.SalesPercent + request.ManagerPercent > limit.CeilingPercent)
            throw ApiValidationException.For("sales_percent", $"Tổng phân bổ vượt hạn mức BGĐ cấp ({limit.CeilingPercent}%).");
        // Do not permit future grants to rely on a board version already superseded on that date.
        var newVersion = await Save(db, request with { CeilingPercent = limit.CeilingPercent }, "SALES", "MANAGER", http, ct);
        await transaction.CommitAsync(ct);
        return Results.Created("/api/channel-sales/commission-config/manager", new { data = new { id = newVersion.Id } });
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
        var item = await db.CommissionAllocationVersions
            .FromSqlInterpolated($"SELECT * FROM commission_allocation_versions WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (item.ConfiguredBy != owner || (!access.All && !access.InOrganization(item.OrganizationId)))
            return Results.Forbid();
        if (owner == "MANAGER" && item.ManagerUserId != access.UserId) return Results.Forbid();
        if (item.EffectiveFrom <= ChannelSalesValidation.BusinessDate(DateTime.UtcNow) || item.Status != "ACTIVE")
            throw new ApiConflictException("Chỉ được hủy phiên bản chưa tới ngày hiệu lực.");
        item.Status = "CANCELLED";
        item.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, http.UserId(), "CANCEL_COMMISSION_ALLOCATION_VERSION", nameof(CommissionAllocationVersion),
            item.Id, new { status = "ACTIVE" }, new { status = "CANCELLED" }, http);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Results.Ok(new { message = "Đã hủy cấu hình chưa có hiệu lực." });
    }

    internal static CommissionAllocationVersion? ResolveBoard(IEnumerable<CommissionAllocationVersion> rules,
        long organizationId, long managerId, long salesId)
    {
        return rules.Where(x => (x.OrganizationId == organizationId || x.Scope == "SYSTEM") && x.ConfiguredBy == "DIRECTOR")
            .Where(x => x.Scope switch
            {
                "SALES" => x.ManagerUserId == managerId && x.SalesUserId == salesId,
                "MANAGER" => x.ManagerUserId == managerId,
                "ORGANIZATION" => true,
                "SYSTEM" => true,
                _ => false
            })
            .OrderByDescending(x => x.Scope == "SALES" ? 4 : x.Scope == "MANAGER" ? 3 : x.Scope == "ORGANIZATION" ? 2 : 1)
            .ThenByDescending(x => x.EffectiveFrom).ThenByDescending(x => x.Id).FirstOrDefault();
    }

    private static async Task CheckMembership(KidsfitDbContext db, long org, long? manager, long? sales, CancellationToken ct)
    {
        if (!manager.HasValue || !await db.OrganizationMemberships.AnyAsync(x => x.OrganizationId == org
            && x.UserId == manager && x.Status == "ACTIVE", ct))
            throw ApiValidationException.For("manager_user_id", "Quản lý không thuộc tổ chức đang hoạt động.");
        if (sales.HasValue && !await db.OrganizationMemberships.AnyAsync(x => x.OrganizationId == org
            && x.UserId == sales && x.ManagerUserId == manager && x.Status == "ACTIVE", ct))
            throw ApiValidationException.For("sales_user_id", "Sales không trực thuộc Quản lý đã chọn.");
    }

    private static void ValidateRates(SaveCommissionAllocationRequest request, bool requireCeiling)
    {
        var today = ChannelSalesValidation.BusinessDate(DateTime.UtcNow);
        if (request.EffectiveFrom <= today)
            throw ApiValidationException.For("effective_from", "Phiên bản mới chỉ áp dụng từ ngày mai.");
        if (request.SalesPercent < 0 || request.ManagerPercent < 0
            || request.SalesPercent > 100 || request.ManagerPercent > 100
            || decimal.Round(request.SalesPercent, 4) != request.SalesPercent
            || decimal.Round(request.ManagerPercent, 4) != request.ManagerPercent)
            throw ApiValidationException.For("sales_percent", "Tỷ lệ phải nằm trong 0–100%, tối đa bốn chữ số thập phân.");
        if (requireCeiling && (request.CeilingPercent < 0 || request.CeilingPercent > 100
            || decimal.Round(request.CeilingPercent, 4) != request.CeilingPercent
            || request.SalesPercent + request.ManagerPercent > request.CeilingPercent))
            throw ApiValidationException.For("ceiling_percent", "Hạn mức không hợp lệ hoặc thấp hơn tổng tỷ lệ mặc định.");
    }

    private static async Task<CommissionAllocationVersion> Save(KidsfitDbContext db,
        SaveCommissionAllocationRequest request, string scope, string configuredBy, HttpContext http, CancellationToken ct)
    {
        if (await db.CommissionAllocationVersions.AnyAsync(x =>
            x.OrganizationId == request.OrganizationId && x.Scope == scope && x.ConfiguredBy == configuredBy
            && x.ManagerUserId == request.ManagerUserId && x.SalesUserId == request.SalesUserId
            && x.EffectiveFrom == request.EffectiveFrom && x.Status == "ACTIVE", ct))
            throw new ApiConflictException("Đã có cấu hình hiệu lực cùng ngày cho nhân sự/phạm vi này.");
        var now = DateTime.UtcNow;
        var reason = request.Reason?.Trim() ?? "";
        if (reason.Length is < 5 or > 1000)
            throw ApiValidationException.For("reason", "Cần lý do điều chỉnh dài từ 5 đến 1000 ký tự.");
        var record = new CommissionAllocationVersion
        {
            OrganizationId = request.OrganizationId, ManagerUserId = request.ManagerUserId,
            SalesUserId = request.SalesUserId, Scope = scope, ConfiguredBy = configuredBy,
            SalesPercent = request.SalesPercent, ManagerPercent = request.ManagerPercent,
            CeilingPercent = request.CeilingPercent, EffectiveFrom = request.EffectiveFrom,
            Status = "ACTIVE", Reason = reason, CreatedByUserId = http.UserId(),
            CreatedAt = now, UpdatedAt = now
        };
        db.CommissionAllocationVersions.Add(record);
        await db.SaveChangesAsync(ct);
        Audit.Add(db, http.UserId(), "CREATE_COMMISSION_ALLOCATION_VERSION", nameof(CommissionAllocationVersion),
            record.Id, null, new { record.OrganizationId, record.ManagerUserId, record.SalesUserId,
                record.ConfiguredBy, record.Scope, record.CeilingPercent, record.SalesPercent,
                record.ManagerPercent, record.EffectiveFrom, record.Reason }, http);
        await db.SaveChangesAsync(ct);
        return record;
    }
}

using System.Net.Mail;
using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed record UpdateAdminMemberRequest(string? Name, string? Phone, string? RoleCode, string? Reason, long? ManagerUserId = null);
public sealed record CreateAdminPartnerRequest(string? Code, string? Name);
public sealed record UpdateAdminPartnerRequest(string? Name, string? Status, string? Reason);

/// <summary>Admin-only identity and partner maintenance. Do not delete users, memberships or audit history.</summary>
public static class AdminPersonnelEndpoints
{
    public static void MapAdminPersonnel(this RouteGroupBuilder group)
    {
        group.MapPatch("/admin/team/{id:long}", UpdateMember)
            .RequireAuthorization(Permissions.ChannelSalesIdentityManage);
        group.MapPost("/admin/partners", CreatePartner)
            .RequireAuthorization(Permissions.ChannelSalesIdentityManage);
        group.MapPatch("/admin/partners/{id:long}", UpdatePartner)
            .RequireAuthorization(Permissions.ChannelSalesIdentityManage);
    }

    private static async Task<ChannelSalesAccess> Admin(KidsfitDbContext db, long actor, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, actor, ct);
        if (!access.All || !access.Has(Permissions.ChannelSalesIdentityManage) ||
            !await db.Organizations.AnyAsync(x => x.Code == "KIDSFIT" && access.OrganizationIds.Contains(x.Id), ct))
            throw new KeyNotFoundException();
        return access;
    }

    private static async Task<IResult> UpdateMember(long id, UpdateAdminMemberRequest request, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var actor = http.UserId();
        await Admin(db, actor, ct);
        var name = Validation.Required(request.Name, "name", "Cần họ tên nhân sự.", 190);
        var reason = Validation.Required(request.Reason, "reason", "Cần lý do cập nhật tài khoản.", 2000);
        var phone = request.Phone?.Trim();
        if (phone?.Length > 40) throw ApiValidationException.For("phone", "Số điện thoại tối đa 40 ký tự.");
        if (phone is { Length: 0 }) phone = null;
        var code = Validation.Required(request.RoleCode, "role_code", "Chọn vai trò.", 32).ToUpperInvariant();
        if (code is not ("SALES" or "SALES_MANAGER" or "ACCOUNTANT" or "CUSTOMER_SERVICE" or "CHECKEE"))
            throw ApiValidationException.For("role_code", "Không thể cấp vai trò Admin/BGĐ hoặc vai trò hệ thống tại đây.");

        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var membership = await db.OrganizationMemberships.FromSqlInterpolated($"SELECT * FROM organization_memberships WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (membership.UserId == actor) throw new ApiConflictException("Không tự sửa vai trò của chính mình.");
        var user = await db.Users.FromSqlInterpolated($"SELECT * FROM users WHERE id = {membership.UserId} FOR UPDATE")
            .SingleAsync(ct);
        var currentRoles = await (from link in db.UserRoles
            join role in db.Roles on link.RoleId equals role.Id
            where link.UserId == user.Id
            select new { link.RoleId, role.Code }).ToArrayAsync(ct);
        if (currentRoles.Length != 1 || currentRoles[0].Code is "ADMIN" or "DIRECTOR" or "BOARD")
            throw new ApiConflictException("Tài khoản có vai trò đặc quyền hoặc nhiều vai trò; cần quy trình phân quyền riêng.");
        var organization = await db.Organizations.SingleAsync(x => x.Id == membership.OrganizationId, ct);
        if ((code == "CHECKEE") != (organization.OrganizationType == "CHECKEE"))
            throw new ApiConflictException("Vai trò CHECKEE phải thuộc tổ chức CHECKEE; không cấp chéo phạm vi.");
        var oldRole = currentRoles[0].Code;
        if (oldRole == "SALES_MANAGER" && code != oldRole &&
            await db.OrganizationMemberships.AnyAsync(x => x.ManagerUserId == user.Id && x.Status == "ACTIVE", ct))
            throw new ApiConflictException("Cần đổi Quản lý trực tiếp của các thành viên trong đội trước khi đổi vai trò.");
        if (oldRole != code)
        {
            if (await db.OrganizationMemberships.AnyAsync(x => x.UserId == user.Id && x.Id != id && x.Status == "ACTIVE", ct))
                throw new ApiConflictException("Tài khoản đang thuộc nhiều tổ chức; cần phân quyền theo từng tổ chức trước khi đổi vai trò.");
            if (await db.ApproachRegistrations.AnyAsync(x => x.OwnerUserId == user.Id && x.Status == "ACTIVE", ct)
                || await db.SalesContracts.AnyAsync(x => x.OwnerUserId == user.Id && x.Status != "CANCELLED" && x.Status != "REJECTED", ct))
                throw new ApiConflictException("Cần bàn giao trường và hợp đồng đang phụ trách trước khi đổi vai trò.");
            var role = await db.Roles.SingleOrDefaultAsync(x => x.Code == code, ct) ?? throw new KeyNotFoundException();
            var link = await db.UserRoles.SingleAsync(x => x.UserId == user.Id && x.RoleId == currentRoles[0].RoleId, ct);
            db.UserRoles.Remove(link);
            db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
            membership.MembershipType = code;
        }
        if (code == "SALES")
        {
            if (request.ManagerUserId.HasValue)
            {
                if (request.ManagerUserId == user.Id || !await db.OrganizationMemberships.AnyAsync(x =>
                    x.UserId == request.ManagerUserId.Value && x.OrganizationId == membership.OrganizationId &&
                    x.Status == "ACTIVE" && x.MembershipType == "SALES_MANAGER", ct))
                    throw ApiValidationException.For("manager_user_id", "Quản lý trực tiếp phải đang hoạt động trong cùng tổ chức.");
                membership.ManagerUserId = request.ManagerUserId;
            }
            if (!membership.ManagerUserId.HasValue && organization.OrganizationType != "CHECKEE")
                throw ApiValidationException.For("manager_user_id", "Sales cần được gán Quản lý bán hàng trực tiếp.");
        }
        else if (oldRole != code) membership.ManagerUserId = null;
        var old = new { user.Name, user.Phone, role = oldRole };
        user.Name = name;
        user.Phone = phone;
        user.UpdatedAt = DateTime.UtcNow;
        membership.UpdatedAt = user.UpdatedAt;
        Audit.Add(db, actor, "UPDATE_ADMIN_PERSONNEL", nameof(User), user.Id, old,
            new { user.Name, user.Phone, role = code, reason, membership.Id, membership.ManagerUserId }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.Ok(new { message = "Đã cập nhật nhân sự." });
    }

    private static async Task<IResult> CreatePartner(CreateAdminPartnerRequest request, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var actor = http.UserId();
        await Admin(db, actor, ct);
        var code = Validation.Required(request.Code, "code", "Cần mã đối tác.", 32).ToUpperInvariant();
        if (!System.Text.RegularExpressions.Regex.IsMatch(code, "^[A-Z0-9_-]+$"))
            throw ApiValidationException.For("code", "Mã đối tác chỉ gồm chữ in hoa, số, dấu gạch nối hoặc gạch dưới.");
        if (code is "KIDSFIT" or "CHECKEE") throw ApiValidationException.For("code", "Mã tổ chức hệ thống được bảo vệ.");
        var name = Validation.Required(request.Name, "name", "Cần tên đối tác.", 190);
        if (await db.Organizations.AnyAsync(x => x.Code == code, ct))
            throw new ApiConflictException("Mã đối tác đã tồn tại.");
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var now = DateTime.UtcNow;
        var organization = new Organization { Code = code, Name = name, OrganizationType = "PARTNER",
            Status = "ACTIVE", CreatedAt = now, UpdatedAt = now };
        db.Organizations.Add(organization);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) { throw new ApiConflictException("Mã đối tác đã tồn tại."); }
        Audit.Add(db, actor, "CREATE_ADMIN_PARTNER", nameof(Organization), organization.Id, null,
            new { organization.Code, organization.Name, organization.Status }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.Created($"/api/channel-sales/admin/partners/{organization.Id}", new { data = new { organization.Id } });
    }

    private static async Task<IResult> UpdatePartner(long id, UpdateAdminPartnerRequest request, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var actor = http.UserId();
        await Admin(db, actor, ct);
        var name = Validation.Required(request.Name, "name", "Cần tên đối tác.", 190);
        var reason = Validation.Required(request.Reason, "reason", "Cần lý do thay đổi tổ chức.", 2000);
        var status = Validation.Required(request.Status, "status", "Cần trạng thái.", 24).ToUpperInvariant();
        if (status is not ("ACTIVE" or "SUSPENDED")) throw ApiValidationException.For("status", "Trạng thái không hợp lệ.");
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var org = await db.Organizations.FromSqlInterpolated($"SELECT * FROM organizations WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (org.OrganizationType != "PARTNER")
            throw new ApiConflictException("Không sửa tổ chức hệ thống KIDSFIT/CHECKEE tại đây.");
        if (status == "SUSPENDED" && await db.OrganizationMemberships.AnyAsync(x => x.OrganizationId == org.Id && x.Status == "ACTIVE", ct))
            throw new ApiConflictException("Cần bàn giao và ngừng các thành viên hoạt động trước khi khóa đối tác.");
        var old = new { org.Name, org.Status };
        org.Name = name; org.Status = status; org.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, actor, "UPDATE_ADMIN_PARTNER", nameof(Organization), org.Id,
            old, new { org.Name, org.Status, reason }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.Ok(new { message = "Đã cập nhật đối tác." });
    }
}

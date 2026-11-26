using System.Net.Mail;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    public async Task<long> CreateSalesAccount(CreateSalesAccountRequest request, long actorId, IPasswordHasher<User> hasher, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesTeamManage, ct);
        if (!access.CanManageOrganization(request.OrganizationId)) throw new KeyNotFoundException();
        var targetOrganization = await db.Organizations.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.OrganizationId, ct)
            ?? throw new KeyNotFoundException();
        if (targetOrganization.Status != "ACTIVE")
            throw new ApiConflictException("Tổ chức đang tạm khóa; không thể tạo thành viên mới.");
        var name = Validation.Required(request.Name, "name", "Vui lòng nhập họ tên.", 190);
        var email = Validation.Required(request.Email, "email", "Vui lòng nhập email.", 190).ToLowerInvariant();
        if (!MailAddress.TryCreate(email, out var address) || address.Address != email) throw ApiValidationException.For("email", "Email không hợp lệ.");
        var password = Validation.Required(request.Password, "password", "Vui lòng nhập mật khẩu tối thiểu 12 ký tự.", 128);
        if (password.Length < 12) throw ApiValidationException.For("password", "Mật khẩu tối thiểu 12 ký tự.");
        var requestedRole = (request.RoleCode ?? "SALES").Trim().ToUpperInvariant();
        // Canonical seven-role permission model. Partner scope is controlled by memberships,
        // never by a global PARTNER_ADMIN or PARTNER_COLLABORATOR role.
        var roleCode = requestedRole switch
        {
            "BOARD" => "DIRECTOR",
            "CUSTOMER_CARE" => "CUSTOMER_SERVICE",
            "CHANNEL_SALES" or "PARTNER_COLLABORATOR" => "SALES",
            "PARTNER_ADMIN" => "SALES_MANAGER",
            _ => requestedRole
        };
        var allowed = new[] { "ADMIN", "DIRECTOR", "ACCOUNTANT", "SALES_MANAGER", "CUSTOMER_SERVICE", "SALES", "CHECKEE" };
        if (!allowed.Contains(roleCode)) throw ApiValidationException.For("role_code", "Vai trò không được hỗ trợ.");
        if (!access.Has(Permissions.ChannelSalesIdentityManage) && roleCode != "SALES")
            throw new KeyNotFoundException();
        // ADMIN is provisioned only through bootstrap/privileged identity procedures.
        if (roleCode == "ADMIN")
            throw new ApiConflictException("Không cấp tài khoản Admin qua chức năng quản lý nhân sự.");
        // Creating privileged identities must require the actual KIDSFIT ADMIN role,
        // not merely a claimed role_code or a broadly assigned team permission.
        if (roleCode is "DIRECTOR" or "CHECKEE")
        {
            if (!access.All || !access.Has(Permissions.ChannelSalesIdentityManage)
                || !await db.UserRoles.AnyAsync(x => x.UserId == actorId &&
                    db.Roles.Any(r => r.Id == x.RoleId && r.Code == "ADMIN"), ct)
                || !await db.OrganizationMemberships.AnyAsync(x => x.UserId == actorId
                    && x.Status == "ACTIVE" && db.Organizations.Any(o => o.Id == x.OrganizationId
                        && o.Code == "KIDSFIT" && o.Status == "ACTIVE"), ct))
                throw new KeyNotFoundException();
        }
        // The seeded CHECKEE organization has type VENDOR. Use its immutable code
        // rather than incorrectly expecting an organization_type named CHECKEE.
        if ((roleCode == "CHECKEE") != (targetOrganization.Code == "CHECKEE"))
            throw new ApiConflictException("Vai trò CHECKEE chỉ thuộc tổ chức CHECKEE.");
        if (roleCode is "DIRECTOR" or "ACCOUNTANT" or "CUSTOMER_SERVICE"
            && targetOrganization.Code != "KIDSFIT")
            throw new ApiConflictException("Vai trò nội bộ chỉ thuộc tổ chức KIDSFIT.");
        if (targetOrganization.Code != "KIDSFIT" && targetOrganization.Code != "CHECKEE"
            && roleCode is not ("SALES" or "SALES_MANAGER"))
            throw new ApiConflictException("Đối tác chỉ được cấp tài khoản Sales/CTV và Quản lý bán hàng.");
        long? managerId = null;
        if (roleCode == "SALES")
        {
            managerId = request.ManagerUserId ?? (access.Has(Permissions.ChannelSalesIdentityManage) ? null : actorId);
            if (!managerId.HasValue && access.Has(Permissions.ChannelSalesIdentityManage))
            {
                // Compatibility for existing Admin API clients: choose only an unambiguous active manager.
                var managers = await db.OrganizationMemberships.Where(x => x.OrganizationId == request.OrganizationId
                    && x.Status == "ACTIVE" && (x.MembershipType == "SALES_MANAGER" || x.MembershipType == "PARTNER_ADMIN"))
                    .Select(x => x.UserId).Take(2).ToArrayAsync(ct);
                if (managers.Length == 1) managerId = managers[0];
            }
            if (managerId.HasValue && !await db.OrganizationMemberships.AnyAsync(x =>
                x.UserId == managerId.Value && x.OrganizationId == request.OrganizationId && x.Status == "ACTIVE" &&
                (x.MembershipType == "SALES_MANAGER" || x.MembershipType == "PARTNER_ADMIN"), ct))
                throw ApiValidationException.For("manager_user_id", "Quản lý bán hàng không thuộc tổ chức hoặc đã ngưng hoạt động.");
            if (!managerId.HasValue && targetOrganization.Code != "CHECKEE")
                throw ApiValidationException.For("manager_user_id", "Cần chọn Quản lý bán hàng trực tiếp cùng tổ chức.");
        }
        var role = await db.Roles.SingleOrDefaultAsync(x => x.Code == roleCode, ct) ?? throw new KeyNotFoundException();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var user = new User { Code = "USR-" + Guid.NewGuid().ToString("N")[..16].ToUpperInvariant(), Name = name, Email = email, Status = "ACTIVE", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        user.Password = hasher.HashPassword(user, password);
        db.Users.Add(user);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) { throw new ApiConflictException("Email đã được sử dụng. Không tự gán tài khoản đã tồn tại vào tổ chức khác."); }
        db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        var membership = new OrganizationMembership { UserId = user.Id, OrganizationId = request.OrganizationId, ManagerUserId = managerId, MembershipType = roleCode == "SALES" ? "SALES" : roleCode, Status = "ACTIVE", IsPrimary = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.OrganizationMemberships.Add(membership);
        Audit.Add(db, actorId, "CREATE_CHANNEL_ACCOUNT", nameof(User), user.Id, null, new { request.OrganizationId, roleCode }, http);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return user.Id;
    }

    public async Task ChangeMembershipStatus(long id, ChangeMembershipStatusRequest request, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesTeamManage, ct);
        var membership = await db.OrganizationMemberships.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(membership.OrganizationId) || membership.UserId == actorId
            || (!access.All && membership.ManagerUserId != actorId)) throw new KeyNotFoundException();
        if (!access.Has(Permissions.ChannelSalesIdentityManage) && membership.MembershipType is not ("SALES" or "COLLABORATOR" or "PARTNER_COLLABORATOR")) throw new KeyNotFoundException();
        var status = request.Status?.ToUpperInvariant();
        if (status is not ("ACTIVE" or "SUSPENDED")) throw ApiValidationException.For("status", "Trạng thái không hợp lệ.");
        var previous = membership.Status;
        if (previous == status) return;
        if (status == "SUSPENDED")
        {
            await CompleteSchoolHandover(id, new(request.IdempotencyKey, request.Reason, request.Summary, false), actorId, http, ct);
            return;
        }
        await ReactivateSchoolMembership(id, new(request.Reason ?? "Khôi phục thành viên theo quản lý tài khoản."), actorId, http, ct);
    }
}

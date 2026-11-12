using KidsfitCRM.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>
/// Initial configuration only. Does not add sample schools, people, contracts or finance records.
/// Never clears records created after initial setup.
/// </summary>
public static class InitialCrmSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<KidsfitDbContext>();
        var config = services.GetRequiredService<IConfiguration>();
        var environment = services.GetRequiredService<IHostEnvironment>();
        if (!environment.IsDevelopment() || !config.GetValue<bool>("Seed:DisposableDatabase"))
            throw new InvalidOperationException("Initial CRM bootstrap is restricted to an explicitly disposable Development database.");

        var password = config["Seed:AdminPassword"];
        if (string.IsNullOrWhiteSpace(password) || password.Length < 12)
            throw new InvalidOperationException("Seed:AdminPassword must be set privately with at least 12 characters.");

        var hasher = services.GetRequiredService<IPasswordHasher<User>>();
        var now = DateTime.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync();

        var roleSeeds = new (string Code, string Name)[]
        {
            ("ADMIN", "Quản trị viên"),
            ("DIRECTOR", "Ban Giám Đốc"),
            ("ACCOUNTANT", "Kế toán"),
            ("SALES_MANAGER", "Quản lý bán hàng"),
            ("CUSTOMER_SERVICE", "Chăm sóc khách hàng"),
            ("CHECKEE", "Bộ phận xác minh hợp đồng"),
            ("SALES", "Nhân viên bán hàng / CTV"),
        };
        var existingRoleCodesForBootstrap = await db.Roles.Select(x => x.Code).ToArrayAsync();
        db.Roles.AddRange(roleSeeds.Where(x => !existingRoleCodesForBootstrap.Contains(x.Code))
            .Select(x => new Role { Code = x.Code, Name = x.Name, CreatedAt = now, UpdatedAt = now }));
        await db.SaveChangesAsync();

        var channelPermissionSeeds = new (string Code, string Name)[]
        {
            ("channel_sales.customer.view", "Xem khách hàng CHECKEE"),
            ("channel_sales.approach.register", "Đăng ký tiếp cận khách hàng"),
            ("channel_sales.activity.create", "Ghi nhận hoạt động tiếp cận"),
            ("channel_sales.contract.report", "Báo cáo hợp đồng CHECKEE"),
            ("channel_sales.revenue.record", "Ghi nhận doanh thu CHECKEE"),
            ("channel_sales.commission.view", "Xem hoa hồng CHECKEE"),
            ("channel_sales.reconcile", "Đối soát quyền khách hàng"),
            ("channel_sales.manage", "Quản trị CRM CHECKEE"),
            ("channel_sales.scope.organization", "Xem dữ liệu trong tổ chức"),
            ("channel_sales.scope.all", "Xem toàn bộ dữ liệu CHECKEE"),
            ("channel_sales.payout.create", "Lập phiếu chi hoa hồng"),
            ("channel_sales.payout.approve", "Duyệt phiếu chi hoa hồng"),
            ("channel_sales.payout.complete", "Ghi nhận đã chi hoa hồng"),
            ("channel_sales.policy.manage", "Tạo phiên bản chính sách hoa hồng"),
            ("channel_sales.team.manage", "Quản lý nhân sự và CTV"),
            ("channel_sales.identity.manage", "Cấp vai trò tài khoản CRM"),
            ("channel_sales.commission.adjust", "Ghi nhận điều chỉnh hoa hồng"),
            (Permissions.SchoolDirectoryManage, "Quản lý danh bạ trường chính thức"),
            (Permissions.SchoolCapacityManage, "Điều chỉnh hạn mức trường của CTV"),
            (Permissions.SchoolContractReview, "Kiểm tra hợp đồng trường học"),
            (Permissions.SchoolProtectionGrant, "Ghi nhận bảo vệ trường đã xác minh"),
            (Permissions.SchoolProposalSubmit, "Đề xuất trường qua quản lý"),
            (Permissions.SchoolProposalReview, "Xét đề xuất của nhân sự"),
            (Permissions.SchoolAllocationManage, "Phân bổ và rà soát trường"),
            (Permissions.SchoolExtensionReview, "Xét gia hạn tiếp cận"),
            (Permissions.SchoolDisputeResolve, "Kết luận tranh chấp trường"),
            (Permissions.SchoolEscalationResolve, "Xử lý công việc trường quá hạn"),
            (Permissions.SchoolHandoverManage, "Bàn giao nhân sự ngưng hoạt động"),
            (Permissions.SchoolCareAssign, "Phân công và bàn giao CSKH"),
            (Permissions.SchoolSupportManage, "Quản lý yêu cầu hỗ trợ khách hàng"),
            (Permissions.SchoolTechnicalSupportHandle, "CHECKEE xử lý lỗi phần mềm"),
            (Permissions.SchoolWorkflowPolicyManage, "Xác nhận chính sách vận hành trường"),
            (Permissions.ChannelSalesContractCancel, "Ghi nhận quyết định hủy hợp đồng"),
            (Permissions.ChannelSalesRevenueRefund, "Ghi nhận khoản hoàn tiền thực tế"),
            (Permissions.ContractRenewalSubmit, "Gửi hồ sơ tái ký trực tiếp kế toán"),
            (Permissions.ContractRenewalReview, "Xem và yêu cầu bổ sung hồ sơ tái ký"),
            (Permissions.ContractRenewalConfirm, "Xác nhận hoặc từ chối hồ sơ tái ký"),
            (Permissions.ProtectionRenewalApprove, "Duyệt chu kỳ bảo vệ Sales 5 năm tại KIDSFIT"),
        };
        var existingPermissionCodes = await db.Permissions.Where(x => x.Code.StartsWith("channel_sales.")).Select(x => x.Code).ToArrayAsync();
        db.Permissions.AddRange(channelPermissionSeeds.Where(x => !existingPermissionCodes.Contains(x.Code)).Select(x => new Permission
        {
            Code = x.Code,
            Name = x.Name,
            Group = "CHECKEE",
            CreatedAt = now,
            UpdatedAt = now,
        }));
        // Persist newly added permissions before querying them for role grants.
        // EF Core queries do not include unsaved Added entities in ToDictionaryAsync.
        await db.SaveChangesAsync();

        var permissionByCode = await db.Permissions.Where(x => x.Code.StartsWith("channel_sales.")).ToDictionaryAsync(x => x.Code);
        var roleByCode = await db.Roles.ToDictionaryAsync(x => x.Code);
        var rolePermissions = new Dictionary<string, string[]>
        {
            ["ADMIN"] = permissionByCode.Keys.ToArray(),
            ["DIRECTOR"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesCommissionView, Permissions.ChannelSalesAllScope],
            ["ACCOUNTANT"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesRecordRevenue, Permissions.ChannelSalesCommissionView, Permissions.ChannelSalesOrganizationScope, Permissions.ChannelSalesPayoutCreate, Permissions.ChannelSalesPayoutApprove, Permissions.ChannelSalesPayoutComplete, Permissions.ChannelSalesCommissionAdjust],
            ["SALES_MANAGER"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesRegister, Permissions.ChannelSalesActivity, Permissions.ChannelSalesReportContract, Permissions.ChannelSalesCommissionView, Permissions.ChannelSalesManage, Permissions.ChannelSalesOrganizationScope, Permissions.ChannelSalesTeamManage, Permissions.ChannelSalesCommissionAdjust],
            ["CUSTOMER_SERVICE"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesActivity, Permissions.ChannelSalesOrganizationScope],
            ["SALES"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesRegister, Permissions.ChannelSalesActivity, Permissions.ChannelSalesReportContract, Permissions.ChannelSalesCommissionView],
            ["CHECKEE"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesReconcile, Permissions.ChannelSalesOrganizationScope],
        };
        var currentLinks = await db.PermissionRoles.Select(x => new { x.RoleId, x.PermissionId }).ToListAsync();
        foreach (var managerRole in new[] { "SALES_MANAGER" })
            rolePermissions[managerRole] = [.. rolePermissions[managerRole], Permissions.SchoolContractReview, Permissions.SchoolProposalReview,
                Permissions.SchoolAllocationManage, Permissions.SchoolExtensionReview, Permissions.SchoolHandoverManage, Permissions.ProtectionRenewalApprove];
        foreach (var salesRole in new[] { "SALES" })
            rolePermissions[salesRole] = [.. rolePermissions[salesRole], Permissions.SchoolProposalSubmit];
        rolePermissions["DIRECTOR"] = [.. rolePermissions["DIRECTOR"], Permissions.SchoolDisputeResolve, Permissions.SchoolEscalationResolve, Permissions.SchoolWorkflowPolicyManage, Permissions.ChannelSalesPolicyManage];
        rolePermissions["ACCOUNTANT"] = [.. rolePermissions["ACCOUNTANT"], Permissions.ChannelSalesContractCancel, Permissions.ChannelSalesRevenueRefund, Permissions.ContractRenewalReview, Permissions.ContractRenewalConfirm];
        rolePermissions["SALES"] = [.. rolePermissions["SALES"], Permissions.ContractRenewalSubmit];
        rolePermissions["CUSTOMER_SERVICE"] = [.. rolePermissions["CUSTOMER_SERVICE"], Permissions.SchoolSupportManage];
        rolePermissions["CHECKEE"] = [.. rolePermissions["CHECKEE"], Permissions.SchoolTechnicalSupportHandle];
        foreach (var bundle in rolePermissions)
        {
            if (!roleByCode.TryGetValue(bundle.Key, out var role)) continue;
            foreach (var permissionCode in bundle.Value)
            {
                var permission = permissionByCode[permissionCode];
                if (currentLinks.All(x => x.RoleId != role.Id || x.PermissionId != permission.Id))
                    db.PermissionRoles.Add(new PermissionRole { RoleId = role.Id, PermissionId = permission.Id });
            }
        }


        await db.SaveChangesAsync();

        var admin = await db.Users.SingleOrDefaultAsync(x => x.Email == "admin@kidsfit.vn");
        if (admin is null)
        {
            if (await db.Users.AnyAsync())
                throw new InvalidOperationException("Existing users detected. Initial bootstrap cannot create an Admin in a non-empty user database.");
            admin = new User
            {
                Code = "ADMIN001", Name = "Quản trị viên KIDSFIT", Email = "admin@kidsfit.vn",
                Status = "ACTIVE", EmailVerifiedAt = now, CreatedAt = now, UpdatedAt = now,
            };
            admin.Password = hasher.HashPassword(admin, password);
            db.Users.Add(admin);
            await db.SaveChangesAsync();
        }
        else if (admin.Code != "ADMIN001")
            throw new InvalidOperationException("Admin email is already owned by another account.");

        var adminRole = roleByCode["ADMIN"];
        if (!await db.UserRoles.AnyAsync(x => x.UserId == admin.Id && x.RoleId == adminRole.Id))
            db.UserRoles.Add(new UserRole { UserId = admin.Id, RoleId = adminRole.Id });

        async Task<Organization> EnsureOrganization(string code, string name, string type)
        {
            var existing = await db.Organizations.SingleOrDefaultAsync(x => x.Code == code);
            if (existing is not null) return existing;
            var organization = new Organization
            {
                Code = code, Name = name, OrganizationType = type, Status = "ACTIVE",
                CreatedAt = now, UpdatedAt = now,
            };
            db.Organizations.Add(organization);
            await db.SaveChangesAsync();
            return organization;
        }
        var kidsfit = await EnsureOrganization("KIDSFIT", "KIDSFIT", "INTERNAL");
        // The approved Sales rate is 30%. Set the organization ceiling only
        // during explicit initial bootstrap, without creating an active policy.
        if (kidsfit.CommissionRateCeiling == 0)
        {
            kidsfit.CommissionRateCeiling = 30m;
            kidsfit.UpdatedAt = now;
            await db.SaveChangesAsync();
        }
        await EnsureOrganization("CHECKEE", "CHECKEE", "VENDOR");

        if (!await db.OrganizationMemberships.AnyAsync(x => x.UserId == admin.Id && x.OrganizationId == kidsfit.Id))
            db.OrganizationMemberships.Add(new OrganizationMembership
            {
                UserId = admin.Id, OrganizationId = kidsfit.Id, MembershipType = "ADMIN",
                IsPrimary = true, Status = "ACTIVE", CreatedAt = now, UpdatedAt = now,
            });

        // Bootstrap only the two privileged operational identities approved for the CRM.
        // Passwords are supplied privately and never overwritten when re-running bootstrap.
        async Task<User> EnsureSystemAccount(string code, string email, string name, string roleCode, string secretName)
        {
            var user = await db.Users.SingleOrDefaultAsync(x => x.Email == email);
            if (user is null)
            {
                var secret = config[secretName];
                if (string.IsNullOrWhiteSpace(secret) || secret.Length < 12)
                    throw new InvalidOperationException($"{secretName} must be set privately with at least 12 characters before creating {roleCode}.");
                if (await db.Users.AnyAsync(x => x.Code == code))
                    throw new InvalidOperationException($"Bootstrap account code {code} already belongs to another user.");
                user = new User
                {
                    Code = code, Name = name, Email = email,
                    Status = "ACTIVE", EmailVerifiedAt = now, CreatedAt = now, UpdatedAt = now,
                };
                user.Password = hasher.HashPassword(user, secret);
                db.Users.Add(user);
                await db.SaveChangesAsync();
            }
            else if (user.Code != code)
                throw new InvalidOperationException($"Bootstrap email {email} already belongs to a different account.");

            var linkedRoles = await (from link in db.UserRoles
                                     join role in db.Roles on link.RoleId equals role.Id
                                     where link.UserId == user.Id
                                     select role.Code).ToArrayAsync();
            if (linkedRoles.Any(existing => existing != roleCode))
                throw new InvalidOperationException($"Bootstrap account {email} has an unexpected existing role.");
            var roleId = roleByCode[roleCode].Id;
            if (!linkedRoles.Contains(roleCode))
                db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId });
            return user;
        }

        async Task EnsureSystemMembership(User user, Organization organization, string roleCode)
        {
            var membership = await db.OrganizationMemberships.SingleOrDefaultAsync(x =>
                x.UserId == user.Id && x.OrganizationId == organization.Id);
            if (membership is null)
                db.OrganizationMemberships.Add(new OrganizationMembership
                {
                    UserId = user.Id, OrganizationId = organization.Id,
                    MembershipType = roleCode, IsPrimary = true, Status = "ACTIVE",
                    CreatedAt = now, UpdatedAt = now,
                });
            else if (membership.MembershipType != roleCode)
                throw new InvalidOperationException($"Bootstrap account {user.Email} has an unexpected membership type.");
        }

        var director = await EnsureSystemAccount("BOARD001", "board@kidsfit.vn",
            "Ban Giám Đốc KIDSFIT", "DIRECTOR", "Seed:BoardPassword");
        var checkee = await EnsureSystemAccount("CHECKEE001", "checkee@kidsfit.vn",
            "Bộ phận xác minh hợp đồng", "CHECKEE", "Seed:CheckeePassword");
        var checkeeOrganization = await db.Organizations.SingleAsync(x => x.Code == "CHECKEE");
        await EnsureSystemMembership(director, kidsfit, "DIRECTOR");
        await EnsureSystemMembership(checkee, checkeeOrganization, "CHECKEE");

        // Seed a proposal only. BGĐ decides whether and when to activate it.
        // Do not supersede or override existing policies maintained by users.
        if (!await db.SchoolWorkflowPolicies.AnyAsync(x => x.OrganizationId == kidsfit.Id))
        {
            const string draftReference = "KIDSFIT-INITIAL-V1-DRAFT";
            var fingerprint = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes(draftReference + ":24:48:24:7:3:21"))).ToLowerInvariant();
            db.SchoolWorkflowPolicies.Add(new SchoolWorkflowPolicyVersion
            {
                OrganizationId = kidsfit.Id, Version = 1, Status = "DRAFT",
                ManagerReviewHours = 24, AdminReviewHours = 48, InvitationHours = 24,
                MaxExtensionDays = 7, MaxExtensionCount = 3, MaxTotalExtensionDays = 21,
                DecisionReference = draftReference, RequestFingerprint = fingerprint,
                CreatedByUserId = director.Id, CreatedAt = now, UpdatedAt = now,
            });
        }

        await db.SaveChangesAsync();
        await transaction.CommitAsync();
    }
}

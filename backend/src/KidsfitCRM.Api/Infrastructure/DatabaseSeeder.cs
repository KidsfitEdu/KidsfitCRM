using KidsfitCRM.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace KidsfitCRM.Api.Infrastructure;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<KidsfitDbContext>();
        var config = services.GetRequiredService<IConfiguration>();
        var password = config["Seed:DemoPassword"];
        if (string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("Seed:DemoPassword is required.");
        if (!config.GetValue<bool>("Seed:DisposableDatabase"))
            throw new InvalidOperationException("Seed:DisposableDatabase=true is required.");
        if (services.GetService<IHostEnvironment>()?.IsProduction() == true)
            throw new InvalidOperationException("Demo seeding is forbidden in Production.");
        var hasher = services.GetRequiredService<IPasswordHasher<User>>();
        var now = DateTime.UtcNow;
        if (!await db.Roles.AnyAsync())
        {
            var adminRole = new Role { Code = "ADMIN", Name = "Quản trị viên", CreatedAt = now, UpdatedAt = now };
            var salesRole = new Role { Code = "SALES", Name = "Nhân viên bán hàng / CTV", CreatedAt = now, UpdatedAt = now };
            var admin = new User { Code = "ADMIN001", Name = "Admin Demo", Email = "admin@kidsfit.vn", Status = "ACTIVE", EmailVerifiedAt = now, CreatedAt = now, UpdatedAt = now };
            var sales = new User { Code = "SALES001", Name = "Sales Demo", Email = "sales@kidsfit.vn", Status = "ACTIVE", EmailVerifiedAt = now, CreatedAt = now, UpdatedAt = now };
            admin.Password = hasher.HashPassword(admin, password);
            sales.Password = hasher.HashPassword(sales, password);
            db.AddRange(adminRole, salesRole, admin, sales);
            await db.SaveChangesAsync();
            db.UserRoles.AddRange(new UserRole { UserId = admin.Id, RoleId = adminRole.Id }, new UserRole { UserId = sales.Id, RoleId = salesRole.Id });
            await db.SaveChangesAsync();
        }
        await SeedChannelSalesAsync(services, password);
        await NormalizeDemoPasswordsAsync(db, hasher, password);
        await CrmScenarioSeeder.SeedAsync(db, DateTime.UtcNow);
    }

    private static async Task NormalizeDemoPasswordsAsync(KidsfitDbContext db, IPasswordHasher<User> hasher, string password)
    {
        // This routine is restricted to the explicitly disposable database by SeedAsync.
        var demoAccounts = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["admin@kidsfit.vn"] = "ADMIN001",
            ["sales@kidsfit.vn"] = "SALES001",
            ["checkee@kidsfit.vn"] = "CHECKEE001",
            ["partner@kidsfit.vn"] = "PARTNER001",
            ["ctv@kidsfit.vn"] = "CTV001",
            ["accountant@kidsfit.vn"] = "ACC001",
            ["board@kidsfit.vn"] = "BOARD001",
            ["manager@kidsfit.vn"] = "MANAGER001",
            ["care@kidsfit.vn"] = "CARE001",
        };
        var users = await db.Users.Where(user => demoAccounts.Keys.Contains(user.Email)).ToListAsync();
        foreach (var user in users)
        {
            if (user.Code != demoAccounts[user.Email])
                throw new InvalidOperationException("Demo account identity collision; seed refused.");
            if (hasher.VerifyHashedPassword(user, user.Password, password) != PasswordVerificationResult.Success)
            {
                user.Password = hasher.HashPassword(user, password);
                user.UpdatedAt = DateTime.UtcNow;
            }
        }
        await db.SaveChangesAsync();
    }

    private static string Digits(string value) => string.Concat(value.Where(char.IsDigit));

    private static async Task SeedChannelSalesAsync(IServiceProvider services, string demoPassword)
    {
        var db = services.GetRequiredService<KidsfitDbContext>();
        var hasher = services.GetRequiredService<IPasswordHasher<User>>();
        var now = DateTime.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync();

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
            (Permissions.SchoolWorkflowPolicyManage, "Xác nhận chính sách vận hành trường"),
            (Permissions.ChannelSalesContractCancel, "Ghi nhận quyết định hủy hợp đồng"),
            (Permissions.ChannelSalesRevenueRefund, "Ghi nhận khoản hoàn tiền thực tế"),
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

        var roleSeeds = new (string Code, string Name)[]
        {
            ("DIRECTOR", "Ban Giám Đốc"),
            ("ACCOUNTANT", "Kế toán"),
            ("SALES_MANAGER", "Quản lý bán hàng"),
            ("CUSTOMER_SERVICE", "Chăm sóc khách hàng"),
            ("CHECKEE", "Bộ phận xác minh hợp đồng"),
        };
        var existingRoleCodes = await db.Roles.Select(x => x.Code).ToArrayAsync();
        db.Roles.AddRange(roleSeeds.Where(x => !existingRoleCodes.Contains(x.Code)).Select(x => new Role
        {
            Code = x.Code,
            Name = x.Name,
            CreatedAt = now,
            UpdatedAt = now,
        }));
        await db.SaveChangesAsync();

        var permissionByCode = await db.Permissions.Where(x => x.Code.StartsWith("channel_sales.")).ToDictionaryAsync(x => x.Code);
        var roleByCode = await db.Roles.ToDictionaryAsync(x => x.Code);
        var rolePermissions = new Dictionary<string, string[]>
        {
            ["ADMIN"] = permissionByCode.Keys.ToArray(),
            ["DIRECTOR"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesCommissionView, Permissions.ChannelSalesAllScope],
            ["ACCOUNTANT"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesRecordRevenue, Permissions.ChannelSalesCommissionView, Permissions.ChannelSalesOrganizationScope, Permissions.ChannelSalesPayoutCreate, Permissions.ChannelSalesPayoutApprove, Permissions.ChannelSalesPayoutComplete, Permissions.ChannelSalesCommissionAdjust],
            ["SALES_MANAGER"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesRegister, Permissions.ChannelSalesActivity, Permissions.ChannelSalesReportContract, Permissions.ChannelSalesCommissionView, Permissions.ChannelSalesManage, Permissions.ChannelSalesOrganizationScope, Permissions.ChannelSalesTeamManage],
            ["CUSTOMER_SERVICE"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesActivity, Permissions.ChannelSalesOrganizationScope],
            ["SALES"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesRegister, Permissions.ChannelSalesActivity, Permissions.ChannelSalesReportContract, Permissions.ChannelSalesCommissionView],
            ["CHECKEE"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesReconcile, Permissions.ChannelSalesOrganizationScope],
        };
        var currentLinks = await db.PermissionRoles.Select(x => new { x.RoleId, x.PermissionId }).ToListAsync();
        foreach (var managerRole in new[] { "SALES_MANAGER" })
            rolePermissions[managerRole] = [.. rolePermissions[managerRole], Permissions.SchoolContractReview, Permissions.SchoolProposalReview,
                Permissions.SchoolAllocationManage, Permissions.SchoolExtensionReview, Permissions.SchoolHandoverManage, Permissions.SchoolCareAssign];
        foreach (var salesRole in new[] { "SALES" })
            rolePermissions[salesRole] = [.. rolePermissions[salesRole], Permissions.SchoolProposalSubmit];
        rolePermissions["DIRECTOR"] = [.. rolePermissions["DIRECTOR"], Permissions.SchoolDisputeResolve, Permissions.SchoolEscalationResolve];
        rolePermissions["ACCOUNTANT"] = [.. rolePermissions["ACCOUNTANT"], Permissions.ChannelSalesContractCancel, Permissions.ChannelSalesRevenueRefund];
        rolePermissions["CUSTOMER_SERVICE"] = [.. rolePermissions["CUSTOMER_SERVICE"], Permissions.SchoolSupportManage];
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

        async Task<User> EnsureUser(string code, string name, string email, string roleCode)
        {
            var user = await db.Users.SingleOrDefaultAsync(x => x.Email == email);
            if (user is null)
            {
                user = new User { Code = code, Name = name, Email = email, Status = "ACTIVE", EmailVerifiedAt = now, CreatedAt = now, UpdatedAt = now };
                user.Password = hasher.HashPassword(user, demoPassword);
                db.Users.Add(user);
                await db.SaveChangesAsync();
            }
            var role = roleByCode[roleCode];
            if (!await db.UserRoles.AnyAsync(x => x.UserId == user.Id && x.RoleId == role.Id)) db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
            return user;
        }

        var admin = await db.Users.SingleAsync(x => x.Email == "admin@kidsfit.vn");
        var sales = await db.Users.SingleAsync(x => x.Email == "sales@kidsfit.vn");
        var checkeeUser = await EnsureUser("CHECKEE001", "CHECKEE Đối soát", "checkee@kidsfit.vn", "CHECKEE");
        var partnerUser = await EnsureUser("PARTNER001", "Quản lý đối tác An Phát", "partner@kidsfit.vn", "SALES_MANAGER");
        var collaborator = await EnsureUser("CTV001", "CTV Thu Hà", "ctv@kidsfit.vn", "SALES");
        var accountant = await EnsureUser("ACC001", "Kế toán KIDSFIT", "accountant@kidsfit.vn", "ACCOUNTANT");
        var board = await EnsureUser("BOARD001", "Ban giám đốc", "board@kidsfit.vn", "DIRECTOR");
        var manager = await EnsureUser("MANAGER001", "Quản lý bán hàng", "manager@kidsfit.vn", "SALES_MANAGER");
        var care = await EnsureUser("CARE001", "Chăm sóc khách hàng", "care@kidsfit.vn", "CUSTOMER_SERVICE");

        async Task<Organization> EnsureOrganization(string code, string name, string type)
        {
            var organization = await db.Organizations.SingleOrDefaultAsync(x => x.Code == code);
            if (organization is not null) return organization;
            organization = new Organization { Code = code, Name = name, OrganizationType = type, Status = "ACTIVE", CreatedAt = now, UpdatedAt = now };
            db.Organizations.Add(organization);
            await db.SaveChangesAsync();
            return organization;
        }
        var kidsfit = await EnsureOrganization("KIDSFIT", "KIDSFIT", "INTERNAL");
        var checkee = await EnsureOrganization("CHECKEE", "CHECKEE", "VENDOR");
        var partner = await EnsureOrganization("PARTNER_AN_PHAT", "Đối tác An Phát", "PARTNER");
        // Financial policy ceilings are pending product approval. Do not pre-activate percentages.


        async Task EnsureMembership(Organization organization, User user, string membershipType, bool primary, long? managerUserId = null)
        {
            if (await db.OrganizationMemberships.AnyAsync(x => x.OrganizationId == organization.Id && x.UserId == user.Id)) return;
            db.OrganizationMemberships.Add(new OrganizationMembership
            {
                OrganizationId = organization.Id,
                UserId = user.Id,
                ManagerUserId = managerUserId,
                MembershipType = membershipType,
                Status = "ACTIVE",
                IsPrimary = primary,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
        await EnsureMembership(kidsfit, admin, "ADMIN", true);
        await EnsureMembership(kidsfit, sales, "SALES", true, manager.Id);
        var sampleSalesMembership = await db.OrganizationMemberships.SingleOrDefaultAsync(x => x.UserId == sales.Id && x.OrganizationId == kidsfit.Id);
        if (sampleSalesMembership?.ManagerUserId == admin.Id) sampleSalesMembership.ManagerUserId = manager.Id;
        await EnsureMembership(kidsfit, accountant, "ACCOUNTANT", true, admin.Id);
        await EnsureMembership(kidsfit, board, "DIRECTOR", true, admin.Id);
        await EnsureMembership(kidsfit, manager, "SALES_MANAGER", true, admin.Id);
        await EnsureMembership(kidsfit, care, "CUSTOMER_SERVICE", true, admin.Id);
        await EnsureMembership(checkee, checkeeUser, "CHECKEE", true);
        await EnsureMembership(partner, partnerUser, "SALES_MANAGER", true);
        await EnsureMembership(partner, collaborator, "COLLABORATOR", true, partnerUser.Id);

        var packageSeeds = new (string Code, string Name, string Description, decimal Price)[]
        {
            ("CHECKEE_START", "CHECKEE Start", "Gói khởi động cho đơn vị quy mô nhỏ", 12_000_000m),
            ("CHECKEE_GROWTH", "CHECKEE Growth", "Gói vận hành và mở rộng đội ngũ", 30_000_000m),
            ("CHECKEE_ENTERPRISE", "CHECKEE Enterprise", "Gói tùy chỉnh cho chuỗi và doanh nghiệp", 60_000_000m),
        };
        var packageCodes = await db.CheckeeProductPackages.Select(x => x.Code).ToArrayAsync();
        db.CheckeeProductPackages.AddRange(packageSeeds.Where(x => !packageCodes.Contains(x.Code)).Select(x => new CheckeeProductPackage
        {
            Code = x.Code,
            Name = x.Name,
            Description = x.Description,
            ListPrice = x.Price,
            Status = "ACTIVE",
            CreatedAt = now,
            UpdatedAt = now,
        }));
        await db.SaveChangesAsync();

        if (!await db.CommissionPolicyVersions.AnyAsync(x => x.Code == "KIDSFIT-2026-V1"))
        {
            db.CommissionPolicyVersions.Add(new CommissionPolicyVersion
            {
                OrganizationId = kidsfit.Id,
                Code = "KIDSFIT-2026-V1",
                Name = "Chính sách mẫu KIDSFIT 2026",
                RatePercent = 0m,
                EffectiveFrom = new DateOnly(2026, 1, 1),
                Status = "DRAFT",
                CreatedByUserId = admin.Id,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
        if (!await db.CommissionPolicyVersions.AnyAsync(x => x.Code == "PARTNER-2026-V1"))
        {
            db.CommissionPolicyVersions.Add(new CommissionPolicyVersion
            {
                OrganizationId = partner.Id,
                Code = "PARTNER-2026-V1",
                Name = "Chính sách mẫu đối tác 2026",
                RatePercent = 0m,
                EffectiveFrom = new DateOnly(2026, 1, 1),
                Status = "DRAFT",
                CreatedByUserId = admin.Id,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
        await db.SaveChangesAsync();

        if (!await db.ChannelCustomers.AnyAsync(x => x.Code == "CUS-DEMO-AVAILABLE"))
        {
            var available = new ChannelCustomer
            {
                Code = "CUS-DEMO-AVAILABLE", CustomerType = "ORGANIZATION", DisplayName = "Trung tâm Mầm non Mặt Trời",
                LegalName = "Công ty TNHH Giáo dục Mặt Trời", TaxCode = "0319001001", Phone = "0901 111 222", PhoneNormalized = "0901111222",
                Email = "hello@mattroi.example", Province = "TP. Hồ Chí Minh", ContactName = "Nguyễn Hoàng Mai", ContactPosition = "Giám đốc",
                Source = "CHECKEE_DIRECTORY", LifecycleStatus = "PROSPECT", VerificationStatus = "VERIFIED", CreatedByUserId = admin.Id,
                OrganizationId = kidsfit.Id, CreatedAt = now.AddDays(-12), UpdatedAt = now.AddDays(-2),
            };
            db.ChannelCustomers.Add(available);
            await db.SaveChangesAsync();
            db.CustomerIdentifiers.AddRange(
                new CustomerIdentifier { CustomerId = available.Id, IdentifierType = "TAX_CODE", NormalizedValue = "0319001001", DisplayValue = "0319001001", IsVerified = true, CreatedAt = now, UpdatedAt = now },
                new CustomerIdentifier { CustomerId = available.Id, IdentifierType = "PHONE", NormalizedValue = "0901111222", DisplayValue = "0901 111 222", IsVerified = true, CreatedAt = now, UpdatedAt = now });
        }

        if (!await db.ChannelCustomers.AnyAsync(x => x.Code == "CUS-DEMO-APPROACH"))
        {
            var customer = new ChannelCustomer
            {
                Code = "CUS-DEMO-APPROACH", CustomerType = "ORGANIZATION", DisplayName = "Hệ thống Anh ngữ BlueSky",
                TaxCode = "0319001002", Phone = "0902 222 333", PhoneNormalized = "0902222333", ContactName = "Trần Thanh Tùng",
                Source = "REFERRAL", LifecycleStatus = "PROSPECT", VerificationStatus = "VERIFIED", CreatedByUserId = sales.Id,
                OrganizationId = kidsfit.Id, CreatedAt = now.AddDays(-3), UpdatedAt = now,
            };
            db.ChannelCustomers.Add(customer);
            await db.SaveChangesAsync();
            db.CustomerIdentifiers.Add(new CustomerIdentifier { CustomerId = customer.Id, IdentifierType = "TAX_CODE", NormalizedValue = "0319001002", DisplayValue = "0319001002", IsVerified = true, CreatedAt = now, UpdatedAt = now });
            var registration = new ApproachRegistration
            {
                CustomerId = customer.Id, OwnerUserId = sales.Id, OwnerOrganizationId = kidsfit.Id, CreatedByUserId = sales.Id,
                Status = "ACTIVE", RegisteredAt = now.AddDays(-2), ProtectedUntil = now.AddDays(3), Source = "REFERRAL",
                Note = "Đã hẹn demo sản phẩm vào chiều thứ sáu.", IdempotencyKey = "seed-approach-bluesky", CreatedAt = now.AddDays(-2), UpdatedAt = now,
            };
            db.ApproachRegistrations.Add(registration);
            await db.SaveChangesAsync();
            db.CustomerProtections.Add(new CustomerProtection { CustomerId = customer.Id, OwnerUserId = sales.Id, OwnerOrganizationId = kidsfit.Id, ApproachRegistrationId = registration.Id, SourceType = "APPROACH", Status = "ACTIVE", EffectiveFrom = registration.RegisteredAt, EffectiveUntil = registration.ProtectedUntil, CreatedAt = registration.RegisteredAt, UpdatedAt = now });
            db.CustomerActivities.Add(new CustomerActivity { CustomerId = customer.Id, ApproachRegistrationId = registration.Id, UserId = sales.Id, ActivityType = "MEETING", Content = "Đã giới thiệu tổng quan và thống nhất lịch demo.", NextFollowUpAt = now.AddDays(1), CreatedAt = now.AddDays(-1), UpdatedAt = now });
        }

        if (!await db.ChannelCustomers.AnyAsync(x => x.Code == "CUS-DEMO-CONTRACT"))
        {
            var package = await db.CheckeeProductPackages.SingleAsync(x => x.Code == "CHECKEE_GROWTH");
            var policy = await db.CommissionPolicyVersions.SingleAsync(x => x.Code == "KIDSFIT-2026-V1");
            var customer = new ChannelCustomer
            {
                Code = "CUS-DEMO-CONTRACT", CustomerType = "ORGANIZATION", DisplayName = "Trường Mầm non Happy House",
                TaxCode = "0319001003", Phone = "0903 333 444", PhoneNormalized = "0903333444", ContactName = "Lê Thu Hương",
                Source = "PARTNER_EVENT", LifecycleStatus = "CONTRACTED", VerificationStatus = "VERIFIED", CreatedByUserId = sales.Id,
                OrganizationId = kidsfit.Id, CreatedAt = now.AddDays(-45), UpdatedAt = now,
            };
            db.ChannelCustomers.Add(customer);
            await db.SaveChangesAsync();
            db.CustomerIdentifiers.Add(new CustomerIdentifier { CustomerId = customer.Id, IdentifierType = "TAX_CODE", NormalizedValue = "0319001003", DisplayValue = "0319001003", IsVerified = true, CreatedAt = now, UpdatedAt = now });
            var registration = new ApproachRegistration
            {
                CustomerId = customer.Id, OwnerUserId = sales.Id, OwnerOrganizationId = kidsfit.Id, CreatedByUserId = sales.Id,
                Status = "CONVERTED", RegisteredAt = now.AddDays(-40), ProtectedUntil = now.AddDays(-35), Source = "PARTNER_EVENT",
                Note = "Khách hàng đã ký sau buổi demo.", IdempotencyKey = "seed-approach-happy-house", CreatedAt = now.AddDays(-40), UpdatedAt = now,
            };
            db.ApproachRegistrations.Add(registration);
            await db.SaveChangesAsync();
            var signedOn = DateOnly.FromDateTime(now.AddDays(-35));
            var protectionStart = DateTime.SpecifyKind(signedOn.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
            var contract = new SalesContract
            {
                CustomerId = customer.Id, ApproachRegistrationId = registration.Id, OwnerUserId = sales.Id, OwnerOrganizationId = kidsfit.Id,
                ReportedByUserId = sales.Id, ContractCode = "CHK-2026-0001", SignedOn = signedOn, TotalValue = 30_000_000m,
                Status = "ACTIVE", ProtectionStartsAt = protectionStart, ProtectionUntil = protectionStart.AddYears(5),
                EvidenceReference = "Biên bản mẫu đã xác nhận", IdempotencyKey = "seed-contract-happy-house", CreatedAt = now.AddDays(-35), UpdatedAt = now,
            };
            db.SalesContracts.Add(contract);
            await db.SaveChangesAsync();
            db.SalesContractItems.Add(new SalesContractItem { ContractId = contract.Id, ProductPackageId = package.Id, Description = package.Name, Quantity = 1, UnitPrice = 30_000_000m, Amount = 30_000_000m, CreatedAt = contract.CreatedAt, UpdatedAt = now });
            db.CustomerProtections.Add(new CustomerProtection { CustomerId = customer.Id, OwnerUserId = sales.Id, OwnerOrganizationId = kidsfit.Id, ContractId = contract.Id, SourceType = "CONTRACT", Status = "ACTIVE", EffectiveFrom = protectionStart, EffectiveUntil = protectionStart.AddYears(5), CreatedAt = contract.CreatedAt, UpdatedAt = now });
            var schedule = new RevenueSchedule { ContractId = contract.Id, AmountDue = 30_000_000m, AmountReceived = 15_000_000m, DueOn = signedOn.AddDays(30), Status = "PARTIAL", CreatedAt = contract.CreatedAt, UpdatedAt = now };
            db.RevenueSchedules.Add(schedule);
            await db.SaveChangesAsync();
            var receipt = new RevenueReceipt { ContractId = contract.Id, RevenueScheduleId = schedule.Id, Amount = 15_000_000m, ReceivedAt = now.AddDays(-20), ReferenceCode = "RC-2026-0001", PaymentMethod = "BANK_TRANSFER", Status = "COMPLETED", IdempotencyKey = "seed-receipt-happy-house", RecordedByUserId = admin.Id, CreatedAt = now.AddDays(-20), UpdatedAt = now };
            db.RevenueReceipts.Add(receipt);
            await db.SaveChangesAsync();
            db.CommissionLedgerEntries.Add(new CommissionLedgerEntry { ContractId = contract.Id, RevenueReceiptId = receipt.Id, PolicyVersionId = policy.Id, BeneficiaryUserId = sales.Id, BeneficiaryOrganizationId = kidsfit.Id, EntryType = "ACCRUAL", CalculationBase = 15_000_000m, RatePercent = 10m, Amount = 1_500_000m, Status = "ACCRUED", Period = $"{receipt.ReceivedAt:yyyy-MM}", OccurredAt = receipt.ReceivedAt, CreatedByUserId = admin.Id, CreatedAt = receipt.CreatedAt, UpdatedAt = now });
            var reconciliation = new ReconciliationCase { CustomerId = customer.Id, ContractId = contract.Id, CheckeeOrganizationId = checkee.Id, Status = "PENDING", OpenedAt = contract.CreatedAt, CreatedAt = contract.CreatedAt, UpdatedAt = now };
            db.ReconciliationCases.Add(reconciliation);
            await db.SaveChangesAsync();
            db.ReconciliationEvents.Add(new ReconciliationEvent { ReconciliationCaseId = reconciliation.Id, ActorUserId = sales.Id, EventType = "OPENED", CreatedAt = contract.CreatedAt, UpdatedAt = now });
        }

        await db.SaveChangesAsync();
        await transaction.CommitAsync();
    }
}

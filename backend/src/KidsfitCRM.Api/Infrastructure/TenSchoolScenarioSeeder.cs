using System.Security.Cryptography;
using System.Text;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>
/// An isolated, opt-in, repeatable 10-school training dataset. Names/codes/wards and branch
/// relationships are sourced from the provided CRM workbook. No principal names, addresses,
/// phone numbers or emails from the workbook are committed to this public repository.
/// This is not a legal record, verified contract, or authorized commission policy.
/// </summary>
internal static class TenSchoolScenarioSeeder
{
    private sealed record School(string Code, string Name, string Ward, string[] Branches);
    private static readonly School[] Directory =
    [
        new("SCH0001", "Trường Mầm Non Ninh Kiều", "Phường Ninh Kiều",
            ["Phân hiệu 2 Tháng 9", "Phân hiệu An Nghiệp", "Phân hiệu Phượng Hồng",
             "Phân hiệu Sơn Ca", "Phân hiệu Hoàng Yến", "Phân hiệu 8 tháng 3",
             "Phân hiệu An Phú", "Phân hiệu Bông Sen", "Phân hiệu Hoàng Anh"]),
        new("SCH0002", "Trường Mẫu Giáo Hoa Mai", "Phường Ninh Kiều", []),
        new("SCH0003", "Trường Mầm Non Hướng Dương", "Phường Ninh Kiều", []),
        new("SCH0004", "Trường Mầm Non Thanh Xuân", "Phường Ninh Kiều", []),
        new("SCH0005", "Trường Mầm Non Việt Mỹ", "Phường Ninh Kiều", []),
        new("SCH0006", "Trường Mầm Non Mai Anh", "Phường Ninh Kiều", []),
        new("SCH0007", "Trường Mầm Non Ngôi Sao", "Phường Ninh Kiều", []),
        new("SCH0008", "Trường Mầm Non Cái Khế", "Phường Cái Khế", []),
        new("SCH0009", "Trường Mầm Non Trạng Tí 2", "Phường Cái Khế", []),
        new("SCH0010", "Trường Mầm Non Mặt Trời Nhỏ 2", "Phường Cái Khế", []),
    ];

    private static string Hash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    public static async Task SeedAsync(KidsfitDbContext db, IPasswordHasher<User> hasher,
        string sharedPassword, DateTime now, ParsedSchoolWorkbook? source = null)
    {
        // An optional local-only workbook preserves the exact original contacts in the
        // disposable MySQL database, without embedding them into public source code.
        var selected = source?.Rows.Where(x => Directory.Any(s => s.Code == x.SchoolCode)).ToArray();
        if (source is not null)
        {
            var mainCodes = source.Rows.Where(x => x.UnitType == "MAIN").Take(10)
                .Select(x => x.SchoolCode).ToArray();
            if (!mainCodes.SequenceEqual(Directory.Select(x => x.Code))
                || selected is null || selected.Length != 19)
                throw new InvalidOperationException("The workbook does not contain the expected first ten schools and nine branches.");
            foreach (var sample in Directory)
            {
                var group = selected.Where(x => x.SchoolCode == sample.Code).ToArray();
                if (group.Length != sample.Branches.Length + 1 || group[0].UnitType != "MAIN"
                    || group[0].Name != sample.Name
                    || !group.Skip(1).Select(x => x.Name).SequenceEqual(sample.Branches))
                    throw new InvalidOperationException("School or branch hierarchy differs from the approved workbook: " + sample.Code);
            }
        }
        // A flag alone cannot establish the provenance of data already in a database.
        // Refuse the training profile when an unrelated directory record exists.
        var codes = Directory.Select(x => x.Code).ToArray();
        if (await db.DirectorySchools.AnyAsync(x => !codes.Contains(x.SchoolCode)))
            throw new InvalidOperationException(
                "Ten-school scenario requires a fresh, disposable training database; unrelated schools already exist.");

        var admin = await db.Users.SingleAsync(x => x.Code == "ADMIN001");
        var sales = await db.Users.SingleAsync(x => x.Code == "SALES001");
        var ctv = await db.Users.SingleAsync(x => x.Code == "CTV001");
        var manager = await db.Users.SingleAsync(x => x.Code == "MANAGER001");
        var partnerManager = await db.Users.SingleAsync(x => x.Code == "PARTNER001");
        var care1 = await db.Users.SingleAsync(x => x.Code == "CARE001");
        var checkeeUser = await db.Users.SingleAsync(x => x.Code == "CHECKEE001");
        var accountant = await db.Users.SingleAsync(x => x.Code == "ACC001");
        var kidsfit = await db.Organizations.SingleAsync(x => x.Code == "KIDSFIT");
        var partner = await db.Organizations.SingleAsync(x => x.Code == "PARTNER_AN_PHAT");
        var checkee = await db.Organizations.SingleAsync(x => x.Code == "CHECKEE");
        var package = await db.CheckeeProductPackages.Where(x => x.Status == "ACTIVE").OrderBy(x => x.Id).FirstAsync();
        var careRole = await db.Roles.SingleAsync(x => x.Code == "CUSTOMER_SERVICE");

        // A second service agent allows Admin to distribute a genuine multi-person caseload.
        var care2 = await db.Users.SingleOrDefaultAsync(x => x.Code == "CARE002");
        if (care2 is null)
        {
            if (await db.Users.AnyAsync(x => x.Email == "care2@kidsfit.vn"))
                throw new InvalidOperationException("Scenario account identity collision.");
            care2 = new User
            {
                Code = "CARE002", Name = "Nhân viên CSKH 2", Email = "care2@kidsfit.vn",
                Status = "ACTIVE", EmailVerifiedAt = now, CreatedAt = now, UpdatedAt = now
            };
            care2.Password = hasher.HashPassword(care2, sharedPassword);
            db.Users.Add(care2);
            await db.SaveChangesAsync();
        }
        if (!await db.UserRoles.AnyAsync(x => x.UserId == care2.Id && x.RoleId == careRole.Id))
            db.UserRoles.Add(new UserRole { UserId = care2.Id, RoleId = careRole.Id });
        if (!await db.OrganizationMemberships.AnyAsync(x => x.UserId == care2.Id && x.OrganizationId == kidsfit.Id))
            db.OrganizationMemberships.Add(new OrganizationMembership
            {
                UserId = care2.Id, OrganizationId = kidsfit.Id, ManagerUserId = admin.Id,
                MembershipType = "CUSTOMER_SERVICE", IsPrimary = true, Status = "ACTIVE",
                CreatedAt = now, UpdatedAt = now
            });
        // Do not override live or historically changed account names.
        await db.SaveChangesAsync();

        var schools = new Dictionary<string, (long SchoolId, long CustomerId)>();
        foreach (var sample in Directory)
        {
            var sourceRows = selected?.Where(x => x.SchoolCode == sample.Code).ToArray();
            var sourceMain = sourceRows?.First(x => x.UnitType == "MAIN");
            var found = await db.DirectorySchools.SingleOrDefaultAsync(x => x.SchoolCode == sample.Code);
            if (found is null)
            {
                var customer = new ChannelCustomer
                {
                    Code = "SCH-TRAIN-" + sample.Code, CustomerType = "ORGANIZATION",
                    DisplayName = sample.Name, Province = "Cần Thơ",
                    Address = sourceMain?.Address, ContactName = sourceMain?.ContactName,
                    ContactPosition = sourceMain?.ContactPosition,
                    Phone = sourceMain?.SchoolPhone, Email = sourceMain?.Email,
                    Source = "SCHOOL_DIRECTORY",
                    LifecycleStatus = sample.Code is "SCH0001" or "SCH0002" ? "CONTRACTED" : "PROSPECT",
                    VerificationStatus = "VERIFIED", CreatedByUserId = admin.Id,
                    OrganizationId = kidsfit.Id, CreatedAt = now, UpdatedAt = now
                };
                db.ChannelCustomers.Add(customer);
                await db.SaveChangesAsync();
                found = new DirectorySchool { SchoolCode = sample.Code,
                    CustomerId = customer.Id, CreatedAt = now, UpdatedAt = now };
                db.DirectorySchools.Add(found);
                db.CustomerIdentifiers.Add(new CustomerIdentifier
                {
                    CustomerId = customer.Id, IdentifierType = "SCHOOL_CODE",
                    NormalizedValue = sample.Code, DisplayValue = sample.Code, IsVerified = true,
                    CreatedAt = now, UpdatedAt = now
                });
                await db.SaveChangesAsync();
            }
            else
            {
                var customer = await db.ChannelCustomers.SingleAsync(x => x.Id == found.CustomerId);
                if (customer.DisplayName != sample.Name)
                    throw new InvalidOperationException("Existing directory code differs from source workbook: " + sample.Code);
            }
            schools.Add(sample.Code, (found.Id, found.CustomerId));
            var names = new[] { sample.Name }.Concat(sample.Branches).ToArray();
            for (var unit = 0; unit < names.Length; unit++)
            {
                var kind = unit == 0 ? "MAIN" : "BRANCH";
                var sourceUnit = sourceRows is null ? null : sourceRows[unit];
                var key = sourceUnit?.ContentHash ??
                    Hash("ten-school:v1:" + sample.Code + ":" + kind + ":" + names[unit]);
                if (await db.SchoolUnits.AnyAsync(x => x.DirectorySchoolId == found.Id
                    && x.UnitType == kind && x.Name == names[unit])) continue;
                db.SchoolUnits.Add(new SchoolUnit
                {
                    DirectorySchoolId = found.Id, Version = 1, ContentHash = key,
                    UnitType = kind, Name = names[unit], Province = "Cần Thơ", Ward = sample.Ward,
                    Address = sourceUnit?.Address, ContactName = sourceUnit?.ContactName,
                    ContactPosition = sourceUnit?.ContactPosition, ContactPhone = sourceUnit?.ContactPhone,
                    SchoolPhone = sourceUnit?.SchoolPhone, Email = sourceUnit?.Email,
                    Note = sourceUnit?.Note, SourceRow = sourceUnit?.Row ?? 0,
                    CreatedAt = now, UpdatedAt = now
                });
            }
            await db.SaveChangesAsync();
        }

        // Connected, role-scoped lifecycle: two active contracts, one CHECKEE-confirmed,
        // one CHECKEE queue, one returned report, one manager review, two approaches,
        // one pending allocation and one available school.
        var stages = new[]
        {
            (Code:"SCH0001", Owner:sales.Id, Org:kidsfit.Id, Manager:manager.Id,
                Status:"ACTIVE", Case:"CONFIRMED", Value:30000000m),
            (Code:"SCH0002", Owner:ctv.Id, Org:partner.Id, Manager:partnerManager.Id,
                Status:"ACTIVE", Case:"CONFIRMED", Value:18000000m),
            (Code:"SCH0003", Owner:sales.Id, Org:kidsfit.Id, Manager:manager.Id,
                Status:"PENDING_KIDSFIT", Case:"CONFIRMED", Value:24000000m),
            (Code:"SCH0004", Owner:ctv.Id, Org:partner.Id, Manager:partnerManager.Id,
                Status:"MANAGER_REVIEWED", Case:"PENDING", Value:12000000m),
            (Code:"SCH0005", Owner:sales.Id, Org:kidsfit.Id, Manager:manager.Id,
                Status:"NEEDS_REVISION", Case:"AWAITING_MANAGER", Value:12000000m),
            (Code:"SCH0006", Owner:sales.Id, Org:kidsfit.Id, Manager:manager.Id,
                Status:"PENDING_REVIEW", Case:"AWAITING_MANAGER", Value:12000000m),
        };
        foreach (var stage in stages)
        {
            var customerId = schools[stage.Code].CustomerId;
            var approachKey = "ten-school-approach-" + stage.Code;
            var approach = await db.ApproachRegistrations.SingleOrDefaultAsync(x => x.IdempotencyKey == approachKey);
            if (approach is null)
            {
                approach = new ApproachRegistration
                {
                    CustomerId = customerId, OwnerUserId = stage.Owner,
                    OwnerOrganizationId = stage.Org, CreatedByUserId = stage.Owner,
                    Status = stage.Status == "ACTIVE" ? "CONVERTED" : "ACTIVE",
                    RegisteredAt = stage.Status == "ACTIVE" ? now.AddDays(-24) : now.AddDays(-4),
                    ProtectedUntil = stage.Status == "ACTIVE" ? now.AddDays(-19) : now.AddDays(1),
                    Source = "TRAINING_SCENARIO",
                    IdempotencyKey = approachKey,
                    CreatedAt = stage.Status == "ACTIVE" ? now.AddDays(-24) : now.AddDays(-4),
                    UpdatedAt = now
                };
                db.ApproachRegistrations.Add(approach);
                await db.SaveChangesAsync();
            }
            var contractCode = "CHK-2026-" + stage.Code[3..];
            var contract = await db.SalesContracts.SingleOrDefaultAsync(x => x.ContractCode == contractCode);
            if (contract is null)
            {
                var verified = stage.Case == "CONFIRMED" ? now.AddDays(-10) : (DateTime?)null;
                contract = new SalesContract
                {
                    CustomerId = customerId, ApproachRegistrationId = approach.Id,
                    OwnerUserId = stage.Owner, OwnerOrganizationId = stage.Org,
                    ReportedByUserId = stage.Owner, OwnerPersonnelType = stage.Org == partner.Id ? "COLLABORATOR" : "SALES",
                    ContractCode = contractCode,
                    SignedOn = DateOnly.FromDateTime(stage.Status == "ACTIVE" ? now.AddDays(-21) : now.AddDays(-3)),
                    TotalValue = stage.Value, Currency = "VND", Status = stage.Status,
                    ServicePlan = "SCHOOL_YEAR", StudentCount = 350, SchoolUnitIdsJson = "[]",
                    RequiresSchoolVerification = true, VerifiedAt = verified,
                    ManagerReviewedAt = stage.Status is "PENDING_REVIEW" or "NEEDS_REVISION" ? null : now.AddDays(-2),
                    ManagerReviewedByUserId = stage.Status is "PENDING_REVIEW" or "NEEDS_REVISION" ? null : stage.Manager,
                    ProtectionStartsAt = stage.Status == "ACTIVE" ? verified!.Value : now,
                    ProtectionUntil = stage.Status == "ACTIVE" ? verified!.Value.AddYears(5) : now,
                    CareUserId = stage.Status == "ACTIVE" ? stage.Code == "SCH0001" ? care1.Id : care2.Id : null,
                    CareOrganizationId = stage.Status == "ACTIVE" ? kidsfit.Id : null,
                    EvidenceReference = "Tài liệu tình huống đào tạo (không phải hợp đồng pháp lý)",
                    IdempotencyKey = "ten-school-contract-" + stage.Code,
                    CreatedAt = stage.Status == "ACTIVE" ? now.AddDays(-21) : now.AddDays(-3), UpdatedAt = now
                };
                db.SalesContracts.Add(contract);
                await db.SaveChangesAsync();
                db.SalesContractItems.Add(new SalesContractItem
                {
                    ContractId = contract.Id, ProductPackageId = package.Id,
                    Description = package.Name, Quantity = 1,
                    UnitPrice = stage.Value, Amount = stage.Value,
                    CreatedAt = now, UpdatedAt = now
                });
                if (stage.Status == "ACTIVE")
                    db.RevenueSchedules.Add(new RevenueSchedule
                    {
                        ContractId = contract.Id, DueOn = DateOnly.FromDateTime(now.AddDays(25)),
                        AmountDue = stage.Value, AmountReceived = 0m, Status = "PENDING",
                        CreatedAt = now, UpdatedAt = now
                    });
                await db.SaveChangesAsync();
            }
            if (stage.Status != "ACTIVE" &&
                !await db.CustomerProtections.AnyAsync(x => x.ApproachRegistrationId == approach.Id))
                db.CustomerProtections.Add(new CustomerProtection
                {
                    ApproachRegistrationId = approach.Id, CustomerId = customerId,
                    OwnerUserId = stage.Owner, OwnerOrganizationId = stage.Org,
                    SourceType = "APPROACH", Status = "ACTIVE",
                    EffectiveFrom = approach.RegisteredAt,
                    EffectiveUntil = approach.ProtectedUntil,
                    CreatedAt = now, UpdatedAt = now
                });
            if (stage.Status == "ACTIVE" &&
                !await db.CustomerProtections.AnyAsync(x => x.ContractId == contract.Id))
                db.CustomerProtections.Add(new CustomerProtection
                {
                    ContractId = contract.Id, CustomerId = customerId,
                    OwnerUserId = stage.Owner, OwnerOrganizationId = stage.Org,
                    SourceType = "CONTRACT", Status = "ACTIVE",
                    EffectiveFrom = contract.VerifiedAt!.Value,
                    EffectiveUntil = contract.VerifiedAt!.Value.AddYears(5),
                    CreatedAt = now, UpdatedAt = now
                });
            var recon = await db.ReconciliationCases.SingleOrDefaultAsync(x => x.ContractId == contract.Id);
            if (recon is null)
            {
                recon = new ReconciliationCase
                {
                    CustomerId = customerId, ContractId = contract.Id,
                    CheckeeOrganizationId = checkee.Id, Status = stage.Case,
                    OpenedAt = stage.Status == "ACTIVE" ? now.AddDays(-12) : now.AddDays(-2),
                    ResolvedAt = stage.Case == "CONFIRMED" ? now.AddDays(-10) : null,
                    CreatedAt = now, UpdatedAt = now
                };
                db.ReconciliationCases.Add(recon);
                await db.SaveChangesAsync();
                db.ReconciliationEvents.Add(new ReconciliationEvent
                {
                    ReconciliationCaseId = recon.Id, ActorUserId = stage.Manager,
                    EventType = stage.Case is "PENDING" or "CONFIRMED" ? "MANAGER_FORWARDED" : "OPENED",
                    CreatedAt = now.AddDays(-12), UpdatedAt = now
                });
                if (stage.Case == "CONFIRMED")
                    db.ReconciliationEvents.Add(new ReconciliationEvent
                    {
                        ReconciliationCaseId = recon.Id, ActorUserId = checkeeUser.Id,
                        EventType = "CONFIRMED", Reason = "Hoàn tất bước xác minh trong tình huống đào tạo",
                        CreatedAt = now.AddDays(-10), UpdatedAt = now
                    });
            }
            // Monetary records are illustrative; commission entitlements remain unset
            // pending the official base/rate/trigger approval.
            if (stage.Status == "ACTIVE" &&
                !await db.RevenueReceipts.AnyAsync(x => x.IdempotencyKey == "ten-school-receipt-" + stage.Code))
            {
                var paid = stage.Code == "SCH0001" ? 12000000m : 6000000m;
                db.RevenueReceipts.Add(new RevenueReceipt
                {
                    ContractId = contract.Id, Amount = paid, ReceivedAt = now.AddDays(-5),
                    ReferenceCode = "RC-2026-" + stage.Code[3..],
                    RecordedByUserId = accountant.Id, Status = "COMPLETED",
                    PaymentMethod = "BANK_TRANSFER",
                    IdempotencyKey = "ten-school-receipt-" + stage.Code,
                    CreatedAt = now.AddDays(-5), UpdatedAt = now
                });
                // Schedules only updated once when first receipt is inserted.
                var due = await db.RevenueSchedules.FirstAsync(x => x.ContractId == contract.Id);
                due.AmountReceived = paid;
                due.Status = "PARTIAL";
                due.UpdatedAt = now;
            }
            await db.SaveChangesAsync();
        }

        foreach (var (code, owner, org) in new[]
        {
            ("SCH0007", sales.Id, kidsfit.Id), ("SCH0008", ctv.Id, partner.Id)
        })
        {
            var key = "ten-school-approach-" + code;
            if (await db.ApproachRegistrations.AnyAsync(x => x.IdempotencyKey == key)) continue;
            var customer = schools[code].CustomerId;
            var registration = new ApproachRegistration
            {
                CustomerId = customer, OwnerUserId = owner,
                OwnerOrganizationId = org, CreatedByUserId = owner,
                Status = "ACTIVE", RegisteredAt = now.AddDays(-2),
                ProtectedUntil = now.AddDays(3), Source = "TRAINING_SCENARIO",
                IdempotencyKey = key, CreatedAt = now.AddDays(-2), UpdatedAt = now
            };
            db.ApproachRegistrations.Add(registration);
            await db.SaveChangesAsync();
            db.CustomerProtections.Add(new CustomerProtection
            {
                CustomerId = customer, OwnerUserId = owner,
                OwnerOrganizationId = org, ApproachRegistrationId = registration.Id,
                SourceType = "APPROACH", Status = "ACTIVE",
                EffectiveFrom = registration.RegisteredAt, EffectiveUntil = registration.ProtectedUntil,
                CreatedAt = now, UpdatedAt = now
            });
            db.CustomerActivities.Add(new CustomerActivity
            {
                CustomerId = customer, ApproachRegistrationId = registration.Id,
                UserId = owner, ActivityType = "CALL",
                Content = code == "SCH0007"
                    ? "Đã tư vấn về quy trình triển khai; nhà trường hẹn trao đổi tiếp."
                    : "Đã giới thiệu tính năng quản lý và đặt lịch trình diễn.",
                OccurredAt = now.AddDays(-1), NextFollowUpAt = now.AddDays(1),
                CreatedAt = now.AddDays(-1), UpdatedAt = now
            });
            if (code == "SCH0007")
                db.SchoolExtensionRequests.Add(new SchoolExtensionRequest
                {
                    ApproachRegistrationId = registration.Id,
                    OrganizationId = org, RequestedByUserId = owner,
                    ManagerUserId = manager.Id, OriginalProtectedUntil = registration.ProtectedUntil,
                    RequestedUntil = registration.ProtectedUntil.AddDays(7),
                    ReviewDueAt = now.AddDays(1), NextAppointmentAt = now.AddDays(2),
                    Progress = "Đã liên hệ và có lịch trao đổi tiếp theo",
                    EvidenceReference = "Nhật ký liên hệ trong hệ thống",
                    Status = "PENDING",
                    IdempotencyKey = "ten-school-extension-" + code,
                    CreatedAt = now, UpdatedAt = now
                });
            await db.SaveChangesAsync();
        }

        if (!await db.SchoolInvitations.AnyAsync(x => x.IdempotencyKey == "ten-school-invite-SCH0009"))
            db.SchoolInvitations.Add(new SchoolInvitation
            {
                DirectorySchoolId = schools["SCH0009"].SchoolId,
                OrganizationId = partner.Id, AssignedByUserId = partnerManager.Id,
                AssigneeUserId = ctv.Id, Status = "PENDING", RespondBy = now.AddDays(1),
                Reason = "Trường còn trống, phù hợp khu vực Sales phụ trách",
                IdempotencyKey = "ten-school-invite-SCH0009",
                CreatedAt = now, UpdatedAt = now
            });
        var customer1 = schools["SCH0001"].CustomerId;
        if (!await db.CustomerActivities.AnyAsync(x => x.CustomerId == customer1 &&
            x.UserId == care1.Id && x.ActivityType == "SUPPORT"))
            db.CustomerActivities.Add(new CustomerActivity
            {
                CustomerId = customer1, UserId = care1.Id, ActivityType = "SUPPORT",
                Content = "Đã hướng dẫn nhà trường đăng nhập và phân quyền người dùng qua điện thoại.",
                OccurredAt = now.AddHours(-6), NextFollowUpAt = now.AddDays(2),
                CreatedAt = now.AddHours(-6), UpdatedAt = now
            });
        var contract2 = await db.SalesContracts.SingleAsync(x => x.ContractCode == "CHK-2026-0002");
        if (!await db.CustomerSupportCases.AnyAsync(x => x.IdempotencyKey == "ten-school-checkee-support-2"))
            db.CustomerSupportCases.Add(new CustomerSupportCase
            {
                ContractId = contract2.Id, CustomerId = schools["SCH0002"].CustomerId,
                OrganizationId = kidsfit.Id, AssignedUserId = care2.Id,
                CreatedByUserId = care2.Id, TicketType = "SYSTEM_ERROR",
                CheckeeOrganizationId = checkee.Id, ForwardedByUserId = care2.Id,
                ForwardedAt = now.AddHours(-3),
                Subject = "Lỗi không tải được trang quản trị",
                Description = "Nhà trường phản ánh trang quản trị trả lỗi khi đăng nhập. Đã chuyển CHECKEE kiểm tra.",
                Status = "OPEN", IdempotencyKey = "ten-school-checkee-support-2",
                CreatedAt = now.AddHours(-3), UpdatedAt = now
            });
        // Manager/Admin proposal queues are intentionally separate from the official
        // ten-school directory: proposing an already imported school would be misleading.
        var proposals = new[]
        {
            (Code:"TRAIN-PROP-01",Name:"Trường Mầm Non Sáng Tạo",Owner:ctv.Id,
                Org:partner.Id,Manager:partnerManager.Id,Status:"PENDING_MANAGER",Hours:-2),
            (Code:"TRAIN-PROP-02",Name:"Trường Mầm Non Phương Nam",Owner:sales.Id,
                Org:kidsfit.Id,Manager:manager.Id,Status:"PENDING_ADMIN",Hours:20),
            (Code:"TRAIN-PROP-03",Name:"Trường Mầm Non Bình An",Owner:sales.Id,
                Org:kidsfit.Id,Manager:manager.Id,Status:"REJECTED",Hours:-24)
        };
        foreach (var p in proposals)
        {
            if (await db.SchoolProposals.AnyAsync(x => x.SchoolCode == p.Code)) continue;
            db.SchoolProposals.Add(new SchoolProposal
            {
                OrganizationId = p.Org, SubmittedByUserId = p.Owner,
                ManagerUserId = p.Manager, SchoolCode = p.Code, Name = p.Name,
                Province = "Cần Thơ", Ward = "Phường Ninh Kiều",
                Reason = "Đề nghị xác minh và bổ sung trường mới vào danh bạ.",
                Status = p.Status, ReviewDueAt = now.AddHours(p.Hours),
                ReviewedByUserId = p.Status == "PENDING_MANAGER" ? null : p.Manager,
                ManagerReviewedAt = p.Status == "PENDING_MANAGER" ? null : now.AddDays(-1),
                DecisionReason = p.Status == "REJECTED"
                    ? "Chưa xác định được thông tin pháp lý đầy đủ." : null,
                IdempotencyKey = "ten-school-proposal-" + p.Code,
                RequestFingerprint = Hash("ten-school-proposal:" + p.Code),
                CreatedAt = now.AddDays(-3), UpdatedAt = now
            });
        }
        if (!await db.SchoolDisputes.AnyAsync(x =>
            x.IdempotencyKey == "ten-school-dispute-SCH0007"))
            db.SchoolDisputes.Add(new SchoolDispute
            {
                CustomerId = schools["SCH0007"].CustomerId, OrganizationId = kidsfit.Id,
                OpenedByUserId = manager.Id, Reason = "Cần xác nhận lịch sử đăng ký tiếp cận giữa các nhân sự.",
                EvidenceReference = "Nhật ký tiếp cận trong hệ thống",
                Status = "OPEN", IdempotencyKey = "ten-school-dispute-SCH0007",
                CreatedAt = now.AddHours(-4), UpdatedAt = now
            });
        if (!await db.SchoolDeferrals.AnyAsync(x =>
            x.IdempotencyKey == "ten-school-deferral-SCH0010"))
            db.SchoolDeferrals.Add(new SchoolDeferral
            {
                DirectorySchoolId = schools["SCH0010"].SchoolId,
                OrganizationId = kidsfit.Id, ManagerUserId = manager.Id,
                Reason = "Đang tìm người phù hợp để liên hệ với trường.",
                ReviewAt = now.AddDays(4), Status = "OPEN",
                IdempotencyKey = "ten-school-deferral-SCH0010",
                CreatedAt = now, UpdatedAt = now
            });
        foreach (var (code, care) in new[] { ("SCH0001", care1), ("SCH0002", care2) })
        {
            var selectedContractCode = "CHK-2026-" + code[3..];
            var contract = await db.SalesContracts.SingleAsync(x =>
                x.ContractCode == selectedContractCode);
            if (await db.ContractCareHandovers.AnyAsync(x => x.ContractId == contract.Id))
                continue;
            db.ContractCareHandovers.Add(new ContractCareHandover
            {
                ContractId = contract.Id, AssignedUserId = care.Id,
                CareOrganizationId = kidsfit.Id, ActorUserId = admin.Id,
                Reason = "Phân công hỗ trợ trường sau khi hợp đồng được xác minh.",
                IdempotencyKey = "ten-school-care-handover-" + code,
                RequestFingerprint = Hash("ten-school-care:" + code),
                CreatedAt = now.AddDays(-3), UpdatedAt = now
            });
        }
        await db.SaveChangesAsync();
    }
}

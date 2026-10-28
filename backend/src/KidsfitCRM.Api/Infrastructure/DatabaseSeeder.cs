using KidsfitCRM.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<KidsfitDbContext>();
        if (await db.Roles.AnyAsync())
        {
            await SeedChannelSalesAsync(services);
            await CrmScenarioSeeder.SeedAsync(db, DateTime.UtcNow);
            return;
        }
        var hasher = services.GetRequiredService<IPasswordHasher<User>>();
        var now = DateTime.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync();

        var permissionSeeds = new (string Code, string Name, string Group)[]
        {
            ("crm.dashboard.view", "Xem tổng quan", "CRM"), ("crm.lead.view", "Xem lead", "CRM"),
            ("crm.lead.create", "Tạo lead", "CRM"), ("crm.lead.update", "Cập nhật lead", "CRM"),
            ("crm.lead.assign", "Phân công lead", "CRM"), ("student.view", "Xem học viên", "Học viên"),
            ("student.update", "Cập nhật học viên", "Học viên"), ("course.view", "Xem lớp và khóa học", "Đào tạo"),
            ("course.manage", "Quản lý lớp và khóa học", "Đào tạo"), ("payment.view", "Xem công nợ", "Tài chính"),
            ("payment.create", "Ghi nhận thanh toán", "Tài chính"), ("crm.report.view", "Xem báo cáo", "Báo cáo"),
        };
        var permissions = permissionSeeds.Select(x => new Permission { Code = x.Code, Name = x.Name, Group = x.Group, CreatedAt = now, UpdatedAt = now }).ToList();
        var adminRole = new Role { Code = "ADMIN", Name = "Quản trị viên", CreatedAt = now, UpdatedAt = now };
        var salesRole = new Role { Code = "SALES", Name = "Tư vấn tuyển sinh", CreatedAt = now, UpdatedAt = now };
        var admin = new User { Code = "ADMIN001", Name = "Minh Anh", Email = "admin@kidsfit.vn", Phone = "0901 234 567", Status = "ACTIVE", EmailVerifiedAt = now, CreatedAt = now, UpdatedAt = now };
        var sales = new User { Code = "SALES001", Name = "Lan Phương", Email = "sales@kidsfit.vn", Phone = "0908 765 432", Status = "ACTIVE", EmailVerifiedAt = now, CreatedAt = now, UpdatedAt = now };
        admin.Password = hasher.HashPassword(admin, "Kidsfit@2026");
        sales.Password = hasher.HashPassword(sales, "Sales@2026");
        db.AddRange(permissions); db.AddRange(adminRole, salesRole, admin, sales);
        await db.SaveChangesAsync();
        db.UserRoles.AddRange(new UserRole { UserId = admin.Id, RoleId = adminRole.Id }, new UserRole { UserId = sales.Id, RoleId = salesRole.Id });
        db.PermissionRoles.AddRange(permissions.Select(x => new PermissionRole { PermissionId = x.Id, RoleId = adminRole.Id }));
        var salesCodes = new[] { "crm.dashboard.view", "crm.lead.view", "crm.lead.create", "crm.lead.update", "crm.lead.assign", "student.view", "course.view", "payment.view", "crm.report.view" };
        db.PermissionRoles.AddRange(permissions.Where(x => salesCodes.Contains(x.Code)).Select(x => new PermissionRole { PermissionId = x.Id, RoleId = salesRole.Id }));

        var statuses = new[]
        {
            Status("NEW", "Mới", "#6C5CE7", 10, false), Status("CONTACTED", "Đã liên hệ", "#0984E3", 20, false),
            Status("QUALIFIED", "Đủ điều kiện", "#00B894", 30, false), Status("TRIAL_BOOKED", "Đã đặt học thử", "#E17055", 40, false),
            Status("TRIAL_COMPLETED", "Đã học thử", "#F39C12", 50, false), Status("CONSIDERING", "Đang cân nhắc", "#A29BFE", 60, false),
            Status("WON", "Đã nhập học", "#00A86B", 70, true), Status("LOST", "Không chuyển đổi", "#B2BEC3", 80, true),
        };
        var sources = new[]
        {
            Source("FACEBOOK", "Facebook", "#1877F2"), Source("TIKTOK", "TikTok", "#111827"), Source("WEBSITE", "Website", "#6C5CE7"),
            Source("ZALO", "Zalo", "#0068FF"), Source("REFERRAL", "Giới thiệu", "#00B894"), Source("WALK_IN", "Tại trung tâm", "#F39C12"), Source("HOTLINE", "Hotline", "#E17055"),
        };
        var courses = new[]
        {
            Course("ENGLISH_KIDS", "English Kids", "Phản xạ tiếng Anh cho trẻ 5–10 tuổi", 24, 7_200_000),
            Course("MATH_DISCOVERY", "Math Discovery", "Toán tư duy qua trải nghiệm", 20, 6_500_000),
            Course("STEAM_EXPLORER", "STEAM Explorer", "Khoa học, công nghệ và sáng tạo", 16, 5_800_000),
        };
        db.AddRange(statuses); db.AddRange(sources); db.AddRange(courses);
        await db.SaveChangesAsync();

        var rooms = new[]
        {
            Room("EK-A01", "English Kids A01", courses[0], now.AddDays(-16), "ACTIVE", 18),
            Room("MD-B02", "Math Discovery B02", courses[1], now.AddDays(-14), "ACTIVE", 16),
            Room("ST-C01", "STEAM Explorer C01", courses[2], now.AddDays(12), "PLANNED", 16),
        };
        foreach (var room in rooms) room.TeacherId = admin.Id;
        db.AddRange(rooms);
        await db.SaveChangesAsync();
        db.ClassSchedules.AddRange(
            Schedule(rooms[0], 2, 17, 30, 19, 0, "P.201", admin.Id), Schedule(rooms[0], 5, 17, 30, 19, 0, "P.201", admin.Id),
            Schedule(rooms[1], 3, 18, 0, 19, 30, "P.202", admin.Id), Schedule(rooms[2], 7, 9, 0, 10, 30, "Lab STEAM", admin.Id));

        var leadSeeds = new (string Name, string Phone, string Source, string Status, string Course, int DaysAgo, string Note)[]
        {
            ("Nguyễn Gia Hân", "0912 345 678", "FACEBOOK", "NEW", "ENGLISH_KIDS", 0, "Muốn học buổi tối"),
            ("Trần Minh Khang", "0938 222 105", "ZALO", "CONTACTED", "MATH_DISCOVERY", 1, "Đã gửi học phí"),
            ("Lê Hoàng Nam", "0903 716 882", "REFERRAL", "QUALIFIED", "STEAM_EXPLORER", 2, "Quan tâm lớp cuối tuần"),
            ("Phạm Khánh Linh", "0987 420 111", "WEBSITE", "TRIAL_BOOKED", "ENGLISH_KIDS", 3, "Học thử chiều thứ bảy"),
            ("Vũ Bảo Ngọc", "0909 102 468", "TIKTOK", "TRIAL_COMPLETED", "MATH_DISCOVERY", 5, "Bé hợp tác tốt"),
            ("Đỗ Đức Anh", "0918 552 904", "HOTLINE", "CONSIDERING", "STEAM_EXPLORER", 7, "Cần trao đổi thêm với bố"),
            ("Bùi Mai Chi", "0935 601 933", "WALK_IN", "WON", "ENGLISH_KIDS", 12, "Đã hoàn thành đăng ký"),
            ("Ngô Nhật Minh", "0978 003 125", "FACEBOOK", "LOST", "MATH_DISCOVERY", 18, "Lịch học chưa phù hợp"),
        };
        var leads = new List<Lead>();
        for (var index = 0; index < leadSeeds.Length; index++)
        {
            var seed = leadSeeds[index];
            var created = now.AddDays(-seed.DaysAgo);
            var lead = new Lead { Code = $"LEAD{index + 1:00000}", FullName = seed.Name, Phone = seed.Phone, PhoneNormalized = Digits(seed.Phone), SourceId = sources.Single(x => x.Code == seed.Source).Id, StatusId = statuses.Single(x => x.Code == seed.Status).Id, InterestedCourseId = courses.Single(x => x.Code == seed.Course).Id, AssignedUserId = sales.Id, Note = seed.Note, NextFollowUpAt = seed.Status is "WON" or "LOST" ? null : now.Date.AddDays(index % 3 - 1).AddHours(9 + index), CreatedAt = created, UpdatedAt = created.AddDays(1) };
            leads.Add(lead); db.Leads.Add(lead);
        }
        await db.SaveChangesAsync();
        foreach (var lead in leads)
        {
            db.LeadAssignments.Add(new LeadAssignment { LeadId = lead.Id, AssignedTo = sales.Id, AssignedBy = admin.Id, AssignedAt = lead.CreatedAt, CreatedAt = now, UpdatedAt = now });
            db.LeadActivities.Add(new LeadActivity { LeadId = lead.Id, UserId = sales.Id, ActivityType = "NOTE", Content = lead.Note!, CreatedAt = lead.UpdatedAt, UpdatedAt = now });
        }
        db.TrialSessions.AddRange(
            new TrialSession { LeadId = leads[3].Id, CourseId = courses[0].Id, ClassId = rooms[0].Id, ScheduledAt = now.AddHours(4), AttendanceStatus = "SCHEDULED", Note = "Chuẩn bị tài liệu level starter", StaffId = sales.Id, CreatedAt = now, UpdatedAt = now },
            new TrialSession { LeadId = leads[4].Id, CourseId = courses[1].Id, ClassId = rooms[1].Id, ScheduledAt = now.AddDays(-2), AttendanceStatus = "ATTENDED", Result = "INTERESTED", Note = "Bé rất hứng thú", StaffId = sales.Id, CreatedAt = now.AddDays(-3), UpdatedAt = now });
        db.Tasks.AddRange(
            Task("Gọi lại phụ huynh Gia Hân", "Lead", leads[0].Id, sales.Id, now.AddHours(-2), "HIGH"),
            Task("Gửi chương trình Math Discovery", "Lead", leads[1].Id, sales.Id, now.AddHours(1), "MEDIUM"),
            Task("Xác nhận lịch học thử Khánh Linh", "Lead", leads[3].Id, sales.Id, now.AddHours(2), "HIGH"),
            Task("Hỏi phản hồi sau học thử Bảo Ngọc", "Lead", leads[4].Id, sales.Id, now.AddDays(1), "MEDIUM"),
            Task("Duyệt lịch khai giảng STEAM C01", "Class", rooms[2].Id, admin.Id, now.AddHours(3), "HIGH"));

        var studentSeeds = new (string Name, string Dob, string Gender, string School, string Grade, int Room, decimal Fee, decimal Paid, string ParentName, string ParentPhone)[]
        {
            ("Bùi Mai Chi", "2018-04-12", "FEMALE", "Tiểu học Nguyễn Bỉnh Khiêm", "Lớp 2", 0, 7_200_000, 7_200_000, "Bùi Thanh Hà", "0902 412 588"),
            ("Trần Minh Quân", "2017-09-20", "MALE", "Tiểu học Lê Quý Đôn", "Lớp 3", 1, 6_500_000, 3_500_000, "Trần Quốc Huy", "0913 002 176"),
            ("Nguyễn Hải Yến", "2019-01-15", "FEMALE", "Tiểu học Đinh Tiên Hoàng", "Lớp 1", 0, 7_200_000, 5_000_000, "Nguyễn Thu Trang", "0988 551 209"),
            ("Lý Tuấn Kiệt", "2018-11-03", "MALE", "Tiểu học Trần Quốc Toản", "Lớp 2", 1, 6_500_000, 6_500_000, "Lý Hoàng Sơn", "0907 430 618"),
        };
        for (var index = 0; index < studentSeeds.Length; index++)
        {
            var seed = studentSeeds[index];
            var parent = new Parent { Code = $"PH{index + 1:0000}", FullName = seed.ParentName, Phone = seed.ParentPhone, PhoneNormalized = Digits(seed.ParentPhone), CreatedAt = now, UpdatedAt = now };
            var student = new Student { Code = $"HV{index + 1:0000}", FullName = seed.Name, DateOfBirth = DateOnly.Parse(seed.Dob), Gender = seed.Gender, SchoolName = seed.School, SchoolGrade = seed.Grade, Status = "ACTIVE", CreatedAt = now, UpdatedAt = now };
            db.AddRange(parent, student); await db.SaveChangesAsync();
            db.ParentStudents.Add(new ParentStudent { ParentId = parent.Id, StudentId = student.Id, Relationship = index % 2 == 0 ? "MOTHER" : "FATHER", IsPrimaryContact = true, CreatedAt = now, UpdatedAt = now });
            var enrollment = new Enrollment { StudentId = student.Id, ClassId = rooms[seed.Room].Id, RegisteredBy = sales.Id, RegistrationDate = DateOnly.FromDateTime(now.AddDays(-(10 - index))), OriginalFee = seed.Fee, DiscountAmount = 0, FinalFee = seed.Fee, Status = "ACTIVE", CreatedAt = now, UpdatedAt = now };
            db.Enrollments.Add(enrollment); await db.SaveChangesAsync();
            var invoice = new Invoice { ParentId = parent.Id, StudentId = student.Id, EnrollmentId = enrollment.Id, InvoiceCode = $"INV-{now.Year}-{index + 1:0000}", TotalAmount = seed.Fee, DiscountAmount = 0, FinalAmount = seed.Fee, PaidAmount = seed.Paid, RemainingAmount = seed.Fee - seed.Paid, Status = seed.Paid >= seed.Fee ? "PAID" : "PARTIAL", IssuedAt = now.AddDays(-(10 - index)), DueAt = now.AddDays(7 + index), CreatedAt = now, UpdatedAt = now };
            db.Invoices.Add(invoice); await db.SaveChangesAsync();
            db.InvoiceItems.Add(new InvoiceItem { InvoiceId = invoice.Id, ItemType = "COURSE_FEE", ItemId = rooms[seed.Room].Id, Description = $"Học phí {courses[seed.Room].Name}", Quantity = 1, UnitPrice = seed.Fee, Amount = seed.Fee, CreatedAt = now, UpdatedAt = now });
            if (seed.Paid > 0) db.Payments.Add(new Payment { InvoiceId = invoice.Id, ParentId = parent.Id, StudentId = student.Id, PaymentMethod = index % 2 == 0 ? "CASH" : "BANK_TRANSFER", Amount = seed.Paid, PaymentDate = now.AddDays(-(index * 8)), ReferenceCode = $"PAY-{now.Year}-{index + 1:0000}", Status = "COMPLETED", CreatedBy = admin.Id, CreatedAt = now, UpdatedAt = now });
            if (index == 0)
            {
                leads[6].ConvertedParentId = parent.Id;
                db.LeadConversions.Add(new LeadConversion { LeadId = leads[6].Id, IdempotencyKey = "demo-conversion-lead-00007", ParentId = parent.Id, StudentId = student.Id, EnrollmentId = enrollment.Id, InvoiceId = invoice.Id, ConvertedBy = sales.Id, ConvertedAt = invoice.IssuedAt, CreatedAt = invoice.IssuedAt, UpdatedAt = now });
            }
        }
        db.Notifications.Add(new Notification { UserId = sales.Id, Type = "TRIAL_REMINDER", Title = "Lịch học thử sắp diễn ra", Content = "Khánh Linh có lịch học thử trong hôm nay.", Data = $"{{\"lead_id\":{leads[3].Id}}}", CreatedAt = now, UpdatedAt = now });
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        await SeedChannelSalesAsync(services);
        await CrmScenarioSeeder.SeedAsync(db, DateTime.UtcNow);

        LeadStatus Status(string code, string name, string color, int sort, bool terminal) => new() { Code = code, Name = name, Color = color, SortOrder = sort, IsTerminal = terminal, CreatedAt = now, UpdatedAt = now };
        LeadSource Source(string code, string name, string color) => new() { Code = code, Name = name, Color = color, IsActive = true, CreatedAt = now, UpdatedAt = now };
        Course Course(string code, string name, string description, int sessions, decimal fee) => new() { Code = code, Name = name, Description = description, NumberOfSessions = sessions, TuitionFee = fee, Status = "ACTIVE", CreatedAt = now, UpdatedAt = now };
        ClassRoom Room(string code, string name, Course course, DateTime start, string status, int capacity) => new() { CourseId = course.Id, Code = code, Name = name, StartDate = DateOnly.FromDateTime(start), EndDate = DateOnly.FromDateTime(start.AddMonths(4)), Status = status, Capacity = capacity, CreatedAt = now, UpdatedAt = now };
        ClassSchedule Schedule(ClassRoom room, int day, int startHour, int startMinute, int endHour, int endMinute, string place, long teacherId) => new() { ClassId = room.Id, DayOfWeek = day, StartTime = new TimeOnly(startHour, startMinute), EndTime = new TimeOnly(endHour, endMinute), Room = place, TeacherId = teacherId, CreatedAt = now, UpdatedAt = now };
        WorkTask Task(string title, string relatedType, long relatedId, long assignedTo, DateTime dueAt, string priority) => new() { Title = title, RelatedType = relatedType, RelatedId = relatedId, AssignedTo = assignedTo, DueAt = dueAt, Status = "OPEN", Priority = priority, CreatedAt = now, UpdatedAt = now };
    }

    private static string Digits(string value) => string.Concat(value.Where(char.IsDigit));

    private static async Task SeedChannelSalesAsync(IServiceProvider services)
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
            ("BOARD", "Ban giám đốc"),
            ("ACCOUNTANT", "Kế toán"),
            ("SALES_MANAGER", "Quản lý bán hàng"),
            ("CUSTOMER_CARE", "Chăm sóc khách hàng"),
            ("CHANNEL_SALES", "Nhân viên bán hàng CHECKEE"),
            ("CHECKEE", "Đối soát CHECKEE"),
            ("PARTNER_ADMIN", "Đối tác triển khai"),
            ("PARTNER_COLLABORATOR", "CTV đối tác"),
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
            ["BOARD"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesCommissionView, Permissions.ChannelSalesAllScope],
            ["ACCOUNTANT"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesRecordRevenue, Permissions.ChannelSalesCommissionView, Permissions.ChannelSalesOrganizationScope, Permissions.ChannelSalesPayoutCreate, Permissions.ChannelSalesPayoutApprove, Permissions.ChannelSalesPayoutComplete, Permissions.ChannelSalesCommissionAdjust],
            ["SALES_MANAGER"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesRegister, Permissions.ChannelSalesActivity, Permissions.ChannelSalesReportContract, Permissions.ChannelSalesCommissionView, Permissions.ChannelSalesManage, Permissions.ChannelSalesOrganizationScope],
            ["CUSTOMER_CARE"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesActivity, Permissions.ChannelSalesOrganizationScope],
            ["SALES"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesRegister, Permissions.ChannelSalesActivity, Permissions.ChannelSalesReportContract, Permissions.ChannelSalesCommissionView],
            ["CHANNEL_SALES"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesRegister, Permissions.ChannelSalesActivity, Permissions.ChannelSalesReportContract, Permissions.ChannelSalesCommissionView],
            ["CHECKEE"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesReconcile, Permissions.ChannelSalesOrganizationScope],
            ["PARTNER_ADMIN"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesRegister, Permissions.ChannelSalesActivity, Permissions.ChannelSalesReportContract, Permissions.ChannelSalesCommissionView, Permissions.ChannelSalesManage, Permissions.ChannelSalesOrganizationScope, Permissions.ChannelSalesTeamManage, Permissions.ChannelSalesPolicyManage],
            ["PARTNER_COLLABORATOR"] = [Permissions.ChannelSalesView, Permissions.ChannelSalesRegister, Permissions.ChannelSalesActivity, Permissions.ChannelSalesReportContract, Permissions.ChannelSalesCommissionView],
        };
        var currentLinks = await db.PermissionRoles.Select(x => new { x.RoleId, x.PermissionId }).ToListAsync();
        foreach (var managerRole in new[] { "SALES_MANAGER", "PARTNER_ADMIN" })
            rolePermissions[managerRole] = [.. rolePermissions[managerRole], Permissions.SchoolContractReview, Permissions.SchoolProposalReview,
                Permissions.SchoolAllocationManage, Permissions.SchoolExtensionReview, Permissions.SchoolHandoverManage, Permissions.SchoolCareAssign];
        foreach (var salesRole in new[] { "SALES", "CHANNEL_SALES", "PARTNER_COLLABORATOR" })
            rolePermissions[salesRole] = [.. rolePermissions[salesRole], Permissions.SchoolProposalSubmit];
        rolePermissions["BOARD"] = [.. rolePermissions["BOARD"], Permissions.SchoolDisputeResolve, Permissions.SchoolEscalationResolve];
        rolePermissions["ACCOUNTANT"] = [.. rolePermissions["ACCOUNTANT"], Permissions.ChannelSalesContractCancel, Permissions.ChannelSalesRevenueRefund];
        rolePermissions["CUSTOMER_CARE"] = [.. rolePermissions["CUSTOMER_CARE"], Permissions.SchoolSupportManage];
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

        async Task<User> EnsureUser(string code, string name, string email, string password, string roleCode)
        {
            var user = await db.Users.SingleOrDefaultAsync(x => x.Email == email);
            if (user is null)
            {
                user = new User { Code = code, Name = name, Email = email, Status = "ACTIVE", EmailVerifiedAt = now, CreatedAt = now, UpdatedAt = now };
                user.Password = hasher.HashPassword(user, password);
                db.Users.Add(user);
                await db.SaveChangesAsync();
            }
            var role = roleByCode[roleCode];
            if (!await db.UserRoles.AnyAsync(x => x.UserId == user.Id && x.RoleId == role.Id)) db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
            return user;
        }

        var admin = await db.Users.SingleAsync(x => x.Email == "admin@kidsfit.vn");
        var sales = await db.Users.SingleAsync(x => x.Email == "sales@kidsfit.vn");
        var checkeeUser = await EnsureUser("CHECKEE001", "CHECKEE Đối soát", "checkee@kidsfit.vn", "Checkee@2026", "CHECKEE");
        var partnerUser = await EnsureUser("PARTNER001", "Đối tác An Phát", "partner@kidsfit.vn", "Partner@2026", "PARTNER_ADMIN");
        var collaborator = await EnsureUser("CTV001", "CTV Thu Hà", "ctv@kidsfit.vn", "Ctv@2026", "PARTNER_COLLABORATOR");
        var accountant = await EnsureUser("ACC001", "Kế toán KIDSFIT", "accountant@kidsfit.vn", "Accountant@2026", "ACCOUNTANT");
        var board = await EnsureUser("BOARD001", "Ban giám đốc", "board@kidsfit.vn", "Board@2026", "BOARD");
        var manager = await EnsureUser("MANAGER001", "Quản lý bán hàng", "manager@kidsfit.vn", "Manager@2026", "SALES_MANAGER");
        var care = await EnsureUser("CARE001", "Chăm sóc khách hàng", "care@kidsfit.vn", "CustomerCare@2026", "CUSTOMER_CARE");

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
        if (kidsfit.CommissionRateCeiling == 0) kidsfit.CommissionRateCeiling = 20m;
        if (partner.CommissionRateCeiling == 0) partner.CommissionRateCeiling = 15m;

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
        await EnsureMembership(kidsfit, board, "BOARD", true, admin.Id);
        await EnsureMembership(kidsfit, manager, "SALES_MANAGER", true, admin.Id);
        await EnsureMembership(kidsfit, care, "CUSTOMER_CARE", true, admin.Id);
        await EnsureMembership(checkee, checkeeUser, "RECONCILIATION", true);
        await EnsureMembership(partner, partnerUser, "PARTNER_ADMIN", true);
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
                RatePercent = 10m,
                EffectiveFrom = new DateOnly(2026, 1, 1),
                Status = "ACTIVE",
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
                RatePercent = 12m,
                EffectiveFrom = new DateOnly(2026, 1, 1),
                Status = "ACTIVE",
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

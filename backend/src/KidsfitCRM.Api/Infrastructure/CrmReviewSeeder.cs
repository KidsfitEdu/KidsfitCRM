using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using KidsfitCRM.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>Opt-in fictional CRM review data; never load into production or shared databases.</summary>
internal static class CrmReviewSeeder
{
    private sealed class ReviewData
    {
        public int Version { get; set; }
        public string Purpose { get; set; } = "";
        public CommissionFixture Commission { get; set; } = new();
        public List<SchoolFixture> Schools { get; set; } = [];
        public List<ProposalFixture> Proposals { get; set; } = [];
        public ExtensionFixture Extension { get; set; } = new();
        public InvitationFixture Invitation { get; set; } = new();
        public DisputeFixture Dispute { get; set; } = new();
        public DeferralFixture Deferral { get; set; } = new();
        public SupportFixture Support { get; set; } = new();
        public DepartureFixture Departure { get; set; } = new();
    }
    private sealed class CommissionFixture
    {
        public decimal RatePercent { get; set; }
        public string Basis { get; set; } = "";
        public string Scope { get; set; } = "";
    }
    private sealed class SchoolFixture
    {
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public string Type { get; set; } = "";
        public string Province { get; set; } = "";
        public string Ward { get; set; } = "";
        public string Address { get; set; } = "";
        public string SchoolPhone { get; set; } = "";
        public string Email { get; set; } = "";
        public string Principal { get; set; } = "";
        public string VicePrincipal { get; set; } = "";
        public string ContactName { get; set; } = "";
        public string ContactPosition { get; set; } = "";
        public string ContactPhone { get; set; } = "";
        public int StudentCount { get; set; }
        public int ClassCount { get; set; }
        public string? Owner { get; set; }
        public string? ContractStatus { get; set; }
        public string? ReconciliationStatus { get; set; }
        public decimal ContractValue { get; set; }
        public decimal ReceivedAmount { get; set; }
        public decimal RefundAmount { get; set; }
        public List<string> ContactHistory { get; set; } = [];
        public List<BranchFixture> Branches { get; set; } = [];
    }
    private sealed class BranchFixture
    {
        public string Name { get; set; } = "";
        public string Ward { get; set; } = "";
        public string Address { get; set; } = "";
        public string ContactName { get; set; } = "";
        public string ContactPosition { get; set; } = "";
        public string ContactPhone { get; set; } = "";
        public string SchoolPhone { get; set; } = "";
        public string Email { get; set; } = "";
        public int StudentCount { get; set; }
        public int ClassCount { get; set; }
    }
    private sealed class ProposalFixture
    {
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public string Owner { get; set; } = "";
        public string Status { get; set; } = "";
        public int OffsetHours { get; set; }
        public string Reason { get; set; } = "";
    }
    private sealed class ExtensionFixture
    {
        public string SchoolCode { get; set; } = "";
        public string Progress { get; set; } = "";
        public string Evidence { get; set; } = "";
        public int ExtensionDays { get; set; }
    }
    private sealed class InvitationFixture
    {
        public string SchoolCode { get; set; } = "";
        public int ResponseDays { get; set; }
        public string Reason { get; set; } = "";
    }
    private sealed class DisputeFixture
    {
        public string SchoolCode { get; set; } = "";
        public string Reason { get; set; } = "";
        public string Evidence { get; set; } = "";
    }
    private sealed class DeferralFixture
    {
        public string SchoolCode { get; set; } = "";
        public string Reason { get; set; } = "";
        public int ReviewDays { get; set; }
    }
    private sealed class SupportFixture
    {
        public string SchoolCode { get; set; } = "";
        public string TicketSubject { get; set; } = "";
        public string TicketDescription { get; set; } = "";
    }
    private sealed class DepartureFixture
    {
        public string SchoolCode { get; set; } = "";
        public string FormerUserCode { get; set; } = "";
        public string Reason { get; set; } = "";
    }
    private static string Fingerprint(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    public static async Task SeedAsync(KidsfitDbContext db, IPasswordHasher<User> hasher,
        string sharedPassword, DateTime now, string contentRootPath)
    {
        var path = Path.Combine(contentRootPath, "SeedData", "crm-review-data.json");
        if (!File.Exists(path)) throw new FileNotFoundException("CRM review fixture missing.", path);
        var fixture = JsonSerializer.Deserialize<ReviewData>(await File.ReadAllTextAsync(path),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true, PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower })
            ?? throw new InvalidOperationException("CRM review JSON is empty.");
        if (fixture.Version != 1 || fixture.Purpose != "TRAINING_ONLY"
            || fixture.Schools.Count != 10
            || fixture.Schools.Sum(x => x.Branches.Count) != 9
            || fixture.Commission.RatePercent != 30
            || fixture.Commission.Basis != "NET_COLLECTED_CASH"
            || fixture.Commission.Scope != "ISOLATED_REVIEW_ONLY"
            || fixture.Schools.Select(x => x.Code).Distinct().Count() != 10)
            throw new InvalidOperationException("Invalid or unexpectedly modified review fixture.");
        for (var i = 0; i < 10; i++)
        {
            var school = fixture.Schools[i];
            if (school.Code != $"SCH{i + 1:D4}"
                || string.IsNullOrWhiteSpace(school.ContactName) || string.IsNullOrWhiteSpace(school.Address)
                || string.IsNullOrWhiteSpace(school.Email) || string.IsNullOrWhiteSpace(school.VicePrincipal)
                || !school.Email.EndsWith(".example.test", StringComparison.Ordinal)
                || !school.ContactPhone.StartsWith("0000-", StringComparison.Ordinal)
                || school.ReceivedAmount > school.ContractValue
                || school.RefundAmount > school.ReceivedAmount)
                throw new InvalidOperationException("Malformed private-safe school review data: " + school.Code);
        }
        var codes = fixture.Schools.Select(x => x.Code).ToArray();
        if (await db.DirectorySchools.AnyAsync(x => !codes.Contains(x.SchoolCode)))
            throw new InvalidOperationException("Review scenario requires a fresh, dedicated disposable MySQL database.");
        if (await db.ChannelCustomers.AnyAsync(x => !x.Code.StartsWith("REV-SCH-")))
            throw new InvalidOperationException("Review scenario refuses existing unrelated customers; use an isolated database.");

        var admin = await db.Users.SingleAsync(x => x.Code == "ADMIN001");
        var manager = await db.Users.SingleAsync(x => x.Code == "MANAGER001");
        var sales = await db.Users.SingleAsync(x => x.Code == "SALES001");
        var ctv = await db.Users.SingleAsync(x => x.Code == "CTV001");
        var partnerManager = await db.Users.SingleAsync(x => x.Code == "PARTNER001");
        var accountant = await db.Users.SingleAsync(x => x.Code == "ACC001");
        var checkeeUser = await db.Users.SingleAsync(x => x.Code == "CHECKEE001");
        var care = await db.Users.SingleAsync(x => x.Code == "CARE001");
        var kidsfit = await db.Organizations.SingleAsync(x => x.Code == "KIDSFIT");
        var partner = await db.Organizations.SingleAsync(x => x.Code == "PARTNER_AN_PHAT");
        var checkee = await db.Organizations.SingleAsync(x => x.Code == "CHECKEE");
        var package = await db.CheckeeProductPackages.SingleAsync(x => x.Code == "CHECKEE_GROWTH");
        var careRole = await db.Roles.SingleAsync(x => x.Code == "CUSTOMER_SERVICE");
        var care2 = await db.Users.SingleOrDefaultAsync(x => x.Code == "CARE002");
        if (care2 is null)
        {
            care2 = new User { Code = "CARE002", Name = "Nhân viên CSKH Mai", Email = "care2@kidsfit.vn",
                Status = "ACTIVE", EmailVerifiedAt = now, CreatedAt = now, UpdatedAt = now };
            care2.Password = hasher.HashPassword(care2, sharedPassword);
            db.Users.Add(care2);
            await db.SaveChangesAsync();
        }
        if (!await db.UserRoles.AnyAsync(x => x.UserId == care2.Id && x.RoleId == careRole.Id))
            db.UserRoles.Add(new UserRole { UserId = care2.Id, RoleId = careRole.Id });
        if (!await db.OrganizationMemberships.AnyAsync(x => x.UserId == care2.Id && x.OrganizationId == kidsfit.Id))
            db.OrganizationMemberships.Add(new OrganizationMembership {
                UserId = care2.Id, OrganizationId = kidsfit.Id, ManagerUserId = admin.Id,
                MembershipType = "CUSTOMER_SERVICE", IsPrimary = true, Status = "ACTIVE",
                CreatedAt = now, UpdatedAt = now });
        await db.SaveChangesAsync();

        // 30% is specifically requested for this review profile and is calculated from
        // collected cash net of refunds. Do not make this a production policy default.
        var policy = await db.CommissionPolicyVersions.SingleOrDefaultAsync(x => x.Code == "REVIEW-CASH-30-2026");
        if (policy is null)
        {
            policy = new CommissionPolicyVersion {
                OrganizationId = kidsfit.Id, Code = "REVIEW-CASH-30-2026",
                Name = "Hoa hồng 30% trên tiền đã thu ròng - dữ liệu review",
                PersonnelType = "SALES", RatePercent = 30m,
                EffectiveFrom = new DateOnly(2026, 1, 1),
                Status = "ACTIVE", CreatedByUserId = admin.Id, CreatedAt = now, UpdatedAt = now };
            db.CommissionPolicyVersions.Add(policy);
            await db.SaveChangesAsync();
        }
        // A separate partner scoped policy allows the CTV to have the same rate,
        // without inadvertently applying an internal-sales policy to other organizations.
        var partnerPolicy = await db.CommissionPolicyVersions.SingleOrDefaultAsync(x => x.Code == "REVIEW-CTV-CASH-30-2026");
        if (partnerPolicy is null)
        {
            partnerPolicy = new CommissionPolicyVersion {
                OrganizationId = partner.Id, Code = "REVIEW-CTV-CASH-30-2026",
                Name = "Hoa hồng CTV 30% trên tiền đã thu ròng - dữ liệu review",
                PersonnelType = "COLLABORATOR", RatePercent = 30m,
                EffectiveFrom = new DateOnly(2026, 1, 1),
                Status = "ACTIVE", CreatedByUserId = admin.Id, CreatedAt = now, UpdatedAt = now };
            db.CommissionPolicyVersions.Add(partnerPolicy);
            await db.SaveChangesAsync();
        }
        if (kidsfit.CommissionRateCeiling < 30m) kidsfit.CommissionRateCeiling = 30m;
        if (partner.CommissionRateCeiling < 30m) partner.CommissionRateCeiling = 30m;
        await db.SaveChangesAsync();

        var schoolKeys = new Dictionary<string, (long DirectoryId, long CustomerId)>();
        foreach (var sample in fixture.Schools)
        {
            var directory = await db.DirectorySchools.SingleOrDefaultAsync(x => x.SchoolCode == sample.Code);
            if (directory is null)
            {
                var customer = new ChannelCustomer {
                    Code = "REV-SCH-" + sample.Code, DisplayName = sample.Name,
                    CustomerType = "ORGANIZATION", Province = sample.Province,
                    District = sample.Ward, Address = sample.Address,
                    ContactName = sample.ContactName, ContactPosition = sample.ContactPosition,
                    Phone = sample.SchoolPhone, Email = sample.Email,
                    Source = "REVIEW_FIXTURE", VerificationStatus = "VERIFIED",
                    LifecycleStatus = sample.ContractStatus == "ACTIVE" ? "CONTRACTED" : "PROSPECT",
                    Note = $"Dữ liệu hư cấu; loại hình {sample.Type}; {sample.ClassCount} lớp; {sample.StudentCount} học sinh; Phó hiệu trưởng: {sample.VicePrincipal}",
                    OrganizationId = kidsfit.Id, CreatedByUserId = admin.Id,
                    CreatedAt = now, UpdatedAt = now };
                db.ChannelCustomers.Add(customer);
                await db.SaveChangesAsync();
                directory = new DirectorySchool { SchoolCode = sample.Code,
                    CustomerId = customer.Id, CreatedAt = now, UpdatedAt = now };
                db.DirectorySchools.Add(directory);
                db.CustomerIdentifiers.Add(new CustomerIdentifier {
                    CustomerId = customer.Id, IdentifierType = "SCHOOL_CODE",
                    NormalizedValue = sample.Code, DisplayValue = sample.Code, IsVerified = true,
                    CreatedAt = now, UpdatedAt = now });
                await db.SaveChangesAsync();
            }
            else if (await db.ChannelCustomers.Where(x => x.Id == directory.CustomerId)
                .AnyAsync(x => x.Code != "REV-SCH-" + sample.Code))
                throw new InvalidOperationException("Existing school has different provenance: " + sample.Code);
            schoolKeys[sample.Code] = (directory.Id, directory.CustomerId);
            var units = new[] { new BranchFixture {
                Name = sample.Name, Ward = sample.Ward, Address = sample.Address,
                ContactName = sample.ContactName, ContactPosition = sample.ContactPosition,
                ContactPhone = sample.ContactPhone, SchoolPhone = sample.SchoolPhone,
                Email = sample.Email, StudentCount = sample.StudentCount, ClassCount = sample.ClassCount
            }}.Concat(sample.Branches).ToArray();
            for (var i = 0; i < units.Length; i++)
            {
                var item = units[i];
                var key = Fingerprint(sample.Code + ":" + i + ":" + item.Name);
                if (await db.SchoolUnits.AnyAsync(x => x.DirectorySchoolId == directory.Id && x.ContentHash == key)) continue;
                db.SchoolUnits.Add(new SchoolUnit {
                    DirectorySchoolId = directory.Id, ContentHash = key, Version = 1,
                    UnitType = i == 0 ? "MAIN" : "BRANCH", Name = item.Name,
                    Province = sample.Province, Ward = item.Ward, Address = item.Address,
                    ContactName = item.ContactName, ContactPosition = item.ContactPosition,
                    ContactPhone = item.ContactPhone, SchoolPhone = item.SchoolPhone, Email = item.Email,
                    Note = $"Dữ liệu hư cấu; {item.ClassCount} lớp; {item.StudentCount} học sinh; hiệu phó: {sample.VicePrincipal}",
                    SourceRow = 0, CreatedAt = now, UpdatedAt = now });
            }
            await db.SaveChangesAsync();
        }

        var activeApproaches = new Dictionary<string, long>();
        foreach (var school in fixture.Schools.Where(x => x.Owner is not null))
        {
            var owner = school.Owner == "CTV" ? ctv : sales;
            var org = school.Owner == "CTV" ? partner : kidsfit;
            var key = "review-approach-" + school.Code;
            var approach = await db.ApproachRegistrations.SingleOrDefaultAsync(x => x.IdempotencyKey == key);
            if (approach is null)
            {
                var completed = school.ContractStatus == "ACTIVE";
                approach = new ApproachRegistration {
                    CustomerId = schoolKeys[school.Code].CustomerId,
                    OwnerUserId = owner.Id, OwnerOrganizationId = org.Id, CreatedByUserId = owner.Id,
                    Status = completed ? "CONVERTED" : "ACTIVE",
                    RegisteredAt = completed ? now.AddDays(-25) : now.AddDays(-2),
                    ProtectedUntil = completed ? now.AddDays(-20) : now.AddDays(3),
                    Source = "REVIEW_FIXTURE", Note = "Tình huống giả lập phục vụ đánh giá CRM",
                    IdempotencyKey = key, CreatedAt = now.AddDays(-25), UpdatedAt = now };
                db.ApproachRegistrations.Add(approach);
                await db.SaveChangesAsync();
            }
            activeApproaches[school.Code] = approach.Id;
            if (school.ContractStatus != "ACTIVE" &&
                !await db.CustomerProtections.AnyAsync(x => x.ApproachRegistrationId == approach.Id))
                db.CustomerProtections.Add(new CustomerProtection {
                    ApproachRegistrationId = approach.Id, CustomerId = approach.CustomerId,
                    OwnerUserId = owner.Id, OwnerOrganizationId = org.Id, SourceType = "APPROACH",
                    Status = "ACTIVE", EffectiveFrom = approach.RegisteredAt,
                    EffectiveUntil = approach.ProtectedUntil,
                    CreatedAt = now, UpdatedAt = now });
            if (school.ContactHistory.Count > 0 &&
                !await db.CustomerActivities.AnyAsync(x => x.CustomerId == approach.CustomerId && x.UserId == owner.Id &&
                    x.Content.StartsWith("REVIEW:")))
                foreach (var note in school.ContactHistory)
                    db.CustomerActivities.Add(new CustomerActivity {
                        CustomerId = approach.CustomerId, ApproachRegistrationId = approach.Id,
                        UserId = owner.Id, ActivityType = "CALL",
                        ContactName = school.ContactName, ContactPosition = school.ContactPosition,
                        Content = "REVIEW: " + note, Feedback = "Đã ghi nhận phản hồi của nhà trường",
                        OccurredAt = now.AddDays(-1), NextFollowUpAt = now.AddDays(1),
                        CreatedAt = now.AddDays(-1), UpdatedAt = now });
            await db.SaveChangesAsync();
        }

        foreach (var school in fixture.Schools.Where(x => x.ContractStatus is not null))
        {
            var owner = school.Owner == "CTV" ? ctv : sales;
            var org = school.Owner == "CTV" ? partner : kidsfit;
            var directManager = school.Owner == "CTV" ? partnerManager : manager;
            var contractCode = "REV-CONTRACT-" + school.Code;
            var contract = await db.SalesContracts.SingleOrDefaultAsync(x => x.ContractCode == contractCode);
            if (contract is null)
            {
                var verified = school.ReconciliationStatus == "CONFIRMED";
                var start = now.AddDays(-10);
                contract = new SalesContract {
                    CustomerId = schoolKeys[school.Code].CustomerId,
                    ApproachRegistrationId = activeApproaches[school.Code],
                    OwnerUserId = owner.Id, OwnerOrganizationId = org.Id,
                    OwnerPersonnelType = school.Owner == "CTV" ? "COLLABORATOR" : "SALES",
                    ReportedByUserId = owner.Id, ContractCode = contractCode,
                    SignedOn = DateOnly.FromDateTime(now.AddDays(-20)),
                    TotalValue = school.ContractValue, Currency = "VND",
                    Status = school.ContractStatus!, StudentCount = school.StudentCount,
                    ServicePlan = "SCHOOL_YEAR", SchoolUnitIdsJson = "[]",
                    ManagerReviewedAt = school.ContractStatus is "PENDING_REVIEW" or "NEEDS_REVISION" ? null : now.AddDays(-12),
                    ManagerReviewedByUserId = school.ContractStatus is "PENDING_REVIEW" or "NEEDS_REVISION" ? null : directManager.Id,
                    RequiresSchoolVerification = true, VerifiedAt = verified ? start : null,
                    ProtectionStartsAt = school.ContractStatus == "ACTIVE" ? start : now,
                    ProtectionUntil = school.ContractStatus == "ACTIVE" ? start.AddYears(5) : now,
                    CareUserId = school.ContractStatus == "ACTIVE" ? school.Code == "SCH0001" ? care.Id : care2.Id : null,
                    CareOrganizationId = school.ContractStatus == "ACTIVE" ? kidsfit.Id : null,
                    EvidenceReference = "Tình huống hợp đồng hư cấu; không phải bằng chứng ký kết thật",
                    IdempotencyKey = "review-contract-" + school.Code,
                    CreatedAt = now.AddDays(-20), UpdatedAt = now };
                db.SalesContracts.Add(contract);
                await db.SaveChangesAsync();
                db.SalesContractItems.Add(new SalesContractItem {
                    ContractId = contract.Id, ProductPackageId = package.Id,
                    Description = package.Name, Quantity = 1, UnitPrice = school.ContractValue,
                    Amount = school.ContractValue, CreatedAt = now, UpdatedAt = now });
            }
            if (school.ContractStatus == "ACTIVE" &&
                !await db.CustomerProtections.AnyAsync(x => x.ContractId == contract.Id))
                db.CustomerProtections.Add(new CustomerProtection {
                    ContractId = contract.Id, CustomerId = contract.CustomerId,
                    OwnerUserId = owner.Id, OwnerOrganizationId = org.Id,
                    SourceType = "CONTRACT", Status = "ACTIVE",
                    EffectiveFrom = contract.VerifiedAt!.Value,
                    EffectiveUntil = contract.VerifiedAt!.Value.AddYears(5),
                    CreatedAt = now, UpdatedAt = now });
            await db.SaveChangesAsync();

            var caseRecord = await db.ReconciliationCases.SingleOrDefaultAsync(x => x.ContractId == contract.Id);
            if (caseRecord is null)
            {
                caseRecord = new ReconciliationCase {
                    ContractId = contract.Id, CustomerId = contract.CustomerId,
                    CheckeeOrganizationId = checkee.Id,
                    Status = school.ReconciliationStatus ?? "AWAITING_MANAGER",
                    OpenedAt = now.AddDays(-12),
                    ResolvedAt = school.ReconciliationStatus == "CONFIRMED" ? now.AddDays(-10) : null,
                    CreatedAt = now, UpdatedAt = now };
                db.ReconciliationCases.Add(caseRecord);
                await db.SaveChangesAsync();
                db.ReconciliationEvents.Add(new ReconciliationEvent {
                    ReconciliationCaseId = caseRecord.Id, ActorUserId = directManager.Id,
                    EventType = "MANAGER_FORWARDED", CreatedAt = now.AddDays(-12), UpdatedAt = now });
                if (school.ReconciliationStatus == "CONFIRMED")
                    db.ReconciliationEvents.Add(new ReconciliationEvent {
                        ReconciliationCaseId = caseRecord.Id, ActorUserId = checkeeUser.Id,
                        EventType = "CONFIRMED", Reason = "Tình huống xác minh hợp đồng hư cấu",
                        CreatedAt = now.AddDays(-10), UpdatedAt = now });
            }
            if (school.ContractStatus == "ACTIVE")
            {
                var due = await db.RevenueSchedules.SingleOrDefaultAsync(x => x.ContractId == contract.Id);
                if (due is null)
                {
                    due = new RevenueSchedule {
                        ContractId = contract.Id, DueOn = DateOnly.FromDateTime(now.AddDays(25)),
                        AmountDue = school.ContractValue, AmountReceived = 0,
                        Status = "PENDING", CreatedAt = now, UpdatedAt = now };
                    db.RevenueSchedules.Add(due);
                    await db.SaveChangesAsync();
                }
                var receiptKey = "review-receipt-" + school.Code;
                var receipt = await db.RevenueReceipts.SingleOrDefaultAsync(x => x.IdempotencyKey == receiptKey);
                if (receipt is null)
                {
                    receipt = new RevenueReceipt {
                        ContractId = contract.Id, RevenueScheduleId = due.Id,
                        Amount = school.ReceivedAmount, ReceivedAt = now.AddDays(-5),
                        ReferenceCode = "REV-RECEIPT-" + school.Code,
                        PaymentMethod = "BANK_TRANSFER", Status = "COMPLETED",
                        RecordedByUserId = accountant.Id, IdempotencyKey = receiptKey,
                        CreatedAt = now.AddDays(-5), UpdatedAt = now };
                    db.RevenueReceipts.Add(receipt);
                    due.AmountReceived = school.ReceivedAmount;
                    due.Status = school.ReceivedAmount == school.ContractValue ? "PAID" : "PARTIAL";
                    due.UpdatedAt = now;
                    await db.SaveChangesAsync();
                }
                // Commission follows cash actually retained after any fictional refund.
                // We only populate the ledger once; refunds are modeled as an explicit negative adjustment.
                var selectedPolicy = school.Owner == "CTV" ? partnerPolicy : policy;
                var accrualKey = "review-commission-" + school.Code;
                if (!await db.CommissionLedgerEntries.AnyAsync(x => x.IdempotencyKey == accrualKey))
                    db.CommissionLedgerEntries.Add(new CommissionLedgerEntry {
                        ContractId = contract.Id, RevenueReceiptId = receipt.Id,
                        PolicyVersionId = selectedPolicy.Id, BeneficiaryUserId = owner.Id,
                        BeneficiaryOrganizationId = org.Id, EntryType = "ACCRUAL",
                        CalculationBase = school.ReceivedAmount, RatePercent = 30m,
                        Amount = school.ReceivedAmount * 0.30m, Status = "ACCRUED",
                        Period = now.ToString("yyyy-MM"), OccurredAt = now.AddDays(-5),
                        CreatedByUserId = accountant.Id, IdempotencyKey = accrualKey,
                        CreatedAt = now, UpdatedAt = now });
                if (school.RefundAmount > 0 &&
                    !await db.RevenueRefunds.AnyAsync(x => x.IdempotencyKey == "review-refund-" + school.Code))
                    db.RevenueRefunds.Add(new RevenueRefund {
                        ContractId = contract.Id, RevenueReceiptId = receipt.Id,
                        RecordedByUserId = accountant.Id, Amount = school.RefundAmount,
                        RefundedAt = now.AddDays(-2), ReferenceCode = "REV-REFUND-" + school.Code,
                        Reason = "Hoàn một phần theo kịch bản giả lập",
                        DecisionReference = "REVIEW-SCENARIO", IdempotencyKey = "review-refund-" + school.Code,
                        CreatedAt = now.AddDays(-2), UpdatedAt = now });
                if (school.RefundAmount > 0 &&
                    !await db.CommissionLedgerEntries.AnyAsync(x => x.IdempotencyKey == "review-commission-refund-" + school.Code))
                    db.CommissionLedgerEntries.Add(new CommissionLedgerEntry {
                        ContractId = contract.Id, RevenueReceiptId = receipt.Id,
                        PolicyVersionId = selectedPolicy.Id, BeneficiaryUserId = owner.Id,
                        BeneficiaryOrganizationId = org.Id, EntryType = "ADJUSTMENT",
                        CalculationBase = school.RefundAmount, RatePercent = 30m,
                        Amount = -(school.RefundAmount * 0.30m), Status = "ACCRUED",
                        Period = now.ToString("yyyy-MM"), OccurredAt = now.AddDays(-2),
                        Reason = "Điều chỉnh khoản hoa hồng sau hoàn tiền giả lập",
                        CreatedByUserId = accountant.Id,
                        IdempotencyKey = "review-commission-refund-" + school.Code,
                        CreatedAt = now, UpdatedAt = now });
                await db.SaveChangesAsync();
            }
        }

        foreach (var school in fixture.Schools.Where(x => x.ContractStatus == "ACTIVE"))
        {
            var contractCode = "REV-CONTRACT-" + school.Code;
            var contract = await db.SalesContracts.SingleAsync(x => x.ContractCode == contractCode);
            var assignedCare = school.Code == "SCH0001" ? care : care2;
            if (!await db.ContractCareHandovers.AnyAsync(x => x.ContractId == contract.Id))
                db.ContractCareHandovers.Add(new ContractCareHandover {
                    ContractId = contract.Id, AssignedUserId = assignedCare.Id,
                    CareOrganizationId = kidsfit.Id, ActorUserId = admin.Id,
                    Reason = "Admin bàn giao trường cho CSKH trong dữ liệu hư cấu",
                    IdempotencyKey = "review-care-" + school.Code,
                    RequestFingerprint = Fingerprint("review-care-" + school.Code),
                    CreatedAt = now.AddDays(-3), UpdatedAt = now });
            if (school.Code == "SCH0001" &&
                !await db.CustomerActivities.AnyAsync(x => x.CustomerId == contract.CustomerId &&
                    x.UserId == assignedCare.Id && x.ActivityType == "SUPPORT"))
                db.CustomerActivities.Add(new CustomerActivity {
                    CustomerId = contract.CustomerId, UserId = assignedCare.Id,
                    ActivityType = "SUPPORT", Content = "CSKH đã hướng dẫn cài đặt tài khoản quản trị và phân quyền.",
                    OccurredAt = now.AddHours(-6), NextFollowUpAt = now.AddDays(2),
                    CreatedAt = now, UpdatedAt = now });
            if (school.Code == fixture.Support.SchoolCode &&
                !await db.CustomerSupportCases.AnyAsync(x => x.IdempotencyKey == "review-support-" + school.Code))
                db.CustomerSupportCases.Add(new CustomerSupportCase {
                    ContractId = contract.Id, CustomerId = contract.CustomerId,
                    OrganizationId = kidsfit.Id, AssignedUserId = assignedCare.Id,
                    CreatedByUserId = assignedCare.Id, TicketType = "SYSTEM_ERROR",
                    CheckeeOrganizationId = checkee.Id, ForwardedByUserId = assignedCare.Id,
                    ForwardedAt = now.AddHours(-3),
                    Subject = fixture.Support.TicketSubject,
                    Description = fixture.Support.TicketDescription,
                    Status = "OPEN", IdempotencyKey = "review-support-" + school.Code,
                    CreatedAt = now.AddHours(-3), UpdatedAt = now });
        }
        await db.SaveChangesAsync();

        foreach (var input in fixture.Proposals)
        {
            if (await db.SchoolProposals.AnyAsync(x => x.SchoolCode == input.Code)) continue;
            var fromPartner = input.Owner == "CTV";
            var managerUser = fromPartner ? partnerManager : manager;
            db.SchoolProposals.Add(new SchoolProposal {
                SchoolCode = input.Code, Name = input.Name,
                Province = "Cần Thơ", Ward = "Phường Ninh Kiều",
                Address = "Địa chỉ hư cấu để review",
                ContactName = "Người liên hệ giả lập",
                ContactPosition = "Hiệu trưởng", ContactPhone = "0000-11-999",
                Email = "proposal@schools.example.test",
                OrganizationId = fromPartner ? partner.Id : kidsfit.Id,
                SubmittedByUserId = fromPartner ? ctv.Id : sales.Id,
                ManagerUserId = managerUser.Id, Reason = input.Reason,
                Status = input.Status, ReviewDueAt = now.AddHours(input.OffsetHours),
                ManagerReviewedAt = input.Status == "PENDING_MANAGER" ? null : now.AddDays(-1),
                ReviewedByUserId = input.Status == "PENDING_MANAGER" ? null : managerUser.Id,
                DecisionReason = input.Status == "REJECTED" ? input.Reason : null,
                IdempotencyKey = "review-proposal-" + input.Code,
                RequestFingerprint = Fingerprint("review-proposal-" + input.Code),
                CreatedAt = now.AddDays(-3), UpdatedAt = now });
        }

        if (!await db.SchoolInvitations.AnyAsync(x => x.IdempotencyKey == "review-invite-" + fixture.Invitation.SchoolCode))
            db.SchoolInvitations.Add(new SchoolInvitation {
                DirectorySchoolId = schoolKeys[fixture.Invitation.SchoolCode].DirectoryId,
                OrganizationId = partner.Id, AssignedByUserId = partnerManager.Id,
                AssigneeUserId = ctv.Id, Status = "PENDING",
                RespondBy = now.AddDays(fixture.Invitation.ResponseDays),
                Reason = fixture.Invitation.Reason,
                IdempotencyKey = "review-invite-" + fixture.Invitation.SchoolCode,
                CreatedAt = now, UpdatedAt = now });
        var extensionApproachId = activeApproaches[fixture.Extension.SchoolCode];
        if (!await db.SchoolExtensionRequests.AnyAsync(x => x.IdempotencyKey == "review-extension-" + fixture.Extension.SchoolCode))
        {
            var approach = await db.ApproachRegistrations.SingleAsync(x => x.Id == extensionApproachId);
            db.SchoolExtensionRequests.Add(new SchoolExtensionRequest {
                ApproachRegistrationId = approach.Id, OrganizationId = kidsfit.Id,
                RequestedByUserId = sales.Id, ManagerUserId = manager.Id,
                OriginalProtectedUntil = approach.ProtectedUntil,
                RequestedUntil = approach.ProtectedUntil.AddDays(fixture.Extension.ExtensionDays),
                ReviewDueAt = now.AddDays(1), NextAppointmentAt = now.AddDays(2),
                Progress = fixture.Extension.Progress, EvidenceReference = fixture.Extension.Evidence,
                Status = "PENDING", IdempotencyKey = "review-extension-" + fixture.Extension.SchoolCode,
                CreatedAt = now, UpdatedAt = now });
        }
        if (!await db.SchoolDisputes.AnyAsync(x => x.IdempotencyKey == "review-dispute-" + fixture.Dispute.SchoolCode))
            db.SchoolDisputes.Add(new SchoolDispute {
                CustomerId = schoolKeys[fixture.Dispute.SchoolCode].CustomerId,
                OrganizationId = kidsfit.Id, OpenedByUserId = manager.Id,
                Reason = fixture.Dispute.Reason, EvidenceReference = fixture.Dispute.Evidence,
                Status = "OPEN", IdempotencyKey = "review-dispute-" + fixture.Dispute.SchoolCode,
                CreatedAt = now, UpdatedAt = now });
        if (!await db.SchoolDeferrals.AnyAsync(x => x.IdempotencyKey == "review-deferral-" + fixture.Deferral.SchoolCode))
            db.SchoolDeferrals.Add(new SchoolDeferral {
                DirectorySchoolId = schoolKeys[fixture.Deferral.SchoolCode].DirectoryId,
                OrganizationId = kidsfit.Id, ManagerUserId = manager.Id,
                Reason = fixture.Deferral.Reason, ReviewAt = now.AddDays(fixture.Deferral.ReviewDays),
                Status = "OPEN", IdempotencyKey = "review-deferral-" + fixture.Deferral.SchoolCode,
                CreatedAt = now, UpdatedAt = now });

        // Reviewer can inspect an un-paid draft without fabricating a completed bank transfer.
        var salesAccrual = await db.CommissionLedgerEntries.SingleAsync(x => x.IdempotencyKey == "review-commission-SCH0001");
        var payout = await db.Payouts.SingleOrDefaultAsync(x => x.Code == "REV-PAYOUT-SALES-2026");
        if (payout is null)
        {
            payout = new Payout {
                OrganizationId = kidsfit.Id, BeneficiaryUserId = sales.Id,
                Code = "REV-PAYOUT-SALES-2026", Period = now.ToString("yyyy-MM"),
                GrossAmount = salesAccrual.Amount, NetAmount = salesAccrual.Amount,
                WithholdingAmount = 0m, Status = "DRAFT",
                CreatedByUserId = accountant.Id,
                IdempotencyKey = "review-payout-sales-2026",
                CreatedAt = now, UpdatedAt = now };
            db.Payouts.Add(payout);
            await db.SaveChangesAsync();
        }
        if (!await db.PayoutItems.AnyAsync(x => x.PayoutId == payout.Id &&
            x.CommissionLedgerEntryId == salesAccrual.Id))
            db.PayoutItems.Add(new PayoutItem {
                PayoutId = payout.Id, CommissionLedgerEntryId = salesAccrual.Id,
                Amount = salesAccrual.Amount, CreatedAt = now, UpdatedAt = now });

        // A formerly employed reviewer account has a recorded administrative departure.
        // No real ownership, existing account or verified contract is modified.
        if (fixture.Departure.SchoolCode != "SCH0010" || fixture.Departure.FormerUserCode != "SALES_LEFT01")
            throw new InvalidOperationException("Invalid fictional departure fixture.");
        var former = await db.Users.SingleOrDefaultAsync(x => x.Code == fixture.Departure.FormerUserCode);
        if (former is null)
        {
            former = new User {
                Code = fixture.Departure.FormerUserCode, Name = "Nhân viên kinh doanh đã nghỉ",
                Email = "former-sales@kidsfit.example.test", Status = "INACTIVE",
                CreatedAt = now.AddDays(-40), UpdatedAt = now };
            former.Password = hasher.HashPassword(former, sharedPassword);
            db.Users.Add(former);
            await db.SaveChangesAsync();
        }
        var membership = await db.OrganizationMemberships.SingleOrDefaultAsync(x =>
            x.UserId == former.Id && x.OrganizationId == kidsfit.Id);
        if (membership is null)
        {
            membership = new OrganizationMembership {
                OrganizationId = kidsfit.Id, UserId = former.Id, ManagerUserId = manager.Id,
                MembershipType = "SALES", IsPrimary = true, Status = "INACTIVE",
                CreatedAt = now.AddDays(-40), UpdatedAt = now };
            db.OrganizationMemberships.Add(membership);
            await db.SaveChangesAsync();
        }
        if (!await db.SchoolHandovers.AnyAsync(x => x.IdempotencyKey == "review-departure-SCH0010"))
            db.SchoolHandovers.Add(new SchoolHandover {
                MembershipId = membership.Id, OrganizationId = kidsfit.Id,
                UserId = former.Id, CompletedByUserId = admin.Id,
                Reason = fixture.Departure.Reason,
                Summary = "Đã ghi nhận nghỉ việc và giải phóng trường chưa ký SCH0010 để phân bổ lại.",
                RevokedRegistrations = 0, AccountSuspended = true,
                IdempotencyKey = "review-departure-SCH0010",
                RequestFingerprint = Fingerprint("review-departure-SCH0010"),
                CreatedAt = now.AddDays(-7), UpdatedAt = now });
        await db.SaveChangesAsync();
    }
}

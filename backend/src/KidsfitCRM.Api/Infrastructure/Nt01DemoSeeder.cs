using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>
/// Opt-in NT-01 UI scenarios. Requires a dedicated disposable review-fixture database;
/// never edits school contracts created by Sales or the KC-01/KC-02 review cases.
/// </summary>
internal static class Nt01DemoSeeder
{
    private sealed record Scenario(string Code, string Name, int? ServiceOffsetDays,
        int? ProtectionOffsetDays, bool Partner, bool Gap = false, bool Renewed = false);

    private static readonly Scenario[] Cases =
    [
        new("NT01-01", "Mầm Non Cánh Diều - Hết hạn sau 30 ngày (Demo)", 30, null, false),
        new("NT01-02", "Mầm Non Tuổi Thơ - Hết hạn sau 15 ngày (Demo)", 15, null, true),
        new("NT01-03", "Mầm Non Bình Minh - Hết hạn sau 7 ngày (Demo)", 7, null, false),
        new("NT01-04", "Mầm Non Hồng Nhung - Hết hạn hôm nay (Demo)", 0, null, true),
        new("NT01-05", "Mầm Non Trăng Non - Quá hạn 30 ngày (Demo)", -30, null, false),
        new("NT01-06", "Mầm Non Vườn Mơ - Tái ký có gián đoạn (Demo)", 29, null, false, Gap: true),
        new("NT01-07", "Mầm Non Thảo Nguyên - Bảo vệ còn 30 ngày (Demo)", null, 30, false),
        new("NT01-08", "Mầm Non Mặt Trời - Bảo vệ còn 7 ngày (Demo)", null, 7, true),
        new("NT01-09", "Mầm Non Sao Bắc - Bảo vệ hết hôm nay (Demo)", null, 0, false),
        new("NT01-10", "Mầm Non Hoa Cúc - Đã tái ký liên tục (Demo)", 30, null, true, Renewed: true)
    ];

    public static async Task SeedAsync(KidsfitDbContext db, DateTime now, CancellationToken ct = default)
    {
        var today = ContractExpiryAlertService.BusinessDate(now);
        var kidsfit = await db.Organizations.SingleAsync(x => x.Code == "KIDSFIT", ct);
        var partner = await db.Organizations.SingleAsync(x => x.Code == "PARTNER_AN_PHAT", ct);
        var sales = await db.Users.SingleAsync(x => x.Code == "SALES001", ct);
        var ctv = await db.Users.SingleAsync(x => x.Code == "CTV001", ct);
        var care = await db.Users.SingleAsync(x => x.Code == "CARE001", ct);
        var manager = await db.Users.SingleAsync(x => x.Code == "MANAGER001", ct);
        var partnerManager = await db.Users.SingleAsync(x => x.Code == "PARTNER001", ct);

        foreach (var scenario in Cases)
        {
            var contractCode = "NT01-DEMO-" + scenario.Code;
            // Reruns do not overwrite a modified UI fixture, signed period, or renewal.
            if (await db.SalesContracts.AnyAsync(x => x.ContractCode == contractCode, ct)) continue;
            var owner = scenario.Partner ? ctv : sales;
            var ownerOrg = scenario.Partner ? partner : kidsfit;
            var reviewer = scenario.Partner ? partnerManager : manager;
            var customerCode = "REV-SCH-" + scenario.Code;
            // Do not take over an existing CRM customer or another tenant's data.
            if (await db.ChannelCustomers.AnyAsync(x => x.Code == customerCode, ct))
                throw new InvalidOperationException("NT-01 fixture identity already exists without matching contract: " + customerCode);

            var protectionEnd = scenario.ProtectionOffsetDays.HasValue
                ? today.AddDays(scenario.ProtectionOffsetDays.Value)
                : today.AddYears(5).AddDays(-60);
            var verifiedDay = protectionEnd.AddYears(-5);
            var signedDay = verifiedDay.AddDays(-5);
            DateOnly serviceStart;
            DateOnly serviceEnd;
            if (scenario.ProtectionOffsetDays.HasValue)
            {
                serviceStart = verifiedDay;
                serviceEnd = serviceStart.AddYears(1).AddDays(-1);
            }
            else
            {
                serviceEnd = today.AddDays(scenario.ServiceOffsetDays!.Value);
                serviceStart = serviceEnd.AddYears(-1).AddDays(1);
                verifiedDay = serviceStart.AddDays(-5);
                signedDay = verifiedDay.AddDays(-5);
                protectionEnd = verifiedDay.AddYears(5);
            }

            var verifiedAt = verifiedDay.ToDateTime(new TimeOnly(1, 0), DateTimeKind.Utc);
            var protectionUntil = protectionEnd.ToDateTime(new TimeOnly(1, 0), DateTimeKind.Utc);
            var customer = new ChannelCustomer
            {
                Code = customerCode, DisplayName = "Trường " + scenario.Name,
                CustomerType = "ORGANIZATION", Source = "NT01_DEMO_ONLY",
                VerificationStatus = "VERIFIED", LifecycleStatus = "CONTRACTED",
                Province = "Thành phố Cần Thơ", Address = "Địa chỉ giả lập chỉ phục vụ demo",
                ContactName = "Liên hệ Demo", Email = scenario.Code.ToLowerInvariant() + "@example.test",
                OrganizationId = ownerOrg.Id, CreatedByUserId = owner.Id,
                CreatedAt = now, UpdatedAt = now
            };
            db.ChannelCustomers.Add(customer);
            await db.SaveChangesAsync(ct);
            var approach = new ApproachRegistration
            {
                CustomerId = customer.Id, OwnerUserId = owner.Id, OwnerOrganizationId = ownerOrg.Id,
                CreatedByUserId = owner.Id, Status = "CONVERTED",
                RegisteredAt = verifiedAt.AddDays(-14), ProtectedUntil = verifiedAt.AddDays(-9),
                Source = "NT01_DEMO_ONLY", IdempotencyKey = "nt01-demo-approach-" + scenario.Code,
                CreatedAt = now, UpdatedAt = now
            };
            db.ApproachRegistrations.Add(approach);
            await db.SaveChangesAsync(ct);
            var contract = new SalesContract
            {
                CustomerId = customer.Id, ApproachRegistrationId = approach.Id,
                OwnerUserId = owner.Id, OwnerOrganizationId = ownerOrg.Id,
                OwnerPersonnelType = scenario.Partner ? "COLLABORATOR" : "SALES",
                ReportedByUserId = owner.Id, ContractCode = contractCode,
                SignedOn = signedDay, ServiceStartOn = serviceStart, ServiceEndOn = serviceEnd,
                PaymentCycle = scenario.Partner ? "MONTHLY" : "YEARLY",
                ServicePlan = scenario.Partner ? "MONTHLY_9" : "SCHOOL_YEAR",
                StudentCount = 180, BranchCount = 0, SchoolUnitIdsJson = "[]",
                TotalValue = 9_000_000m, Status = "ACTIVE", RequiresSchoolVerification = true,
                ManagerReviewedAt = verifiedAt.AddDays(-1), ManagerReviewedByUserId = reviewer.Id,
                VerifiedAt = verifiedAt, ProtectionStartsAt = verifiedAt,
                ProtectionUntil = protectionUntil, CareUserId = care.Id,
                CareOrganizationId = kidsfit.Id,
                EvidenceReference = "Hợp đồng DEMO NT-01 - không phải tài liệu pháp lý",
                IdempotencyKey = "nt01-demo-contract-" + scenario.Code,
                CreatedAt = now, UpdatedAt = now
            };
            db.SalesContracts.Add(contract);
            await db.SaveChangesAsync(ct);
            db.CustomerProtections.Add(new CustomerProtection
            {
                ContractId = contract.Id, CustomerId = customer.Id,
                OwnerUserId = owner.Id, OwnerOrganizationId = ownerOrg.Id,
                SourceType = "CONTRACT", Status = "ACTIVE",
                EffectiveFrom = verifiedAt, EffectiveUntil = protectionUntil,
                CreatedAt = now, UpdatedAt = now
            });

            if (scenario.ProtectionOffsetDays.HasValue)
            {
                // Four contiguous confirmed years make the approaching five-year protection realistic.
                for (var i = 1; i <= 4; i++)
                    db.ContractRenewals.Add(new ContractRenewal
                    {
                        ContractId = contract.Id, RenewalNo = i, Status = "CONFIRMED",
                        SubmittedByUserId = owner.Id,
                        SignedOn = serviceStart.AddYears(i).AddDays(-7),
                        ServiceStartOn = serviceStart.AddYears(i),
                        ServiceEndOn = serviceStart.AddYears(i + 1).AddDays(-1),
                        PaymentCycle = contract.PaymentCycle!,
                        TotalValue = contract.TotalValue,
                        IdempotencyKey = $"nt01-demo-renewal-{scenario.Code}-{i}",
                        RequestFingerprint = "nt01-demo-only",
                        CreatedAt = now, UpdatedAt = now
                    });
            }
            if (scenario.Gap || scenario.Renewed)
            {
                var nextStart = serviceEnd.AddDays(scenario.Gap ? 21 : 1);
                db.ContractRenewals.Add(new ContractRenewal
                {
                    ContractId = contract.Id, RenewalNo = 1, Status = "CONFIRMED",
                    SubmittedByUserId = owner.Id, SignedOn = serviceEnd.AddDays(-14),
                    ServiceStartOn = nextStart, ServiceEndOn = nextStart.AddYears(1).AddDays(-1),
                    PaymentCycle = contract.PaymentCycle!, TotalValue = contract.TotalValue,
                    GapReason = scenario.Gap ? "Tạm gián đoạn 20 ngày để chuẩn bị triển khai (demo)" : null,
                    IdempotencyKey = "nt01-demo-renewal-" + scenario.Code,
                    RequestFingerprint = "nt01-demo-only",
                    CreatedAt = now, UpdatedAt = now
                });
            }
            await db.SaveChangesAsync(ct);
        }
        // Generate milestones immediately for the UI; hourly worker continues afterwards.
        await ContractExpiryAlertService.SweepAsync(db, now, ct);
    }
}

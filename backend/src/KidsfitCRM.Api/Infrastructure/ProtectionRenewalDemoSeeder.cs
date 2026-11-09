using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>Isolated demo-only SL-02 review scenarios, never touch customer/contract source data.</summary>
internal static class ProtectionRenewalDemoSeeder
{
    private sealed record Scenario(string Code, string Name, int ExpiryOffset,
        bool ConfirmedNextYear, bool Partner, bool PendingNextYear = false);

    private static readonly Scenario[] Examples =
    [
        new("SL02-A", "Trường Mầm Non Cánh Diều (Demo ưu tiên)", -1, false, false),
        new("SL02-B", "Trường Mầm Non Hoa Sen (Demo đã tái ký)", 7, true, false),
        new("SL02-C", "Trường Mầm Non Sao Mai (Demo đã hết ưu tiên)", -16, false, true),
        new("SL02-D", "Trường Mầm Non Tuổi Thơ (Demo chờ Kế toán)", 0, false, false, true),
        new("SL02-E", "Trường Mầm Non Bình Minh (Demo CTV tái ký)", 15, true, true)
    ];

    public static async Task SeedAsync(KidsfitDbContext db, DateTime now, CancellationToken ct = default)
    {
        var today = ProtectionRenewalPolicy.BusinessDay(now);
        var kidsfit = await db.Organizations.SingleAsync(x => x.Code == "KIDSFIT", ct);
        var partner = await db.Organizations.SingleAsync(x => x.Code == "PARTNER_AN_PHAT", ct);
        var sales = await db.Users.SingleAsync(x => x.Code == "SALES001", ct);
        var ctv = await db.Users.SingleAsync(x => x.Code == "CTV001", ct);
        var manager = await db.Users.SingleAsync(x => x.Code == "MANAGER001", ct);
        var partnerManager = await db.Users.SingleAsync(x => x.Code == "PARTNER001", ct);
        foreach (var example in Examples)
        {
            var contractCode = "SL02-DEMO-" + example.Code;
            if (await db.SalesContracts.AnyAsync(x => x.ContractCode == contractCode, ct)) continue;
            var owner = example.Partner ? ctv : sales;
            var org = example.Partner ? partner : kidsfit;
            var reviewer = example.Partner ? partnerManager : manager;
            var oldEndOn = today.AddDays(example.ExpiryOffset);
            // Original verification was five years ago; four confirmed annual renewals
            // preserve a continuous, realistic history up to the current fifth year.
            var started = oldEndOn.AddYears(-5);
            var originalServiceEnd = started.AddYears(1).AddDays(-1);
            var verifiedAt = started.ToDateTime(new TimeOnly(2, 0), DateTimeKind.Utc);
            var protectionEnd = oldEndOn.ToDateTime(new TimeOnly(2, 0), DateTimeKind.Utc);
            var customer = new ChannelCustomer
            {
                Code = "REV-SCH-" + example.Code, DisplayName = example.Name,
                CustomerType = "ORGANIZATION", Source = "SL02_DEMO_ONLY",
                VerificationStatus = "VERIFIED", LifecycleStatus = "CONTRACTED",
                Province = "Thành phố Cần Thơ", Address = "Địa chỉ giả lập; không phải dữ liệu trường thật",
                ContactName = "Người liên hệ Demo", Email = example.Code.ToLowerInvariant() + "@example.test",
                OrganizationId = org.Id, CreatedByUserId = owner.Id, CreatedAt = now, UpdatedAt = now
            };
            db.ChannelCustomers.Add(customer);
            await db.SaveChangesAsync(ct);
            var approach = new ApproachRegistration
            {
                CustomerId = customer.Id, OwnerUserId = owner.Id,
                OwnerOrganizationId = org.Id, CreatedByUserId = owner.Id,
                Status = "CONVERTED", RegisteredAt = verifiedAt.AddDays(-15),
                ProtectedUntil = verifiedAt.AddDays(-10),
                Source = "SL02_DEMO_ONLY", IdempotencyKey = "sl02-demo-approach-" + example.Code,
                CreatedAt = now, UpdatedAt = now
            };
            db.ApproachRegistrations.Add(approach);
            await db.SaveChangesAsync(ct);
            var contract = new SalesContract
            {
                CustomerId = customer.Id, ApproachRegistrationId = approach.Id,
                OwnerUserId = owner.Id, OwnerOrganizationId = org.Id,
                OwnerPersonnelType = example.Partner ? "COLLABORATOR" : "SALES",
                ReportedByUserId = owner.Id, ContractCode = contractCode,
                SignedOn = started, ServiceStartOn = started, ServiceEndOn = originalServiceEnd,
                PaymentCycle = example.Partner ? "MONTHLY" : "YEARLY",
                ServicePlan = "SCHOOL_YEAR", TotalValue = 8_500_000m, Currency = "VND",
                Status = "ACTIVE", StudentCount = 180, RequiresSchoolVerification = true,
                SchoolUnitIdsJson = "[]",
                VerifiedAt = verifiedAt, ProtectionStartsAt = verifiedAt,
                ProtectionUntil = protectionEnd,
                ManagerReviewedAt = verifiedAt.AddDays(-1), ManagerReviewedByUserId = reviewer.Id,
                EvidenceReference = "SL-02 DEMO: tài liệu hư cấu, không có giá trị pháp lý",
                IdempotencyKey = "sl02-demo-contract-" + example.Code,
                CreatedAt = now, UpdatedAt = now
            };
            db.SalesContracts.Add(contract);
            await db.SaveChangesAsync(ct);
            db.CustomerProtections.Add(new CustomerProtection
            {
                ContractId = contract.Id, CustomerId = customer.Id,
                OwnerUserId = owner.Id, OwnerOrganizationId = org.Id,
                SourceType = "CONTRACT", Status = "ACTIVE",
                EffectiveFrom = verifiedAt, EffectiveUntil = protectionEnd,
                CreatedAt = now, UpdatedAt = now
            });
            for (var year = 1; year <= 4; year++)
            {
                var start = started.AddYears(year);
                db.ContractRenewals.Add(new ContractRenewal
                {
                    ContractId = contract.Id, RenewalNo = year,
                    SubmittedByUserId = owner.Id, SignedOn = start.AddDays(-7),
                    ServiceStartOn = start, ServiceEndOn = start.AddYears(1).AddDays(-1),
                    PaymentCycle = contract.PaymentCycle!, TotalValue = contract.TotalValue,
                    Status = "CONFIRMED", IdempotencyKey = $"sl02-demo-renewal-{example.Code}-{year}",
                    RequestFingerprint = "SL02_DEMO", CreatedAt = now, UpdatedAt = now
                });
            }
            if (example.ConfirmedNextYear || example.PendingNextYear)
            {
                var start = started.AddYears(5);
                db.ContractRenewals.Add(new ContractRenewal
                {
                    ContractId = contract.Id, RenewalNo = 5,
                    SubmittedByUserId = owner.Id, SignedOn = start.AddDays(-7),
                    ServiceStartOn = start, ServiceEndOn = start.AddYears(1).AddDays(-1),
                    PaymentCycle = contract.PaymentCycle!, TotalValue = contract.TotalValue,
                    Status = example.ConfirmedNextYear ? "CONFIRMED" : "PENDING_ACCOUNTING",
                    IdempotencyKey = $"sl02-demo-renewal-{example.Code}-5",
                    RequestFingerprint = "SL02_DEMO", CreatedAt = now, UpdatedAt = now
                });
            }
            await db.SaveChangesAsync(ct);
        }
        await ProtectionRenewalPolicy.SweepAsync(db, now, ct);
    }
}

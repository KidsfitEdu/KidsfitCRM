using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>
/// Isolated, opt-in GI-01 scenarios. Only for disposable review DBs; never Production.
/// Reuses the fictional SCH0007..0009 schools so the canonical review import remains intact.
/// </summary>
internal static class ServiceInterruptionDemoSeeder
{
    public static async Task SeedAsync(KidsfitDbContext db, DateTime now)
    {
        var today = ContractExpiryAlertService.BusinessDate(now);
        var examples = new[]
        {
            new { School = "SCH0007", Sales = "SALES001", Threshold = today,
                Pending = false, FutureConfirmed = true },
            new { School = "SCH0008", Sales = "CTV001", Threshold = today,
                Pending = true, FutureConfirmed = false },
            new { School = "SCH0009", Sales = "SALES001", Threshold = today.AddDays(15),
                Pending = false, FutureConfirmed = false },
            new { School = "SCH0010", Sales = "SALES001", Threshold = today,
                Pending = false, FutureConfirmed = false }
        };
        foreach (var example in examples)
        {
            var contractCode = "GI01-DEMO-" + example.School;
            if (await db.SalesContracts.AnyAsync(c => c.ContractCode == contractCode)) continue;
            var school = await db.DirectorySchools.SingleAsync(s => s.SchoolCode == example.School && !s.IsDeleted);
            var customer = await db.ChannelCustomers.SingleAsync(c => c.Id == school.CustomerId);
            if (await db.SalesContracts.AnyAsync(c => c.CustomerId == customer.Id && c.Status == "ACTIVE"))
                throw new InvalidOperationException("GI-01 demo refuses a customer that already owns an active contract.");
            var sales = await db.Users.SingleAsync(x => x.Code == example.Sales && x.Status == "ACTIVE");
            var organizationId = await db.OrganizationMemberships.Where(m =>
                m.UserId == sales.Id && m.Status == "ACTIVE" && m.IsPrimary)
                .Select(m => m.OrganizationId).SingleAsync();
            var gapStart = example.Threshold.AddMonths(-12);
            var serviceEnd = gapStart.AddDays(-1);
            var serviceStart = serviceEnd.AddYears(-1).AddDays(1);
            var verifiedAt = serviceStart.AddDays(-7).ToDateTime(new TimeOnly(2,0), DateTimeKind.Utc);
            var approach = await db.ApproachRegistrations.Where(a =>
                a.CustomerId == customer.Id && a.OwnerUserId == sales.Id)
                .OrderByDescending(a => a.RegisteredAt).FirstOrDefaultAsync();
            if (approach is null)
            {
                approach = new ApproachRegistration
                {
                    CustomerId = customer.Id, OwnerUserId = sales.Id, OwnerOrganizationId = organizationId,
                    CreatedByUserId = sales.Id, Status = "CONVERTED",
                    RegisteredAt = verifiedAt.AddDays(-6), ProtectedUntil = verifiedAt,
                    IdempotencyKey = "gi01-approach-" + example.School, Source = "GI01_DEMO",
                    CreatedAt = verifiedAt.AddDays(-6), UpdatedAt = now
                };
                db.ApproachRegistrations.Add(approach);
                await db.SaveChangesAsync();
            }
            approach.Status = "CONVERTED"; approach.UpdatedAt = now;
            var oldApproaches = await db.CustomerProtections.Where(p => p.CustomerId == customer.Id
                && p.SourceType == "APPROACH" && p.Status == "ACTIVE").ToArrayAsync();
            foreach (var p in oldApproaches) { p.Status = "CONVERTED"; p.UpdatedAt = now; }
            var contract = new SalesContract
            {
                CustomerId = customer.Id, ApproachRegistrationId = approach.Id,
                OwnerUserId = sales.Id, OwnerOrganizationId = organizationId,
                ReportedByUserId = sales.Id, OwnerPersonnelType = example.Sales == "CTV001" ? "COLLABORATOR" : "SALES",
                ContractCode = contractCode, SignedOn = serviceStart.AddDays(-8),
                ServiceStartOn = serviceStart, ServiceEndOn = serviceEnd,
                PaymentCycle = "YEARLY", TotalValue = 12000000m,
                Status = "ACTIVE", RequiresSchoolVerification = true, VerifiedAt = verifiedAt,
                ProtectionStartsAt = verifiedAt, ProtectionUntil = verifiedAt.AddYears(5),
                IdempotencyKey = "gi01-contract-" + example.School,
                EvidenceReference = "DEMO ONLY - synthetic service term; no real agreement",
                CreatedAt = verifiedAt, UpdatedAt = now
            };
            db.SalesContracts.Add(contract);
            await db.SaveChangesAsync();
            db.CustomerProtections.Add(new CustomerProtection
            {
                ContractId = contract.Id, CustomerId = customer.Id,
                OwnerUserId = sales.Id, OwnerOrganizationId = organizationId,
                SourceType = "CONTRACT", Status = "ACTIVE",
                EffectiveFrom = verifiedAt, EffectiveUntil = verifiedAt.AddYears(5),
                CreatedAt = verifiedAt, UpdatedAt = now
            });
            customer.LifecycleStatus = "CONTRACTED";
            if (example.Pending || example.FutureConfirmed)
            {
                var renewedStart = today.AddDays(example.Pending ? 7 : 20);
                var status = example.Pending ? "PENDING_ACCOUNTING" : "CONFIRMED";
                db.ContractRenewals.Add(new ContractRenewal
                {
                    ContractId = contract.Id, RenewalNo = 1,
                    IdempotencyKey = "gi01-renewal-" + example.School,
                    RequestFingerprint = new string('0',64),
                    SubmittedByUserId = sales.Id,
                    SignedOn = today.AddDays(-2), ServiceStartOn = renewedStart,
                    ServiceEndOn = renewedStart.AddYears(1).AddDays(-1),
                    PaymentCycle = "YEARLY", TotalValue = 12000000m,
                    GapReason = "GI-01 demo: trường tạm ngưng sử dụng phần mềm",
                    Status = status, SubmittedAt = now.AddDays(-2),
                    ReviewedAt = example.FutureConfirmed ? now.AddDays(-1) : null,
                    CreatedAt = now.AddDays(-2), UpdatedAt = now
                });
            }
            await db.SaveChangesAsync();
        }
    }
}

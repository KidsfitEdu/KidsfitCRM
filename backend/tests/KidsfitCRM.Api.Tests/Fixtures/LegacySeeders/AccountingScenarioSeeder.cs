using System.Security.Cryptography;
using System.Text.Json;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>
/// Optional, idempotent accounting fixtures for a verified disposable database only.
/// Run using Seed:AccountingScenarios=true in addition to the existing demo seed guards.
/// Never changes existing non-DEMO-ACC financial history.
/// </summary>
public static class AccountingScenarioSeeder
{
    public static async Task SeedAsync(KidsfitDbContext db, DateTime now)
    {
        var kidsfit = await db.Organizations.SingleAsync(x => x.Code == "KIDSFIT");
        var partner = await db.Organizations.SingleAsync(x => x.Code == "PARTNER_AN_PHAT");
        var checkee = await db.Organizations.SingleAsync(x => x.Code == "CHECKEE");
        var sales = await db.Users.SingleAsync(x => x.Email == "sales@kidsfit.vn");
        var ctv = await db.Users.SingleAsync(x => x.Email == "ctv@kidsfit.vn");
        var accountant = await db.Users.SingleAsync(x => x.Email == "accountant@kidsfit.vn");
        var manager = await db.Users.SingleAsync(x => x.Email == "manager@kidsfit.vn");
        var proofBytes = Convert.FromBase64String(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0d8AAAAASUVORK5CYII=");
        var sha = Convert.ToHexString(SHA256.HashData(proofBytes));
        // The sample image is a clearly labelled synthetic placeholder, never a real bank receipt.
        foreach (var scenario in new[]
        {
            new {Code = "DEMO-ACC-SALES", School = "Trường Mầm Non Hoa Sen (Demo)",
                Owner = sales, Org = kidsfit,
                Type = "SALES", Plan = "SCHOOL_YEAR", Total = 30_000_000m, Schedules = 3,
                ActualReceipts = 1, Branches = 2, Transfer = false},
            new {Code = "DEMO-ACC-CTV", School = "Trường Mầm Non Sao Mai (Demo)",
                Owner = ctv, Org = partner,
                Type = "COLLABORATOR", Plan = "MONTHLY_9", Total = 45_000_000m, Schedules = 1,
                ActualReceipts = 1, Branches = 3, Transfer = true},
        })
        {
            var customerCode = "CUS-" + scenario.Code;
            if (await db.ChannelCustomers.AnyAsync(x => x.Code == customerCode)) continue;
            await using var tx = await db.Database.BeginTransactionAsync();
            var customer = new ChannelCustomer
            {
                Code = customerCode,
                DisplayName = scenario.School,
                CustomerType = "ORGANIZATION",
                LifecycleStatus = "CONTRACTED",
                VerificationStatus = "VERIFIED",
                CreatedByUserId = scenario.Owner.Id,
                OrganizationId = scenario.Org.Id,
                Source = "DEMO_ACCOUNTING_SCENARIOS",
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.ChannelCustomers.Add(customer);
            await db.SaveChangesAsync();

            var registration = new ApproachRegistration
            {
                CustomerId = customer.Id, OwnerUserId = scenario.Owner.Id,
                OwnerOrganizationId = scenario.Org.Id, CreatedByUserId = scenario.Owner.Id,
                Status = "CONVERTED", RegisteredAt = now.AddDays(-25), ProtectedUntil = now.AddDays(-20),
                Source = "DEMO", IdempotencyKey = "approach-" + scenario.Code, CreatedAt = now.AddDays(-25), UpdatedAt = now,
            };
            db.ApproachRegistrations.Add(registration);
            var school = new DirectorySchool { CustomerId = customer.Id, SchoolCode = scenario.Code, CreatedAt = now, UpdatedAt = now };
            db.DirectorySchools.Add(school);
            await db.SaveChangesAsync();

            var branchIds = new List<long>();
            for (int j = 0; j <= scenario.Branches; j++)
            {
                var unitName = j == 0 ? scenario.School : "Trường điểm " + j + " - " + scenario.School;
                var unit = new SchoolUnit
                {
                    DirectorySchoolId = school.Id, UnitType = j == 0 ? "MAIN" : "BRANCH",
                    Name = unitName, Version = 1, Province = "TP. Hồ Chí Minh", Ward = "Demo",
                    SourceRow = j+1, ContentHash = Convert.ToHexString(SHA256.HashData(
                        System.Text.Encoding.UTF8.GetBytes(scenario.Code + ":" + j))),
                    CreatedAt = now, UpdatedAt = now,
                };
                db.SchoolUnits.Add(unit);
                await db.SaveChangesAsync();
                if (j > 0) branchIds.Add(unit.Id);
            }

            var protectionStart = now.AddDays(-20);
            var signedOn = DateOnly.FromDateTime(protectionStart);
            var contract = new SalesContract
            {
                CustomerId = customer.Id, ApproachRegistrationId = registration.Id,
                OwnerUserId = scenario.Owner.Id, OwnerOrganizationId = scenario.Org.Id,
                OwnerPersonnelType = scenario.Type,
                ReportedByUserId = scenario.Owner.Id,
                ContractCode = "HĐ-" + scenario.Code,
                SignedOn = signedOn, TotalValue = scenario.Total,
                ServicePlan = scenario.Plan, StudentCount = scenario.Branches > 2 ? 1500 : 450,
                SchoolUnitIdsJson = JsonSerializer.Serialize(branchIds),
                Status = "ACTIVE", RequiresSchoolVerification = true,
                ManagerReviewedByUserId = manager.Id, ManagerReviewedAt = now.AddDays(-19),
                VerifiedAt = now.AddDays(-18), ProtectionStartsAt = protectionStart,
                ProtectionUntil = protectionStart.AddYears(5),
                EvidenceReference = "DEMO: hợp đồng đã ký (ảnh minh họa, không có giá trị pháp lý)",
                IdempotencyKey = "contract-" + scenario.Code, CreatedAt = now.AddDays(-20), UpdatedAt = now,
            };
            db.SalesContracts.Add(contract);
            await db.SaveChangesAsync();
            db.SalesContractItems.Add(new SalesContractItem
            {
                ContractId = contract.Id,
                Description = "Gói KIDSFIT demo theo hợp đồng đã ký",
                Quantity = 1, UnitPrice = scenario.Total, Amount = scenario.Total,
                CreatedAt = now, UpdatedAt = now,
            });
            db.CustomerProtections.Add(new CustomerProtection
            {
                CustomerId = customer.Id, OwnerUserId = scenario.Owner.Id,
                OwnerOrganizationId = scenario.Org.Id, ContractId = contract.Id,
                SourceType = "CONTRACT", Status = "ACTIVE",
                EffectiveFrom = protectionStart, EffectiveUntil = protectionStart.AddYears(5),
                CreatedAt = now, UpdatedAt = now,
            });
            db.ReconciliationCases.Add(new ReconciliationCase
            {
                CustomerId = customer.Id, ContractId = contract.Id,
                CheckeeOrganizationId = checkee.Id, Status = "CONFIRMED",
                OpenedAt = now.AddDays(-20), ResolvedAt = now.AddDays(-18),
                CreatedAt = now, UpdatedAt = now,
            });
            db.FinancialEvidences.Add(new FinancialEvidence
            {
                Kind = "CONTRACT", ContractId = contract.Id,
                UploadedByUserId = scenario.Owner.Id,
                FileName = "DEMO-khong-phai-hop-dong-that.png",
                MimeType = "image/png", Sha256 = sha, Bytes = proofBytes,
                AttachedAt = now, CreatedAt = now, UpdatedAt = now,
            });

            var schedules = new List<RevenueSchedule>();
            for (var j = 0; j < scenario.Schedules; j++)
            {
                var amount = scenario.Total / scenario.Schedules;
                var schedule = new RevenueSchedule
                {
                    ContractId = contract.Id, AmountDue = amount,
                    AmountReceived = j < scenario.ActualReceipts ? amount : 0,
                    DueOn = signedOn.AddDays(30 + 90*j),
                    Status = j < scenario.ActualReceipts ? "PAID" : "PENDING",
                    CreatedAt = now, UpdatedAt = now,
                };
                db.RevenueSchedules.Add(schedule);
                schedules.Add(schedule);
            }
            await db.SaveChangesAsync();
            var entries = new List<CommissionLedgerEntry>();
            for (var j = 0; j < scenario.ActualReceipts; j++)
            {
                var amount = schedules[j].AmountReceived;
                var receipt = new RevenueReceipt
                {
                    ContractId = contract.Id, RevenueScheduleId = schedules[j].Id,
                    Amount = amount, ReceivedAt = now.AddDays(-10 + j),
                    ReferenceCode = "RC-" + scenario.Code + "-" + (j+1),
                    PaymentMethod = "BANK_TRANSFER", Status = "COMPLETED",
                    IdempotencyKey = "receipt-" + scenario.Code + "-" + j,
                    RecordedByUserId = accountant.Id, CreatedAt = now, UpdatedAt = now,
                };
                db.RevenueReceipts.Add(receipt);
                await db.SaveChangesAsync();
                db.FinancialEvidences.Add(new FinancialEvidence
                {
                    Kind = "RECEIPT", ContractId = contract.Id,
                    RevenueReceiptId = receipt.Id, UploadedByUserId = accountant.Id,
                    FileName = "DEMO-bien-lai-thu-khong-co-gia-tri.png",
                    MimeType = "image/png", Sha256 = sha, Bytes = proofBytes,
                    AttachedAt = now, CreatedAt = now, UpdatedAt = now,
                });
                var entry = new CommissionLedgerEntry
                {
                    ContractId = contract.Id, RevenueReceiptId = receipt.Id,
                    BoardPolicyVersionId = null, PolicySource = "SYSTEM_DEFAULT", BeneficiaryRole = "SALES",
                    BeneficiaryUserId = scenario.Owner.Id,
                    BeneficiaryOrganizationId = scenario.Org.Id,
                    EntryType = "ACCRUAL", CalculationBase = amount,
                    RatePercent = 25m, Amount = decimal.Round(amount * 0.25m, 0, MidpointRounding.AwayFromZero),
                    Status = "ACCRUED", Period = now.ToString("yyyy-MM"),
                    OccurredAt = now.AddDays(-10+j), CreatedByUserId = accountant.Id,
                    CreatedAt = now, UpdatedAt = now,
                };
                db.CommissionLedgerEntries.Add(entry);
                entries.Add(entry);
                var managerId = await db.OrganizationMemberships.AsNoTracking()
                    .Where(x => x.OrganizationId == scenario.Org.Id && x.UserId == scenario.Owner.Id)
                    .Select(x => x.ManagerUserId).FirstOrDefaultAsync();
                if (managerId.HasValue && await db.OrganizationMemberships.AnyAsync(m =>
                    m.OrganizationId == scenario.Org.Id && m.UserId == managerId.Value && m.Status == "ACTIVE"))
                    db.CommissionLedgerEntries.Add(new CommissionLedgerEntry {
                        ContractId=contract.Id, RevenueReceiptId=receipt.Id,
                        PolicySource="SYSTEM_DEFAULT", BeneficiaryRole="MANAGER",
                        BeneficiaryUserId=managerId.Value, BeneficiaryOrganizationId=scenario.Org.Id,
                        EntryType="ACCRUAL", CalculationBase=amount, RatePercent=5m,
                        Amount=decimal.Round(amount * 0.05m, 0, MidpointRounding.AwayFromZero),
                        Status="ACCRUED", Period=now.ToString("yyyy-MM"),
                        OccurredAt=now.AddDays(-10+j), CreatedByUserId=accountant.Id,
                        CreatedAt=now, UpdatedAt=now
                    });
            }
            await db.SaveChangesAsync();
            if (scenario.Transfer)
            {
                var due = entries.Sum(x => x.Amount);
                var payout = new Payout
                {
                    OrganizationId = scenario.Org.Id,
                    BeneficiaryUserId = scenario.Owner.Id,
                    Code = "PO-" + scenario.Code, Period = now.ToString("yyyy-MM"),
                    GrossAmount = due, NetAmount = due, WithholdingAmount = 0,
                    Status = "PAID", PaidAt = now.AddDays(-2),
                    ApprovedAt = now.AddDays(-3), ApprovedByUserId = manager.Id,
                    PaidByUserId = accountant.Id,
                    PaymentReference = "DEMO-TRANSFER-" + scenario.Code,
                    CreatedByUserId = accountant.Id, CreatedAt = now, UpdatedAt = now,
                };
                db.Payouts.Add(payout);
                await db.SaveChangesAsync();
                db.PayoutItems.AddRange(entries.Select(x => new PayoutItem
                {
                    PayoutId = payout.Id, CommissionLedgerEntryId = x.Id, Amount = x.Amount,
                    CreatedAt = now, UpdatedAt = now,
                }));
                db.FinancialEvidences.Add(new FinancialEvidence
                {
                    Kind = "PAYOUT", ContractId = contract.Id, PayoutId = payout.Id,
                    UploadedByUserId = accountant.Id,
                    FileName = "DEMO-chuyen-hoa-hong-khong-co-gia-tri.png",
                    MimeType = "image/png", Sha256 = sha, Bytes = proofBytes,
                    AttachedAt = now, CreatedAt = now, UpdatedAt = now,
                });
            }
            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }
    }
}

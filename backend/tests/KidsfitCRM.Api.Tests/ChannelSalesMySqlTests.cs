using System.Data;
using System.Text.RegularExpressions;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Features;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using MySql.Data.MySqlClient;

namespace KidsfitCRM.Api.Tests;

public sealed class MySqlFactAttribute : FactAttribute
{
    public MySqlFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("KIDSFIT_TEST_MYSQL_ADMIN")))
            Skip = "Set KIDSFIT_TEST_MYSQL_ADMIN to run isolated MySQL 8.4 integration tests.";
    }
}

public sealed class ChannelMySqlFixture : IAsyncLifetime
{
    private string? adminConnection;
    private readonly string databaseName = "kidsfit_it_" + Guid.NewGuid().ToString("N");
    public string ConnectionString { get; private set; } = "";
    public KidsfitDbContext Open() => new(new DbContextOptionsBuilder<KidsfitDbContext>().UseMySQL(ConnectionString).Options);

    public async Task InitializeAsync()
    {
        adminConnection = Environment.GetEnvironmentVariable("KIDSFIT_TEST_MYSQL_ADMIN");
        if (string.IsNullOrWhiteSpace(adminConnection)) return;
        var builder = new MySqlConnectionStringBuilder(adminConnection) { Database = "mysql" };
        await using var connection = new MySqlConnection(builder.ConnectionString);
        await connection.OpenAsync();
        var version = Convert.ToString(await new MySqlCommand("SELECT VERSION()", connection).ExecuteScalarAsync());
        Assert.StartsWith("8.4.", version);
        await new MySqlCommand($"CREATE DATABASE `{databaseName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci", connection).ExecuteNonQueryAsync();
        builder.Database = databaseName;
        ConnectionString = builder.ConnectionString;
        var services = new ServiceCollection();
        services.AddDbContext<KidsfitDbContext>(options => options.UseMySQL(ConnectionString));
        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["Seed:DemoPassword"] = "EphemeralTestOnly-CRM-Password!",
                ["Seed:DisposableDatabase"] = "true"
            }).Build());
        await using var provider = services.BuildServiceProvider();
        await using var scope = provider.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<KidsfitDbContext>().Database.MigrateAsync();
        await DatabaseSeeder.SeedAsync(scope.ServiceProvider);
        // Seed never activates a provisional business commission policy on real demo data.
        var testDb = scope.ServiceProvider.GetRequiredService<KidsfitDbContext>();
        Assert.All(await testDb.CommissionPolicyVersions.AsNoTracking().ToListAsync(),
            policy => { Assert.Equal("DRAFT", policy.Status); Assert.Equal(0m, policy.RatePercent); });
        // Legacy integration expectations use an explicitly local TEST policy; production seed stays DRAFT.
        await testDb.Organizations.Where(x => x.Code == "KIDSFIT").ExecuteUpdateAsync(x => x.SetProperty(o => o.CommissionRateCeiling, 20m));
        await testDb.Organizations.Where(x => x.Code == "PARTNER_AN_PHAT").ExecuteUpdateAsync(x => x.SetProperty(o => o.CommissionRateCeiling, 15m));
        await testDb.CommissionPolicyVersions.Where(x => x.Code == "KIDSFIT-2026-V1")
            .ExecuteUpdateAsync(x => x.SetProperty(p => p.RatePercent, 10m).SetProperty(p => p.Status, "ACTIVE"));
        await testDb.CommissionPolicyVersions.Where(x => x.Code == "PARTNER-2026-V1")
            .ExecuteUpdateAsync(x => x.SetProperty(p => p.RatePercent, 12m).SetProperty(p => p.Status, "ACTIVE"));
        // A second run verifies additive seed behavior on a populated database.
        await DatabaseSeeder.SeedAsync(scope.ServiceProvider);
    }

    public async Task DisposeAsync()
    {
        if (string.IsNullOrWhiteSpace(adminConnection) || ConnectionString == "") return;
        if (!Regex.IsMatch(databaseName, "^kidsfit_it_[a-f0-9]{32}$")) throw new InvalidOperationException("Unexpected test database name.");
        var builder = new MySqlConnectionStringBuilder(adminConnection) { Database = "mysql" };
        // Each fixture owns a distinct database/pool. Clearing every pool can interrupt
        // another concurrently running fixture and strand its asynchronous command.
        await using var ownedPool = new MySqlConnection(ConnectionString);
        MySqlConnection.ClearPool(ownedPool);
        await using var connection = new MySqlConnection(builder.ConnectionString);
        await connection.OpenAsync();
        await new MySqlCommand($"DROP DATABASE `{databaseName}`", connection).ExecuteNonQueryAsync();
    }
}

[CollectionDefinition("MySQLIntegration", DisableParallelization = true)]
public sealed class MySqlIntegrationCollection;

// Serialize create/migrate/drop fixture lifecycles on the local server.
// Race-condition tests still run their competing actions with Task.WhenAll.
[Collection("MySQLIntegration")]
public sealed class ChannelSalesMySqlTests(ChannelMySqlFixture fixture) : IClassFixture<ChannelMySqlFixture>
{
    private static readonly CancellationToken Ct = CancellationToken.None;
    private static HttpContext Http() => new DefaultHttpContext();
    private static string Key() => Guid.NewGuid().ToString("N");
    private static RegisterApproachRequest Approach(string? key = null) => new(
        IdempotencyKey: key ?? Key(), CustomerId: null, CustomerType: "ORGANIZATION", DisplayName: "Đơn vị thử nghiệm có dấu Đặng Ánh",
        LegalName: null, TaxCode: "T" + Key()[..15], Phone: null, Email: null, Website: null, Province: null,
        District: null, Address: null, ContactName: null, ContactPosition: null, Source: "TEST", Note: null);

    private async Task<long> Seller()
    {
        await using var db = fixture.Open();
        var organizationId = await db.Organizations.Where(x => x.Code == "KIDSFIT").Select(x => x.Id).SingleAsync();
        var roleId = await db.Roles.Where(x => x.Code == "SALES").Select(x => x.Id).SingleAsync();
        var key = Key();
        var user = new User { Code = key[..20], Name = "Nhân sự kiểm thử", Email = key + "@example.test", Status = "ACTIVE", Password = "unused-test-hash", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId });
        db.OrganizationMemberships.Add(new OrganizationMembership { UserId = user.Id, OrganizationId = organizationId, MembershipType = "SALES", IsPrimary = true, Status = "ACTIVE", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();
        return user.Id;
    }

    private async Task<long> UserId(string email)
    {
        await using var db = fixture.Open();
        return await db.Users.Where(x => x.Email == email).Select(x => x.Id).SingleAsync();
    }

    private async Task<(long RegistrationId, long ContractId)> Contract(long sellerId)
    {
        await using var db = fixture.Open();
        var actions = new ChannelSalesActions(db);
        var registrationId = await actions.RegisterCustomerApproach(Approach(), sellerId, Http(), Ct);
        var packageId = await db.CheckeeProductPackages.Select(x => x.Id).FirstAsync();
        var request = new ReportSalesContractRequest(Key(), "CT-" + Key(), ChannelSalesValidation.BusinessDate(DateTime.UtcNow), null, packageId, 1_000_000m, null, "TEST-EVIDENCE");
        var contractId = await actions.ReportSignedContract(registrationId, request, sellerId, Http(), Ct);
        Assert.Equal(contractId, await actions.ReportSignedContract(registrationId, request, sellerId, Http(), Ct));
        return (registrationId, contractId);
    }

    [MySqlFact]
    public async Task Sales_protection_periods_show_confirmed_and_pending_with_owned_files_only()
    {
        var seller = await Seller();
        var otherSeller = await Seller();
        var (_, contractId) = await Contract(seller);
        await using var db = fixture.Open();
        var contract = await db.SalesContracts.SingleAsync(x => x.Id == contractId, Ct);
        contract.RequiresSchoolVerification = true;
        contract.Status = "ACTIVE";
        contract.VerifiedAt = DateTime.UtcNow;
        contract.ServiceStartOn = new DateOnly(2026, 1, 1);
        contract.ServiceEndOn = new DateOnly(2026, 12, 31);
        contract.PaymentCycle = "YEARLY";
        var renewal = new ContractRenewal {
            ContractId = contractId, RenewalNo = 1, SubmittedByUserId = seller,
            IdempotencyKey = Key(), RequestFingerprint = Key(), SignedOn = new DateOnly(2026, 12, 15),
            ServiceStartOn = new DateOnly(2027, 1, 1), ServiceEndOn = new DateOnly(2027, 12, 31),
            Status = "PENDING_ACCOUNTING", PaymentCycle = "YEARLY", TotalValue = 1000000,
            SubmittedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        db.ContractRenewals.Add(renewal);
        await db.SaveChangesAsync(Ct);
        db.FinancialEvidences.AddRange(
            new FinancialEvidence { Kind = "CONTRACT", ContractId = contractId, UploadedByUserId = seller,
                FileName = "source.pdf", MimeType = "application/pdf", Sha256 = Key(),
                Bytes = "%PDF-test"u8.ToArray(), AttachedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new FinancialEvidence { Kind = "RENEWAL", ContractRenewalId = renewal.Id, UploadedByUserId = seller,
                FileName = "renewal.pdf", MimeType = "application/pdf", Sha256 = Key(),
                Bytes = "%PDF-test"u8.ToArray(), AttachedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync(Ct);

        static HttpContext AsUser(long id)
        {
            var http = new DefaultHttpContext();
            http.User = new System.Security.Claims.ClaimsPrincipal(
                new System.Security.Claims.ClaimsIdentity(
                    [new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, id.ToString())],
                    "IntegrationTest"));
            return http;
        }
        var result = await SalesProtectionOverviewEndpoints.ContractPeriods(contract.CustomerId,
            AsUser(seller), db, Ct);
        var json = System.Text.Json.JsonSerializer.SerializeToElement(
            ((Microsoft.AspNetCore.Http.IValueHttpResult)result).Value);
        var periods = json.GetProperty("data");
        Assert.Equal(2, periods.GetArrayLength());
        Assert.Equal("ORIGINAL", periods[0].GetProperty("type").GetString());
        Assert.True(periods[0].GetProperty("service_confirmed").GetBoolean());
        Assert.Equal("source.pdf", periods[0].GetProperty("evidence").GetProperty("file_name").GetString());
        Assert.Equal("RENEWAL", periods[1].GetProperty("type").GetString());
        Assert.False(periods[1].GetProperty("service_confirmed").GetBoolean());
        Assert.Equal("renewal.pdf", periods[1].GetProperty("evidence").GetProperty("file_name").GetString());
        await Assert.ThrowsAsync<KeyNotFoundException>(() => SalesProtectionOverviewEndpoints.ContractPeriods(
            contract.CustomerId, AsUser(otherSeller), db, Ct));
    }

    [MySqlFact]
    public async Task Sales_renewal_detail_scopes_submitter_and_returns_attached_file_metadata()
    {
        var seller = await Seller();
        var another = await Seller();
        var (_, contractId) = await Contract(seller);
        await using var db = fixture.Open();
        var renewal = new ContractRenewal
        {
            ContractId = contractId, RenewalNo = 1, SubmittedByUserId = seller,
            IdempotencyKey = Key(), RequestFingerprint = Key(), SignedOn = new DateOnly(2026, 12, 15),
            ServiceStartOn = new DateOnly(2027, 1, 1), ServiceEndOn = new DateOnly(2027, 12, 31),
            PaymentCycle = "YEARLY", TotalValue = 9500000, Status = "NEEDS_INFO",
            DecisionReason = "Cần bổ sung con dấu", GapReason = "Trường tạm ngưng",
            SubmittedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        db.ContractRenewals.Add(renewal);
        await db.SaveChangesAsync(Ct);
        db.FinancialEvidences.AddRange(
            new FinancialEvidence
            {
                Kind = "RENEWAL", ContractRenewalId = renewal.Id, UploadedByUserId = seller,
                FileName = "renewal-2027.pdf", MimeType = "application/pdf", Sha256 = Key(),
                Bytes = "%PDF-test"u8.ToArray(), AttachedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            },
            new FinancialEvidence
            {
                Kind = "RENEWAL", ContractRenewalId = renewal.Id, UploadedByUserId = another,
                FileName = "not-my-file.pdf", MimeType = "application/pdf", Sha256 = Key(),
                Bytes = "%PDF-test"u8.ToArray(), AttachedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            },
            new FinancialEvidence
            {
                Kind = "RENEWAL", ContractRenewalId = renewal.Id, UploadedByUserId = seller,
                FileName = "not-attached.pdf", MimeType = "application/pdf", Sha256 = Key(),
                Bytes = "%PDF-test"u8.ToArray(),
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
        await db.SaveChangesAsync(Ct);

        static HttpContext AsUser(long userId)
        {
            var http = new DefaultHttpContext();
            http.User = new System.Security.Claims.ClaimsPrincipal(
                new System.Security.Claims.ClaimsIdentity(
                    [new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, userId.ToString())],
                    "IntegrationTest"));
            return http;
        }
        var result = await ContractRenewalEndpoints.MineDetail(renewal.Id, AsUser(seller), db, Ct);
        var json = System.Text.Json.JsonSerializer.SerializeToElement(
            ((Microsoft.AspNetCore.Http.IValueHttpResult)result).Value,
            new System.Text.Json.JsonSerializerOptions {
                PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower
            });
        Assert.Equal("NEEDS_INFO", json.GetProperty("data").GetProperty("status").GetString());
        Assert.Equal("Cần bổ sung con dấu", json.GetProperty("data").GetProperty("decision_reason").GetString());
        Assert.Equal("Trường tạm ngưng", json.GetProperty("data").GetProperty("gap_reason").GetString());
        Assert.Single(json.GetProperty("evidence").EnumerateArray());
        Assert.Equal("renewal-2027.pdf", json.GetProperty("evidence")[0].GetProperty("file_name").GetString());
        Assert.False(json.GetProperty("evidence")[0].TryGetProperty("bytes", out _));
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            ContractRenewalEndpoints.MineDetail(renewal.Id, AsUser(another), db, Ct));
    }

    [MySqlFact]
    public async Task Sales_renewal_history_is_scoped_searchable_and_paginated()
    {
        var sellerA = await Seller();
        var sellerB = await Seller();
        var (_, contractA) = await Contract(sellerA);
        var (_, contractB) = await Contract(sellerB);
        await using var db = fixture.Open();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        db.ContractRenewals.AddRange(
            new ContractRenewal {
                ContractId = contractA, RenewalNo = 1, SubmittedByUserId = sellerA,
                IdempotencyKey = Key(), RequestFingerprint = Key(), SignedOn = today,
                ServiceStartOn = new DateOnly(2027, 1, 1), ServiceEndOn = new DateOnly(2027, 12, 31),
                Status = "PENDING_ACCOUNTING", PaymentCycle = "YEARLY", TotalValue = 1000000,
                SubmittedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            },
            new ContractRenewal {
                ContractId = contractA, RenewalNo = 2, SubmittedByUserId = sellerA,
                IdempotencyKey = Key(), RequestFingerprint = Key(), SignedOn = today,
                ServiceStartOn = new DateOnly(2028, 1, 1), ServiceEndOn = new DateOnly(2028, 12, 31),
                Status = "CONFIRMED", PaymentCycle = "YEARLY", TotalValue = 1000000,
                SubmittedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            },
            new ContractRenewal {
                ContractId = contractB, RenewalNo = 1, SubmittedByUserId = sellerB,
                IdempotencyKey = Key(), RequestFingerprint = Key(), SignedOn = today,
                ServiceStartOn = new DateOnly(2027, 1, 1), ServiceEndOn = new DateOnly(2027, 12, 31),
                Status = "CONFIRMED", PaymentCycle = "YEARLY", TotalValue = 2000000,
                SubmittedAt = DateTime.UtcNow, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            });
        await db.SaveChangesAsync(Ct);

        static HttpContext AsSales(long userId) {
            var http = new DefaultHttpContext();
            http.User = new System.Security.Claims.ClaimsPrincipal(
                new System.Security.Claims.ClaimsIdentity(
                    [new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, userId.ToString())],
                    "IntegrationTest"));
            return http;
        }
        static System.Text.Json.JsonElement Json(IResult result) =>
            System.Text.Json.JsonSerializer.SerializeToElement(
                ((Microsoft.AspNetCore.Http.IValueHttpResult)result).Value,
                new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower
                });

        var httpA = AsSales(sellerA);
        var all = Json(await ContractRenewalEndpoints.MineList(httpA, db,
            null, null, null, 1, 20, Ct));
        Assert.Equal(2, all.GetProperty("total").GetInt32());
        Assert.Equal(2, all.GetProperty("data").GetArrayLength());

        var page = Json(await ContractRenewalEndpoints.MineList(httpA, db,
            null, null, null, 1, 1, Ct));
        Assert.Equal(2, page.GetProperty("total").GetInt32());
        Assert.Single(page.GetProperty("data").EnumerateArray());

        var filtered = Json(await ContractRenewalEndpoints.MineList(httpA, db,
            null, "2", "CONFIRMED", 1, 20, Ct));
        Assert.Equal(1, filtered.GetProperty("total").GetInt32());
        Assert.Equal(contractA, filtered.GetProperty("data")[0].GetProperty("contract_id").GetInt64());

        var schoolId = await db.SalesContracts.Where(x => x.Id == contractA)
            .Select(x => x.CustomerId).SingleAsync(Ct);
        var bySchool = Json(await ContractRenewalEndpoints.MineList(httpA, db,
            schoolId, null, null, 1, 20, Ct));
        Assert.Equal(2, bySchool.GetProperty("total").GetInt32());
        var schools = Json(await ContractRenewalEndpoints.MineSchools(httpA, db, Ct));
        Assert.Single(schools.GetProperty("data").EnumerateArray());

        var other = Json(await ContractRenewalEndpoints.MineList(AsSales(sellerB), db,
            null, null, null, 1, 20, Ct));
        Assert.Equal(1, other.GetProperty("total").GetInt32());
        Assert.Equal(contractB, other.GetProperty("data")[0].GetProperty("contract_id").GetInt64());
    }

    [MySqlFact]
    public async Task Sales_contract_yearly_and_monthly_fees_create_correct_item_breakdown()
    {
        var seller = await Seller();
        await using var db = fixture.Open();
        var actions = new ChannelSalesActions(db);
        var packageId = await db.CheckeeProductPackages.Select(x => x.Id).FirstAsync(Ct);
        var signedOn = ChannelSalesValidation.BusinessDate(DateTime.UtcNow);
        foreach (var monthly in new[] { false, true })
        {
            var registration = await actions.RegisterCustomerApproach(Approach(), seller, Http(), Ct);
            var maintenance = monthly ? 1_716_000m : 11_880_000m;
            var setup = monthly ? 4_395_600m : 3_996_000m;
            var total = maintenance * (monthly ? 9 : 1) + setup;
            var request = new ReportSalesContractRequest(Key(), null, signedOn, null,
                packageId, total, null, "CONTRACT-TEST",
                ServicePlan: monthly ? "MONTHLY_9" : "SCHOOL_YEAR",
                StudentCount: 450, MaintenanceFee: maintenance, SetupFee: setup,
                ContractNote: "Giá đã đối chiếu với hợp đồng", BranchCount: 3);
            var contractId = await actions.ReportSignedContract(registration, request, seller, Http(), Ct);
            var contract = await db.SalesContracts.AsNoTracking().SingleAsync(x => x.Id == contractId, Ct);
            Assert.Equal(total, contract.TotalValue);
            Assert.Equal(3, contract.BranchCount);
            Assert.Equal("Giá đã đối chiếu với hợp đồng", contract.ContractNote);
            var items = await db.SalesContractItems.AsNoTracking()
                .Where(x => x.ContractId == contractId).ToArrayAsync(Ct);
            Assert.Equal(2, items.Length);
            Assert.Equal(total, items.Sum(x => x.Amount));
            Assert.Equal(maintenance * (monthly ? 9 : 1),
                items.Single(x => x.Description.StartsWith("Phí duy trì")).Amount);
            Assert.Equal(setup, items.Single(x => x.Description.StartsWith("Phí khởi tạo")).Amount);
            Assert.Equal(contractId, await actions.ReportSignedContract(registration, request, seller, Http(), Ct));
        }
    }

    [MySqlFact]
    public async Task Sales_contract_rejects_negative_branch_count_without_creating_contract()
    {
        var seller = await Seller();
        await using var db = fixture.Open();
        var actions = new ChannelSalesActions(db);
        var registration = await actions.RegisterCustomerApproach(Approach(), seller, Http(), Ct);
        var packageId = await db.CheckeeProductPackages.Select(x => x.Id).FirstAsync(Ct);
        var request = new ReportSalesContractRequest(Key(), null,
            ChannelSalesValidation.BusinessDate(DateTime.UtcNow), null,
            packageId, 15_876_000m, null, "CONTRACT-TEST",
            ServicePlan: "SCHOOL_YEAR", StudentCount: 450,
            MaintenanceFee: 11_880_000m, SetupFee: 3_996_000m, BranchCount: -1);
        await Assert.ThrowsAsync<ApiValidationException>(() =>
            actions.ReportSignedContract(registration, request, seller, Http(), Ct));
        Assert.False(await db.SalesContracts.AnyAsync(x => x.ApproachRegistrationId == registration, Ct));
    }

    [MySqlFact]
    public async Task Sales_contract_fee_mismatch_is_rejected_before_creating_contract()
    {
        var seller = await Seller();
        await using var db = fixture.Open();
        var actions = new ChannelSalesActions(db);
        var registration = await actions.RegisterCustomerApproach(Approach(), seller, Http(), Ct);
        var packageId = await db.CheckeeProductPackages.Select(x => x.Id).FirstAsync(Ct);
        var request = new ReportSalesContractRequest(Key(), null,
            ChannelSalesValidation.BusinessDate(DateTime.UtcNow), null,
            packageId, 15_876_001m, null, "CONTRACT-TEST",
            ServicePlan: "SCHOOL_YEAR", StudentCount: 450,
            MaintenanceFee: 11_880_000m, SetupFee: 3_996_000m);
        await Assert.ThrowsAsync<ApiValidationException>(() =>
            actions.ReportSignedContract(registration, request, seller, Http(), Ct));
        Assert.False(await db.SalesContracts.AnyAsync(x => x.ApproachRegistrationId == registration, Ct));
    }

    [MySqlFact]
    public async Task Sales_contract_code_is_generated_when_omitted_and_legacy_codes_are_preserved()
    {
        var seller = await Seller();
        await using var db = fixture.Open();
        var actions = new ChannelSalesActions(db);
        var packageId = await db.CheckeeProductPackages.Select(x => x.Id).FirstAsync(Ct);
        var signedOn = ChannelSalesValidation.BusinessDate(DateTime.UtcNow);

        var firstRegistration = await actions.RegisterCustomerApproach(Approach(), seller, Http(), Ct);
        var automaticRequest = new ReportSalesContractRequest(Key(), null, signedOn, null, packageId,
            1_000_000m, null, "TEST-EVIDENCE");
        var automaticId = await actions.ReportSignedContract(firstRegistration, automaticRequest, seller, Http(), Ct);
        var automaticCode = await db.SalesContracts.Where(x => x.Id == automaticId)
            .Select(x => x.ContractCode).SingleAsync(Ct);
        Assert.Matches(@"^HD-[0-9]{4}-[0-9A-F]{32}$", automaticCode);
        Assert.Equal(automaticId, await actions.ReportSignedContract(firstRegistration, automaticRequest, seller, Http(), Ct));

        var secondRegistration = await actions.RegisterCustomerApproach(Approach(), seller, Http(), Ct);
        var secondId = await actions.ReportSignedContract(secondRegistration,
            automaticRequest with { IdempotencyKey = Key() }, seller, Http(), Ct);
        var secondCode = await db.SalesContracts.Where(x => x.Id == secondId)
            .Select(x => x.ContractCode).SingleAsync(Ct);
        Assert.NotEqual(automaticCode, secondCode);

        var thirdRegistration = await actions.RegisterCustomerApproach(Approach(), seller, Http(), Ct);
        var legacyCode = "CT-LEGACY-" + Key()[..8].ToUpperInvariant();
        var legacyId = await actions.ReportSignedContract(thirdRegistration,
            automaticRequest with { IdempotencyKey = Key(), ContractCode = legacyCode }, seller, Http(), Ct);
        Assert.Equal(legacyCode, await db.SalesContracts.Where(x => x.Id == legacyId)
            .Select(x => x.ContractCode).SingleAsync(Ct));
    }

    [MySqlFact]
    public async Task Concurrent_identity_registration_has_exactly_one_owner_and_no_orphans()
    {
        var firstSeller = await Seller();
        var secondSeller = await Seller();
        var request = Approach();
        async Task<bool> TryRegister(long actor, RegisterApproachRequest input)
        {
            await using var db = fixture.Open();
            try { await new ChannelSalesActions(db).RegisterCustomerApproach(input, actor, Http(), Ct); return true; }
            catch (ApiConflictException) { return false; }
        }
        var results = await Task.WhenAll(TryRegister(firstSeller, request), TryRegister(secondSeller, request with { IdempotencyKey = Key() }));
        Assert.Single(results, x => x);
        await using var verification = fixture.Open();
        var customer = await verification.ChannelCustomers.SingleAsync(x => x.TaxCode == request.TaxCode);
        Assert.Equal(1, await verification.CustomerProtections.CountAsync(x => x.CustomerId == customer.Id && x.Status == "ACTIVE"));
        Assert.Equal(1, await verification.ApproachRegistrations.CountAsync(x => x.CustomerId == customer.Id));
        Assert.Equal(1, await verification.CustomerIdentifiers.CountAsync(x => x.CustomerId == customer.Id));
    }

    [MySqlFact]
    public async Task Replay_is_bound_to_actor_content_and_resource()
    {
        var seller = await Seller();
        var stranger = await Seller();
        var request = Approach();
        await using var db = fixture.Open();
        var actions = new ChannelSalesActions(db);
        var id = await actions.RegisterCustomerApproach(request, seller, Http(), Ct);
        Assert.Equal(id, await actions.RegisterCustomerApproach(request, seller, Http(), Ct));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => actions.RegisterCustomerApproach(request, stranger, Http(), Ct));
        await Assert.ThrowsAsync<ApiConflictException>(() => actions.RegisterCustomerApproach(request with { DisplayName = "Nội dung khác" }, seller, Http(), Ct));
    }

    [MySqlFact]
    public async Task Expired_protection_can_be_claimed_without_an_expiry_worker()
    {
        var first = await Seller();
        var second = await Seller();
        var request = Approach();
        long customerId;
        await using (var db = fixture.Open())
        {
            var registrationId = await new ChannelSalesActions(db).RegisterCustomerApproach(request, first, Http(), Ct);
            var registration = await db.ApproachRegistrations.FindAsync(registrationId);
            customerId = registration!.CustomerId;
            var expired = DateTime.UtcNow.AddSeconds(-1);
            await db.ApproachRegistrations.Where(x => x.Id == registrationId).ExecuteUpdateAsync(s => s.SetProperty(x => x.ProtectedUntil, expired));
            await db.CustomerProtections.Where(x => x.CustomerId == customerId).ExecuteUpdateAsync(s => s.SetProperty(x => x.EffectiveUntil, expired));
        }
        await using var fresh = fixture.Open();
        await new ChannelSalesActions(fresh).RegisterCustomerApproach(request with { IdempotencyKey = Key() }, second, Http(), Ct);
        Assert.Equal(1, await fresh.ApproachRegistrations.CountAsync(x => x.CustomerId == customerId && x.Status == "EXPIRED"));
        Assert.Equal(1, await fresh.ApproachRegistrations.CountAsync(x => x.CustomerId == customerId && x.Status == "ACTIVE" && x.OwnerUserId == second));
        Assert.False(await fresh.SalesContracts.AnyAsync(x => x.CustomerId == customerId));
    }

    [MySqlFact]
    public async Task Consultation_note_only_records_server_timestamp_actor_and_no_assumed_outcome()
    {
        var seller = await Seller();
        await using var db = fixture.Open();
        var registrationId = await new ChannelSalesActions(db).RegisterCustomerApproach(Approach(), seller, Http(), Ct);
        var before = DateTime.UtcNow;
        var id = await new ChannelSalesActions(db).AddActivity(
            registrationId, new AddCustomerActivityRequest(null, "Đã trao đổi về nhu cầu của trường.", null),
            seller, Http(), Ct);
        var after = DateTime.UtcNow;
        var activity = await db.CustomerActivities.AsNoTracking().SingleAsync(x => x.Id == id, Ct);
        Assert.Equal("NOTE", activity.ActivityType);
        Assert.Null(activity.Outcome);
        Assert.Equal(seller, activity.UserId);
        Assert.Equal("Đã trao đổi về nhu cầu của trường.", activity.Content);
        Assert.NotNull(activity.OccurredAt);
        Assert.InRange(activity.OccurredAt.Value, before.AddSeconds(-1), after.AddSeconds(1));
        Assert.Null(activity.NextFollowUpAt);
        Assert.Equal(registrationId, activity.ApproachRegistrationId);
    }

    [MySqlFact]
    public async Task Scope_hides_peer_sales_partner_data_and_suspended_memberships()
    {
        var owner = await Seller();
        var peer = await Seller();
        var request = Approach();
        await using var db = fixture.Open();
        var id = await new ChannelSalesActions(db).RegisterCustomerApproach(request, owner, Http(), Ct);
        var customerId = (await db.ApproachRegistrations.FindAsync(id))!.CustomerId;
        var peerAccess = await ChannelSalesAccess.Load(db, peer, Ct);
        Assert.False(await peerAccess.Customers(db).AnyAsync(x => x.Id == customerId));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => new ChannelSalesActions(db).AddActivity(id, new("NOTE", "Không được phép", null), peer, Http(), Ct));
        var partnerId = await UserId("partner@kidsfit.vn");
        var partnerAccess = await ChannelSalesAccess.Load(db, partnerId, Ct);
        Assert.False(await partnerAccess.Customers(db).AnyAsync(x => x.Id == customerId));
        await db.OrganizationMemberships.Where(x => x.UserId == owner).ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "SUSPENDED"));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => new ChannelSalesActions(db).AddActivity(id, new("NOTE", "Đã bị ngưng", null), owner, Http(), Ct));
    }


    [MySqlFact]
    public async Task Duplicate_bank_reference_reports_field_error_without_double_recording_money()
    {
        var seller = await Seller();
        var (_, contractId) = await Contract(seller);
        var accountant = await UserId("accountant@kidsfit.vn");
        await using var db = fixture.Open();
        var actions = new ChannelSalesActions(db);
        var reference = "RC-" + Key();
        var first = new RecordRevenueReceiptRequest(Key(), null, 100_000m, DateTime.UtcNow, reference, "BANK_TRANSFER");
        await actions.RecordRevenueReceipt(contractId, first, accountant, Http(), Ct);
        var rejected = await Assert.ThrowsAsync<ApiValidationException>(() =>
            actions.RecordRevenueReceipt(contractId, first with { IdempotencyKey = Key() }, accountant, Http(), Ct));
        Assert.Contains("reference_code", rejected.Errors.Keys);
        db.ChangeTracker.Clear();
        Assert.Equal(1, await db.RevenueReceipts.CountAsync(x => x.ReferenceCode == reference));
        Assert.Equal(100_000m, await db.RevenueSchedules.Where(x => x.ContractId == contractId)
            .Select(x => x.AmountReceived).SingleAsync());
    }

    [MySqlFact]
    public async Task Receipt_failure_rolls_back_money_and_schedule_then_success_replays_once()
    {
        var seller = await Seller();
        var (_, contractId) = await Contract(seller);
        var accountant = await UserId("accountant@kidsfit.vn");
        await using var db = fixture.Open();
        var actions = new ChannelSalesActions(db);
        var request = new RecordRevenueReceiptRequest(Key(), null, 250_000m, DateTime.UtcNow, "RC-" + Key(), "BANK_TRANSFER");
        // Force a failure after both receipt and ledger writes to verify the real transaction boundary.
        await db.Database.ExecuteSqlRawAsync("CREATE TRIGGER fail_test_receipt_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action = 'RECORD_CHANNEL_REVENUE' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'test rollback'; END IF; END");
        try { await Assert.ThrowsAsync<ApiConflictException>(() => actions.RecordRevenueReceipt(contractId, request, accountant, Http(), Ct)); }
        finally { await db.Database.ExecuteSqlRawAsync("DROP TRIGGER fail_test_receipt_audit"); }
        db.ChangeTracker.Clear();
        Assert.False(await db.RevenueReceipts.AnyAsync(x => x.IdempotencyKey == request.IdempotencyKey));
        Assert.Equal(0m, await db.RevenueSchedules.Where(x => x.ContractId == contractId).Select(x => x.AmountReceived).SingleAsync());
        var receiptId = await actions.RecordRevenueReceipt(contractId, request, accountant, Http(), Ct);
        Assert.Equal(receiptId, await actions.RecordRevenueReceipt(contractId, request, accountant, Http(), Ct));
        Assert.Equal(1, await db.CommissionLedgerEntries.CountAsync(x => x.RevenueReceiptId == receiptId));
        await Assert.ThrowsAsync<ApiValidationException>(() => actions.RecordRevenueReceipt(contractId, request with { IdempotencyKey = Key(), Amount = 1_000_000m }, accountant, Http(), Ct));
        Assert.Equal(250_000m, await db.RevenueReceipts.Where(x => x.ContractId == contractId).SumAsync(x => x.Amount));
    }

    [MySqlFact]
    public async Task Contract_to_payout_has_no_duplicate_cash_or_commissions_and_keeps_ledger_immutable()
    {
        var seller = await Seller();
        var (_, contractId) = await Contract(seller);
        var accountant = await UserId("accountant@kidsfit.vn");
        var checkee = await UserId("checkee@kidsfit.vn");
        await using var db = fixture.Open();
        var actions = new ChannelSalesActions(db);
        var request = new RecordRevenueReceiptRequest(Key(), null, 500_000m, DateTime.UtcNow, "RC-" + Key(), "BANK_TRANSFER");
        await actions.RecordRevenueReceipt(contractId, request, accountant, Http(), Ct);
        var entry = await db.CommissionLedgerEntries.SingleAsync(x => x.ContractId == contractId);
        var payoutRequest = new CreatePayoutRequest(Key(), entry.BeneficiaryOrganizationId, seller, entry.Period, 5_000m, "Khấu trừ theo chứng từ kiểm thử");
        // The current approved payout workflow uses eligible accrued ledger entries;
        // a CHECKEE reconciliation is tracked independently, not a prerequisite.
        var payoutId = await actions.CreatePayout(payoutRequest, accountant, Http(), Ct);
        var reconciliationId = await db.ReconciliationCases.Where(x => x.ContractId == contractId).Select(x => x.Id).SingleAsync();
        await actions.Reconcile(reconciliationId, true, new("Đã xác nhận"), checkee, Http(), Ct);
        await actions.Reconcile(reconciliationId, true, new("Đã xác nhận"), checkee, Http(), Ct);
        Assert.Equal(payoutId, await actions.CreatePayout(payoutRequest, accountant, Http(), Ct));
        await Assert.ThrowsAsync<ApiConflictException>(() => actions.CreatePayout(payoutRequest with { IdempotencyKey = Key() }, accountant, Http(), Ct));
        await Assert.ThrowsAsync<ApiConflictException>(() => actions.CompletePayout(payoutId, new("TX-" + Key(), null), accountant, Http(), Ct));
        await actions.ApprovePayout(payoutId, accountant, Http(), Ct);
        await actions.ApprovePayout(payoutId, accountant, Http(), Ct);
        var completion = new CompletePayoutRequest("TX-" + Key(), null);
        await actions.CompletePayout(payoutId, completion, accountant, Http(), Ct);
        await actions.CompletePayout(payoutId, completion, accountant, Http(), Ct);
        db.ChangeTracker.Clear();
        var paid = await db.Payouts.FindAsync(payoutId);
        Assert.Equal("PAID", paid!.Status);
        Assert.Equal(50_000m, paid.GrossAmount);
        Assert.Equal(45_000m, paid.NetAmount);
        Assert.Equal(3, await db.PayoutEvents.CountAsync(x => x.PayoutId == payoutId));
        Assert.Equal("ACCRUED", (await db.CommissionLedgerEntries.FindAsync(entry.Id))!.Status);
        Assert.Equal(1, await db.PayoutItems.CountAsync(x => x.CommissionLedgerEntryId == entry.Id));
        Assert.Equal(1, await db.ReconciliationEvents.CountAsync(x => x.ReconciliationCaseId == reconciliationId && x.EventType == "CONFIRMED"));
    }

    [MySqlFact]
    public async Task Partner_cannot_raise_policy_above_delegated_ceiling_or_backdate()
    {
        var partnerId = await UserId("partner@kidsfit.vn");
        await using var db = fixture.Open();
        var organizationId = await db.OrganizationMemberships.Where(x => x.UserId == partnerId && x.IsPrimary).Select(x => x.OrganizationId).SingleAsync();
        var actions = new ChannelSalesActions(db);
        var request = new CreateCommissionPolicyRequest(organizationId, "POL-" + Key(), "Phiên bản mới", 99m, ChannelSalesValidation.BusinessDate(DateTime.UtcNow).AddDays(1), null);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => actions.CreateCommissionPolicy(request, partnerId, Http(), Ct));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => actions.CreateCommissionPolicy(request with { RatePercent = 10m, EffectiveFrom = ChannelSalesValidation.BusinessDate(DateTime.UtcNow) }, partnerId, Http(), Ct));
        // Commission policy approval is restricted to an authorized central actor, not delegated partner Sales managers.
        Assert.Equal(12m, await db.CommissionPolicyVersions.Where(x => x.Code == "PARTNER-2026-V1").Select(x => x.RatePercent).SingleAsync());
        Assert.Equal(12m, await db.CommissionPolicyVersions.Where(x => x.Code == "PARTNER-2026-V1").Select(x => x.RatePercent).SingleAsync());
    }

    [MySqlFact]
    public async Task Concurrent_receipts_cannot_overcollect_contract_balance()
    {
        var seller = await Seller();
        var (_, contractId) = await Contract(seller);
        var accountant = await UserId("accountant@kidsfit.vn");
        async Task<bool> Collect()
        {
            await using var db = fixture.Open();
            try
            {
                await new ChannelSalesActions(db).RecordRevenueReceipt(contractId, new(Key(), null, 750_000m, DateTime.UtcNow, "RC-" + Key(), "BANK_TRANSFER"), accountant, Http(), Ct);
                return true;
            }
            catch (ApiValidationException) { return false; }
        }
        var results = await Task.WhenAll(Collect(), Collect());
        Assert.Single(results, x => x);
        await using var verification = fixture.Open();
        Assert.Equal(750_000m, await verification.RevenueReceipts.Where(x => x.ContractId == contractId).SumAsync(x => x.Amount));
        Assert.Equal(75_000m, await verification.CommissionLedgerEntries.Where(x => x.ContractId == contractId).SumAsync(x => x.Amount));
    }

    [MySqlFact]
    public async Task Commission_corrections_append_and_cannot_reverse_more_than_original()
    {
        var seller = await Seller();
        var (_, contractId) = await Contract(seller);
        var accountant = await UserId("accountant@kidsfit.vn");
        await using var db = fixture.Open();
        var actions = new ChannelSalesActions(db);
        await actions.RecordRevenueReceipt(contractId, new(Key(), null, 500_000m, DateTime.UtcNow, "RC-" + Key(), "BANK_TRANSFER"), accountant, Http(), Ct);
        var original = await db.CommissionLedgerEntries.SingleAsync(x => x.ContractId == contractId);
        var correction = new AdjustCommissionRequest(Key(), -10_000m, original.Period, "Điều chỉnh theo chứng từ");
        var id = await actions.AdjustCommission(original.Id, correction, accountant, Http(), Ct);
        Assert.Equal(id, await actions.AdjustCommission(original.Id, correction, accountant, Http(), Ct));
        await Assert.ThrowsAsync<ApiValidationException>(() => actions.AdjustCommission(original.Id, correction with { IdempotencyKey = Key(), Amount = -50_000m }, accountant, Http(), Ct));
        Assert.Equal(50_000m, original.Amount);
        Assert.Equal(40_000m, await db.CommissionLedgerEntries.Where(x => x.ContractId == contractId).SumAsync(x => x.Amount));
        Assert.Equal(2, await db.CommissionLedgerEntries.CountAsync(x => x.ContractId == contractId));
    }

    [MySqlFact]
    public async Task Partner_account_creation_cannot_grant_admin_and_suspension_revokes_scope()
    {
        var partner = await UserId("partner@kidsfit.vn");
        await using var db = fixture.Open();
        var orgId = await db.OrganizationMemberships.Where(x => x.UserId == partner && x.IsPrimary).Select(x => x.OrganizationId).SingleAsync();
        var actions = new ChannelSalesActions(db);
        var request = new CreateSalesAccountRequest(orgId, "CTV kiểm thử", Key() + "@example.test", "TestPassword@2026", "ADMIN");
        await Assert.ThrowsAsync<KeyNotFoundException>(() => actions.CreateSalesAccount(request, partner, new PasswordHasher<User>(), Http(), Ct));
        var userId = await actions.CreateSalesAccount(request with { RoleCode = "SALES" }, partner, new PasswordHasher<User>(), Http(), Ct);
        var access = await ChannelSalesAccess.Load(db, userId, Ct);
        Assert.False(access.All);
        Assert.False(access.Organization);
        Assert.False(access.Has(Permissions.ChannelSalesIdentityManage));
        Assert.True(access.Has(Permissions.ChannelSalesRegister));
        var membershipId = await db.OrganizationMemberships.Where(x => x.UserId == userId).Select(x => x.Id).SingleAsync();
        await actions.ChangeMembershipStatus(membershipId, new("SUSPENDED", "CTV ngưng hợp tác", "Không có lịch hẹn hoặc cam kết chưa bàn giao.", Key()), partner, Http(), Ct);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => actions.RegisterCustomerApproach(Approach(), userId, Http(), Ct));
    }

    [MySqlFact]
    public async Task Unassigned_CSKH_and_CHECKEE_cannot_write_customer_support()
    {
        var seller = await Seller();
        var (_, contractId) = await Contract(seller);
        var care = await UserId("care@kidsfit.vn");
        var checkee = await UserId("checkee@kidsfit.vn");
        await using var db = fixture.Open();
        var customerId = await db.SalesContracts.Where(x => x.Id == contractId).Select(x => x.CustomerId).SingleAsync();
        var actions = new ChannelSalesActions(db);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => actions.RecordSupportActivity(customerId,
            new(null, "Chưa được Admin phân công", null), care, Http(), Ct));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => actions.RecordSupportActivity(customerId, new(null, "Không được phép", null), checkee, Http(), Ct));
    }

    [MySqlFact]
    public async Task Care_handover_rejects_admin_even_with_support_permissions()
    {
        var admin = await UserId("admin@kidsfit.vn");
        var caretaker = await UserId("care@kidsfit.vn");
        await using var db = fixture.Open();
        var kidsfitId = await db.Organizations.Where(x => x.Code == "KIDSFIT")
            .Select(x => x.Id).SingleAsync(Ct);
        // Use a non-existent contract to isolate assignee eligibility: the invalid
        // Admin must be rejected before contract lookup; a valid caretaker reaches it.
        var actions = new ChannelSalesActions(db);
        var error = await Assert.ThrowsAsync<ApiValidationException>(() => actions.AssignContractCare(
            0, new AssignContractCareRequest(Key(), admin, kidsfitId, null), admin, Http(), Ct));
        Assert.Contains("Chăm sóc khách hàng", error.Errors["user_id"][0]);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => actions.AssignContractCare(
            0, new AssignContractCareRequest(Key(), caretaker, kidsfitId, null), admin, Http(), Ct));

        // A dual-role account must still be rejected even if a CSKH membership was granted.
        var roleId = await db.Roles.Where(x => x.Code == "ADMIN").Select(x => x.Id).SingleAsync(Ct);
        var unique = Key();
        var dualRole = new User { Code = unique[..20], Name = "Quản trị viên kiêm CSKH",
            Email = unique + "@example.test", Status = "ACTIVE", Password = "unused-test-hash",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.Users.Add(dualRole);
        await db.SaveChangesAsync(Ct);
        db.UserRoles.Add(new UserRole { UserId = dualRole.Id, RoleId = roleId });
        db.OrganizationMemberships.Add(new OrganizationMembership { UserId = dualRole.Id,
            OrganizationId = kidsfitId, MembershipType = "CUSTOMER_SERVICE",
            IsPrimary = true, Status = "ACTIVE", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync(Ct);
        var dualError = await Assert.ThrowsAsync<ApiValidationException>(() => actions.AssignContractCare(
            0, new AssignContractCareRequest(Key(), dualRole.Id, kidsfitId, null), admin, Http(), Ct));
        Assert.Contains("quản trị viên", dualError.Errors["user_id"][0]);
    }

    [MySqlFact]
    public async Task Newly_created_checkee_seller_does_not_inherit_education_PII_permissions()
    {
        var admin = await UserId("admin@kidsfit.vn");
        await using var db = fixture.Open();
        var organizationId = await db.Organizations.Where(x => x.Code == "KIDSFIT").Select(x => x.Id).SingleAsync();
        var id = await new ChannelSalesActions(db).CreateSalesAccount(new(organizationId, "Nhân sự CHECKEE", Key() + "@example.test", "TestPassword@2026", "SALES"), admin, new PasswordHasher<User>(), Http(), Ct);
        var access = await ChannelSalesAccess.Load(db, id, Ct);
        Assert.True(access.Has(Permissions.ChannelSalesRegister));
        Assert.DoesNotContain(access.PermissionCodes, code => code.StartsWith("crm.lead.") || code.StartsWith("student.") || code.StartsWith("payment."));
    }

    [MySqlFact]
    public async Task Lock_timeout_is_retried_with_the_same_request_key()
    {
        var seller = await Seller();
        var request = Approach();
        long customerId;
        await using (var setup = fixture.Open())
        {
            var id = await new ChannelSalesActions(setup).RegisterCustomerApproach(request, seller, Http(), Ct);
            customerId = (await setup.ApproachRegistrations.FindAsync(id))!.CustomerId;
            var expired = DateTime.UtcNow.AddSeconds(-1);
            await setup.ApproachRegistrations.Where(x => x.Id == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.ProtectedUntil, expired));
            await setup.CustomerProtections.Where(x => x.CustomerId == customerId).ExecuteUpdateAsync(s => s.SetProperty(x => x.EffectiveUntil, expired));
        }
        await using var blocker = fixture.Open();
        await using var transaction = await blocker.Database.BeginTransactionAsync();
        await blocker.ChannelCustomers.FromSqlInterpolated($"SELECT * FROM channel_customers WHERE id = {customerId} FOR UPDATE").SingleAsync();
        await using var contender = fixture.Open();
        await contender.Database.OpenConnectionAsync();
        await contender.Database.ExecuteSqlRawAsync("SET SESSION innodb_lock_wait_timeout = 1");
        var actions = new ChannelSalesActions(contender);
        var retryRequest = request with { IdempotencyKey = Key(), CustomerId = customerId };
        var task = actions.RegisterCustomerApproach(retryRequest, seller, Http(), Ct);
        await Task.Delay(1300);
        await transaction.CommitAsync();
        var registrationId = await task;
        Assert.Equal(registrationId, await actions.RegisterCustomerApproach(retryRequest, seller, Http(), Ct));
    }
}

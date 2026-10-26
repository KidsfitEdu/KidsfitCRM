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
        await using var provider = services.BuildServiceProvider();
        await using var scope = provider.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<KidsfitDbContext>().Database.MigrateAsync();
        await DatabaseSeeder.SeedAsync(scope.ServiceProvider);
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
        await Assert.ThrowsAsync<ApiConflictException>(() => actions.CreatePayout(payoutRequest, accountant, Http(), Ct));
        var reconciliationId = await db.ReconciliationCases.Where(x => x.ContractId == contractId).Select(x => x.Id).SingleAsync();
        await actions.Reconcile(reconciliationId, true, new("Đã xác nhận"), checkee, Http(), Ct);
        await actions.Reconcile(reconciliationId, true, new("Đã xác nhận"), checkee, Http(), Ct);
        var payoutId = await actions.CreatePayout(payoutRequest, accountant, Http(), Ct);
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
        await Assert.ThrowsAsync<ApiValidationException>(() => actions.CreateCommissionPolicy(request, partnerId, Http(), Ct));
        await Assert.ThrowsAsync<ApiValidationException>(() => actions.CreateCommissionPolicy(request with { RatePercent = 10m, EffectiveFrom = ChannelSalesValidation.BusinessDate(DateTime.UtcNow) }, partnerId, Http(), Ct));
        var id = await actions.CreateCommissionPolicy(request with { RatePercent = 11m }, partnerId, Http(), Ct);
        Assert.Equal(11m, (await db.CommissionPolicyVersions.FindAsync(id))!.RatePercent);
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
        var userId = await actions.CreateSalesAccount(request, partner, new PasswordHasher<User>(), Http(), Ct);
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
    public async Task Customer_care_records_support_after_signing_and_checkee_cannot_write_support()
    {
        var seller = await Seller();
        var (_, contractId) = await Contract(seller);
        var care = await UserId("care@kidsfit.vn");
        var checkee = await UserId("checkee@kidsfit.vn");
        await using var db = fixture.Open();
        var customerId = await db.SalesContracts.Where(x => x.Id == contractId).Select(x => x.CustomerId).SingleAsync();
        var actions = new ChannelSalesActions(db);
        var activityId = await actions.RecordSupportActivity(customerId, new(null, "Đã hướng dẫn sử dụng phần mềm.", null), care, Http(), Ct);
        Assert.Equal("SUPPORT", (await db.CustomerActivities.FindAsync(activityId))!.ActivityType);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => actions.RecordSupportActivity(customerId, new(null, "Không được phép", null), checkee, Http(), Ct));
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
        Assert.False(access.Has(Permissions.LeadView));
        Assert.False(access.Has(Permissions.StudentView));
        Assert.False(access.Has(Permissions.PaymentView));
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

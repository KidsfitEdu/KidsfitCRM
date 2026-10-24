using System.IO.Compression;
using System.Xml.Linq;
using System.Security.Claims;
using System.Text.Json;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Tests;

public static class SchoolTestWorkbook
{
    public static byte[] Create(string prefix, int schools = 2, bool formula = false, bool invalidHeader = false, bool orphan = false)
    {
        XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        var rows = new List<string[]> { new[] { invalidHeader ? "Sai tiêu đề" : "Mã trường chính", "Loại đơn vị", "Tên đơn vị", "Tỉnh / Thành phố", "Phường / Xã", "Địa chỉ", "Người liên hệ", "Chức vụ", "Số điện thoại", "Email", "SĐT trường", "Ghi chú" } };
        for (var i = 0; i < schools; i++)
        {
            rows.Add([prefix + i, orphan ? "Phân hiệu" : "Trường chính", "Trường kiểm thử " + prefix + i, "Tỉnh thử nghiệm", "Phường thử nghiệm", "", "Đầu mối kiểm thử", "", "", "", "", ""]);
            rows.Add([prefix + i, "Phân hiệu", "Phân hiệu kiểm thử", "Tỉnh thử nghiệm", "Phường thử nghiệm", "", "", "", "", "", "", ""]);
        }
        var sheet = new XDocument(new XElement(ns + "worksheet", new XElement(ns + "sheetData", rows.Select((values, row) =>
            new XElement(ns + "row", new XAttribute("r", row + 1), values.Select((value, column) =>
                new XElement(ns + "c", new XAttribute("r", $"{(char)('A' + column)}{row + 1}"), new XAttribute("t", "inlineStr"),
                    formula && row == 1 && column == 2 ? new XElement(ns + "f", "1+1") : null,
                    new XElement(ns + "is", new XElement(ns + "t", value)))))))));
        using var output = new MemoryStream();
        using (var zip = new ZipArchive(output, ZipArchiveMode.Create, true))
        {
            void Add(string name, string content) { using var writer = new StreamWriter(zip.CreateEntry(name).Open()); writer.Write(content); }
            Add("xl/workbook.xml", "<workbook xmlns='http://schemas.openxmlformats.org/spreadsheetml/2006/main' xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships'><sheets><sheet name='DANH_SACH_TRUONG' sheetId='1' r:id='r1'/></sheets></workbook>");
            Add("xl/_rels/workbook.xml.rels", "<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'><Relationship Id='r1' Target='worksheets/sheet1.xml'/></Relationships>");
            Add("xl/worksheets/sheet1.xml", sheet.ToString());
        }
        return output.ToArray();
    }
}

public sealed class SchoolWorkbookTests
{
    [LocalSchoolWorkbookFact] public void ReadsOfficialWorkbookWithoutInventingContactsOrMergingBranches()
    {
        var folder = new DirectoryInfo(AppContext.BaseDirectory);
        while (folder is not null && !File.Exists(Path.Combine(folder.FullName, "docs", "CRM_Import_Truong_Hoc.xlsx"))) folder = folder.Parent;
        Assert.NotNull(folder);
        var parsed = SchoolWorkbookReader.Read(File.ReadAllBytes(Path.Combine(folder.FullName, "docs", "CRM_Import_Truong_Hoc.xlsx")));
        Assert.Equal(140, parsed.SchoolCount);
        Assert.Equal(176, parsed.BranchCount);
        Assert.Equal(316, parsed.Rows.Length);
        Assert.All(parsed.Rows, row => Assert.Null(row.ContactPhone));
        Assert.Contains(parsed.Warnings, x => x.Row == 224 && x.Code == "CONTACT_COLUMN_REVIEW");
        Assert.Contains(parsed.Warnings, x => x.Row == 225 && x.Code == "CONTACT_COLUMN_REVIEW");
        Assert.Contains(parsed.Warnings, x => x.Row == 31 && x.Code == "COMBINED_BRANCH");
        Assert.Equal(3, parsed.Rows.Count(x => x.SchoolCode == "SCH0138" && x.UnitType == "BRANCH"));
    }
    [Fact] public void SchoolCodeAllowsMissingTaxAndPhone() => Assert.Equal(2, SchoolWorkbookReader.Read(SchoolTestWorkbook.Create("S")).SchoolCount);
    [Fact] public void RejectsFormula() => Assert.Throws<ApiValidationException>(() => SchoolWorkbookReader.Read(SchoolTestWorkbook.Create("S", formula: true)));
    [Fact] public void RejectsWrongHeaders() => Assert.Throws<ApiValidationException>(() => SchoolWorkbookReader.Read(SchoolTestWorkbook.Create("S", invalidHeader: true)));
    [Fact] public void RejectsOrphanBranches() => Assert.Throws<ApiValidationException>(() => SchoolWorkbookReader.Read(SchoolTestWorkbook.Create("S", orphan: true)));
    [Fact] public void RejectsOversizedAndInvalidFiles()
    {
        Assert.Throws<ApiValidationException>(() => SchoolWorkbookReader.Read(new byte[SchoolWorkbookReader.MaxFileBytes + 1]));
        Assert.Throws<ApiValidationException>(() => SchoolWorkbookReader.Read([1, 2, 3]));
    }
}

public sealed class LocalSchoolWorkbookFactAttribute : FactAttribute
{
    public LocalSchoolWorkbookFactAttribute()
    {
        var folder = new DirectoryInfo(AppContext.BaseDirectory);
        while (folder is not null && !File.Exists(Path.Combine(folder.FullName, "docs", "CRM_Import_Truong_Hoc.xlsx"))) folder = folder.Parent;
        if (folder is null) Skip = "Optional local source workbook is not distributed in Git. Synthetic import tests still run.";
    }
}

public sealed class SchoolWorkflowMySqlTests(ChannelMySqlFixture fixture) : IClassFixture<ChannelMySqlFixture>
{
    private static readonly CancellationToken Ct = CancellationToken.None;
    private static string Key() => Guid.NewGuid().ToString("N");
    private static HttpContext Http() => new DefaultHttpContext();
    private async Task<long> User(string email) { await using var db = fixture.Open(); return await db.Users.Where(x => x.Email == email).Select(x => x.Id).SingleAsync(); }
    private async Task<(long UserId, long MembershipId)> Ctv()
    {
        await using var db = fixture.Open();
        var nonce = Key();
        var user = new User { Code = nonce[..20], Email = nonce + "@example.test", Name = "CTV kiểm thử", Status = "ACTIVE", Password = "unused", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.Users.Add(user); await db.SaveChangesAsync();
        var role = await db.Roles.Where(x => x.Code == "PARTNER_COLLABORATOR").Select(x => x.Id).SingleAsync();
        var org = await db.Organizations.Where(x => x.Code == "PARTNER_AN_PHAT").Select(x => x.Id).SingleAsync();
        db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role });
        var membership = new OrganizationMembership { UserId = user.Id, OrganizationId = org, MembershipType = "COLLABORATOR", IsPrimary = true, Status = "ACTIVE", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.OrganizationMemberships.Add(membership); await db.SaveChangesAsync();
        return (user.Id, membership.Id);
    }
    private static RegisterApproachRequest Claim(long customerId, string key) => new(key, customerId, null, null, null, null, null, null, null, null, null, null, null, null, "TEST", null);
    private async Task<long[]> Import(int count = 2)
    {
        var prefix = ("IT" + Key()[..12]).ToUpperInvariant();
        var workbook = SchoolWorkbookReader.Read(SchoolTestWorkbook.Create(prefix, count));
        await using var db = fixture.Open();
        await new ChannelSalesActions(db).ImportSchools(workbook, Key(), await User("admin@kidsfit.vn"), Http(), Ct);
        return await db.DirectorySchools.Where(x => x.SchoolCode.StartsWith(prefix)).OrderBy(x => x.SchoolCode).Select(x => x.CustomerId).ToArrayAsync();
    }

    [MySqlFact] public async Task ImportIsAtomicScopedAndRetrySafe()
    {
        var workbook = SchoolWorkbookReader.Read(SchoolTestWorkbook.Create("I" + Key()[..12]));
        var admin = await User("admin@kidsfit.vn");
        var requestKey = Key();
        await using var db = fixture.Open(); var action = new ChannelSalesActions(db);
        var id = await action.ImportSchools(workbook, requestKey, admin, Http(), Ct);
        Assert.Equal(id, await action.ImportSchools(workbook, requestKey, admin, Http(), Ct));
        var second = await action.ImportSchools(workbook, Key(), admin, Http(), Ct);
        Assert.Equal(0, (await db.SchoolImportBatches.FindAsync(second))!.UnitsCreated);
        Assert.Equal(2, (await db.SchoolImportBatches.FindAsync(id))!.SchoolsCreated);
        Assert.Equal(4, (await db.SchoolImportBatches.FindAsync(id))!.UnitsCreated);
        var partnerId = await User("partner@kidsfit.vn");
        await Assert.ThrowsAsync<KeyNotFoundException>(() => action.ImportSchools(workbook, Key(), partnerId, Http(), Ct));
        var changed = SchoolWorkbookReader.Read(SchoolTestWorkbook.Create("J" + Key()[..12]));
        await Assert.ThrowsAsync<ApiConflictException>(() => action.ImportSchools(changed, requestKey, admin, Http(), Ct));
    }

    [MySqlFact] public async Task ConcurrentDifferentSchoolsCannotExceedCapacityAndReplayStillWorks()
    {
        var customers = await Import(); var ctv = await Ctv(); var admin = await User("admin@kidsfit.vn");
        await using (var db = fixture.Open()) await new ChannelSalesActions(db).ChangeSchoolCapacity(ctv.MembershipId, new(1, "Kiểm tra đồng thời"), admin, Http(), Ct);
        var keys = new[] { Key(), Key() };
        async Task<(int Index, long? Id)> Attempt(int i)
        {
            await using var db = fixture.Open();
            try { return (i, await new ChannelSalesActions(db).RegisterCustomerApproach(Claim(customers[i], keys[i]), ctv.UserId, Http(), Ct)); }
            catch (ApiConflictException) { return (i, null); }
        }
        var result = await Task.WhenAll(Attempt(0), Attempt(1));
        var winner = Assert.Single(result, x => x.Id.HasValue);
        await using var check = fixture.Open(); var actions = new ChannelSalesActions(check);
        Assert.Equal(winner.Id, await actions.RegisterCustomerApproach(Claim(customers[winner.Index], keys[winner.Index]), ctv.UserId, Http(), Ct));
        Assert.Single(await check.ApproachRegistrations.Where(x => x.OwnerUserId == ctv.UserId && x.Status == "ACTIVE").ToArrayAsync());
        await actions.ChangeSchoolCapacity(ctv.MembershipId, new(0, "Giảm hạn mức, giữ quyền cũ"), admin, Http(), Ct);
        Assert.Equal("ACTIVE", (await check.ApproachRegistrations.FindAsync(winner.Id!.Value))!.Status);
        await Assert.ThrowsAsync<ApiConflictException>(() => actions.RegisterCustomerApproach(Claim(customers[1 - winner.Index], Key()), ctv.UserId, Http(), Ct));
        Assert.Equal(2, await check.SchoolCapacityChanges.CountAsync(x => x.MembershipId == ctv.MembershipId));
    }

    [MySqlFact] public async Task OnlyAdminCanChangeCapacityAndReasonIsMandatory()
    {
        var ctv = await Ctv();
        await using var db = fixture.Open(); var actions = new ChannelSalesActions(db);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => actions.ChangeSchoolCapacity(ctv.MembershipId, new(20, "Không có quyền"), ctv.UserId, Http(), Ct));
        var partner = await User("partner@kidsfit.vn");
        await Assert.ThrowsAsync<KeyNotFoundException>(() => actions.ChangeSchoolCapacity(ctv.MembershipId, new(20, "Không có quyền"), partner, Http(), Ct));
        var admin = await User("admin@kidsfit.vn");
        await Assert.ThrowsAsync<ApiValidationException>(() => actions.ChangeSchoolCapacity(ctv.MembershipId, new(20, ""), admin, Http(), Ct));
    }

    [MySqlFact] public async Task SchoolContractRequiresReviewVerificationAndExplicitKidsfitProtection()
    {
        var customerId = (await Import(1))[0]; var ctv = await Ctv();
        var admin = await User("admin@kidsfit.vn"); var partner = await User("partner@kidsfit.vn"); var checkee = await User("checkee@kidsfit.vn");
        await using var db = fixture.Open(); var actions = new ChannelSalesActions(db);
        var registration = await actions.RegisterCustomerApproach(Claim(customerId, Key()), ctv.UserId, Http(), Ct);
        var packageId = await db.CheckeeProductPackages.Select(x => x.Id).FirstAsync();
        var request = new ReportSalesContractRequest(Key(), "SC-" + Key(), ChannelSalesValidation.BusinessDate(DateTime.UtcNow), null, packageId, 1_000_000m, null, "TEST-EVIDENCE");
        var contractId = await actions.ReportSignedContract(registration, request, ctv.UserId, Http(), Ct);
        Assert.Equal(contractId, await actions.ReportSignedContract(registration, request, ctv.UserId, Http(), Ct));
        Assert.Equal("PENDING_REVIEW", (await db.SalesContracts.FindAsync(contractId))!.Status);
        Assert.False(await db.CustomerProtections.AnyAsync(x => x.ContractId == contractId));
        var reconciliation = await db.ReconciliationCases.Where(x => x.ContractId == contractId).Select(x => x.Id).SingleAsync();
        await Assert.ThrowsAsync<ApiConflictException>(() => actions.Reconcile(reconciliation, true, new(null), checkee, Http(), Ct));
        db.ChangeTracker.Clear();
        await Assert.ThrowsAsync<ApiConflictException>(() => actions.GrantSchoolProtection(contractId, admin, Http(), Ct));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => actions.ReviewSchoolContract(contractId, ctv.UserId, Http(), Ct));
        db.ChangeTracker.Clear();
        await actions.ReviewSchoolContract(contractId, partner, Http(), Ct);
        await actions.ReviewSchoolContract(contractId, partner, Http(), Ct);
        await actions.Reconcile(reconciliation, true, new("Đã xác minh"), checkee, Http(), Ct);
        Assert.False(await db.CustomerProtections.AnyAsync(x => x.ContractId == contractId));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => actions.GrantSchoolProtection(contractId, partner, Http(), Ct));
        await actions.GrantSchoolProtection(contractId, admin, Http(), Ct);
        await actions.GrantSchoolProtection(contractId, admin, Http(), Ct);
        var contract = await db.SalesContracts.FindAsync(contractId);
        Assert.Equal("ACTIVE", contract!.Status);
        Assert.Equal(contract.VerifiedAt!.Value.AddYears(5), contract.ProtectionUntil);
        Assert.Single(await db.CustomerProtections.Where(x => x.ContractId == contractId).ToArrayAsync());
        Assert.Equal("CONVERTED", (await db.ApproachRegistrations.FindAsync(registration))!.Status);
        Assert.Equal(0, await db.RevenueReceipts.CountAsync(x => x.ContractId == contractId));
    }

    [MySqlFact] public async Task UnverifiedContractCannotReceiveCashAndRequiresEvidence()
    {
        var customer = (await Import(1))[0]; var ctv = await Ctv(); var admin = await User("admin@kidsfit.vn");
        await using var db = fixture.Open(); var actions = new ChannelSalesActions(db);
        var registration = await actions.RegisterCustomerApproach(Claim(customer, Key()), ctv.UserId, Http(), Ct);
        var request = new ReportSalesContractRequest(Key(), "SC-" + Key(), ChannelSalesValidation.BusinessDate(DateTime.UtcNow), null, await db.CheckeeProductPackages.Select(x => x.Id).FirstAsync(), 1_000_000m, null, null);
        await Assert.ThrowsAsync<ApiValidationException>(() => actions.ReportSignedContract(registration, request, ctv.UserId, Http(), Ct));
        var contract = await actions.ReportSignedContract(registration, request with { EvidenceReference = "TEST" }, ctv.UserId, Http(), Ct);
        await Assert.ThrowsAsync<ApiConflictException>(() => actions.RecordRevenueReceipt(contract, new(Key(), null, 10, null, "TEST-" + Key(), "CASH"), admin, Http(), Ct));
    }

    [MySqlFact] public async Task LateAuditFailureRollsBackEntireImport()
    {
        var prefix = ("R" + Key()[..12]).ToUpperInvariant(); var workbook = SchoolWorkbookReader.Read(SchoolTestWorkbook.Create(prefix)); var admin = await User("admin@kidsfit.vn"); var key = Key();
        await using var db = fixture.Open();
        await db.Database.ExecuteSqlRawAsync("CREATE TRIGGER school_import_test_failure BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action = 'IMPORT_SCHOOL_DIRECTORY' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'test rollback'; END IF; END");
        try { await Assert.ThrowsAsync<DbUpdateException>(() => new ChannelSalesActions(db).ImportSchools(workbook, key, admin, Http(), Ct)); }
        finally { await db.Database.ExecuteSqlRawAsync("DROP TRIGGER school_import_test_failure"); }
        db.ChangeTracker.Clear();
        Assert.False(await db.DirectorySchools.AnyAsync(x => x.SchoolCode.StartsWith(prefix)));
        Assert.False(await db.SchoolImportBatches.AnyAsync(x => x.IdempotencyKey == key));
        Assert.False(await db.CustomerIdentifiers.AnyAsync(x => x.NormalizedValue.StartsWith(prefix)));
        await new ChannelSalesActions(db).ImportSchools(workbook, key, admin, Http(), Ct);
        Assert.Equal(2, await db.DirectorySchools.CountAsync(x => x.SchoolCode.StartsWith(prefix)));
    }

    [MySqlFact] public async Task ConcurrentImportsHaveOneCanonicalSetAndBoundActor()
    {
        var prefix = ("C" + Key()[..12]).ToUpperInvariant(); var workbook = SchoolWorkbookReader.Read(SchoolTestWorkbook.Create(prefix));
        var admin = await User("admin@kidsfit.vn"); var key = Key();
        async Task<long> Attempt() { await using var db = fixture.Open(); return await new ChannelSalesActions(db).ImportSchools(workbook, key, admin, Http(), Ct); }
        var results = await Task.WhenAll(Attempt(), Attempt());
        Assert.Equal(results[0], results[1]);
        await using var check = fixture.Open();
        Assert.Equal(2, await check.DirectorySchools.CountAsync(x => x.SchoolCode.StartsWith(prefix)));
        Assert.Equal(4, await check.SchoolUnits.CountAsync(x => check.DirectorySchools.Any(s => s.Id == x.DirectorySchoolId && s.SchoolCode.StartsWith(prefix))));
        var changedRows = workbook.Rows.Select(x => x.UnitType == "MAIN" ? x with { Name = "Tên khác" } : x).ToArray();
        await Assert.ThrowsAsync<ApiConflictException>(() => new ChannelSalesActions(check).ImportSchools(workbook with { Rows = changedRows }, Key(), admin, Http(), Ct));
        var accessUser = await User("manager@kidsfit.vn");
        var role = await check.Roles.Where(x => x.Code == "SALES_MANAGER").Select(x => x.Id).SingleAsync();
        var permission = await check.Permissions.Where(x => x.Code == Permissions.SchoolDirectoryManage).Select(x => x.Id).SingleAsync();
        check.PermissionRoles.Add(new PermissionRole { RoleId = role, PermissionId = permission }); await check.SaveChangesAsync();
        try { await Assert.ThrowsAsync<KeyNotFoundException>(() => new ChannelSalesActions(check).ImportSchools(workbook, key, accessUser, Http(), Ct)); }
        finally { await check.PermissionRoles.Where(x => x.RoleId == role && x.PermissionId == permission).ExecuteDeleteAsync(); }
    }

    [MySqlFact] public async Task ExpiredClaimFreesCapacityWithoutWorker()
    {
        var customers = await Import(); var ctv = await Ctv(); var admin = await User("admin@kidsfit.vn");
        await using var db = fixture.Open(); var actions = new ChannelSalesActions(db);
        await actions.ChangeSchoolCapacity(ctv.MembershipId, new(1, "Kiểm tra hết hạn"), admin, Http(), Ct);
        var first = await actions.RegisterCustomerApproach(Claim(customers[0], Key()), ctv.UserId, Http(), Ct);
        await db.ApproachRegistrations.Where(x => x.Id == first).ExecuteUpdateAsync(s => s.SetProperty(x => x.ProtectedUntil, DateTime.UtcNow.AddMinutes(-1)));
        await db.CustomerProtections.Where(x => x.ApproachRegistrationId == first).ExecuteUpdateAsync(s => s.SetProperty(x => x.EffectiveUntil, DateTime.UtcNow.AddMinutes(-1)));
        db.ChangeTracker.Clear();
        await actions.RegisterCustomerApproach(Claim(customers[1], Key()), ctv.UserId, Http(), Ct);
        Assert.Equal(1, await db.ApproachRegistrations.CountAsync(x => x.OwnerUserId == ctv.UserId && x.ProtectedUntil > DateTime.UtcNow && x.Status == "ACTIVE"));
    }

    [MySqlFact] public async Task VerificationCannotOverwriteNewOwnerAfterOldProtectionExpires()
    {
        var customer = (await Import(1))[0]; var oldOwner = await Ctv(); var newOwner = await Ctv();
        var admin = await User("admin@kidsfit.vn"); var partner = await User("partner@kidsfit.vn"); var checkee = await User("checkee@kidsfit.vn");
        await using var db = fixture.Open(); var actions = new ChannelSalesActions(db);
        var registration = await actions.RegisterCustomerApproach(Claim(customer, Key()), oldOwner.UserId, Http(), Ct);
        var contractId = await actions.ReportSignedContract(registration, new(Key(), "SC-" + Key(), ChannelSalesValidation.BusinessDate(DateTime.UtcNow), null,
            await db.CheckeeProductPackages.Select(x => x.Id).FirstAsync(), 1_000_000m, null, "TEST-EVIDENCE"), oldOwner.UserId, Http(), Ct);
        await actions.ReviewSchoolContract(contractId, partner, Http(), Ct);
        await db.ApproachRegistrations.Where(x => x.Id == registration).ExecuteUpdateAsync(s => s.SetProperty(x => x.ProtectedUntil, DateTime.UtcNow.AddMinutes(-1)));
        await db.CustomerProtections.Where(x => x.ApproachRegistrationId == registration).ExecuteUpdateAsync(s => s.SetProperty(x => x.EffectiveUntil, DateTime.UtcNow.AddMinutes(-1)));
        db.ChangeTracker.Clear();
        await actions.RegisterCustomerApproach(Claim(customer, Key()), newOwner.UserId, Http(), Ct);
        var reconciliation = await db.ReconciliationCases.Where(x => x.ContractId == contractId).Select(x => x.Id).SingleAsync();
        await actions.Reconcile(reconciliation, true, new(null), checkee, Http(), Ct);
        await Assert.ThrowsAsync<ApiConflictException>(() => actions.GrantSchoolProtection(contractId, admin, Http(), Ct));
        Assert.False(await db.CustomerProtections.AnyAsync(x => x.ContractId == contractId));
        Assert.Equal(newOwner.UserId, await db.CustomerProtections.Where(x => x.CustomerId == customer && x.Status == "ACTIVE" && x.EffectiveUntil > DateTime.UtcNow).Select(x => x.OwnerUserId).SingleAsync());
    }

    [MySqlFact] public async Task DirectoryQueriesPaginateAndDoNotExposeUnassignedContacts()
    {
        var prefix = ("Q" + Key()[..12]).ToUpperInvariant();
        var workbook = SchoolWorkbookReader.Read(SchoolTestWorkbook.Create(prefix, 22));
        var admin = await User("admin@kidsfit.vn"); var ctv = await Ctv(); var peer = await Ctv();
        await using var db = fixture.Open();
        await new ChannelSalesActions(db).ImportSchools(workbook, Key(), admin, Http(), Ct);
        HttpContext AsUser(long id) => new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, id.ToString())], "test")) };
        JsonElement Json(IResult result) => JsonSerializer.SerializeToElement(((IValueHttpResult)result).Value, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower });
        var page = Json(await SchoolEndpoints.List(AsUser(ctv.UserId), db, prefix, 2, Ct));
        Assert.Equal(22, page.GetProperty("total").GetInt32());
        Assert.Equal(2, page.GetProperty("data").GetArrayLength());
        var item = page.GetProperty("data")[0];
        Assert.Equal(1, item.GetProperty("branches").GetInt32());
        var schoolId = item.GetProperty("id").GetInt64();
        var customerId = item.GetProperty("customer_id").GetInt64();
        var before = Json(await SchoolEndpoints.Detail(schoolId, AsUser(ctv.UserId), db, Ct));
        Assert.All(before.GetProperty("units").EnumerateArray(), unit => Assert.Equal(JsonValueKind.Null, unit.GetProperty("contact_name").ValueKind));
        await new ChannelSalesActions(db).RegisterCustomerApproach(Claim(customerId, Key()), ctv.UserId, Http(), Ct);
        var owned = Json(await SchoolEndpoints.Detail(schoolId, AsUser(ctv.UserId), db, Ct));
        Assert.Equal("Đầu mối kiểm thử", owned.GetProperty("units")[0].GetProperty("contact_name").GetString());
        Assert.True(owned.GetProperty("can_report_contract").GetBoolean());
        var hidden = Json(await SchoolEndpoints.Detail(schoolId, AsUser(peer.UserId), db, Ct));
        Assert.All(hidden.GetProperty("units").EnumerateArray(), unit => Assert.Equal(JsonValueKind.Null, unit.GetProperty("contact_name").ValueKind));
        Assert.Equal(JsonValueKind.Null, hidden.GetProperty("registration_id").ValueKind);
        Assert.Equal(0, hidden.GetProperty("activities").GetArrayLength());
        var filtered = Json(await SchoolEndpoints.List(AsUser(ctv.UserId), db, "not-a-real-school-" + Key(), 1, Ct));
        Assert.Equal(0, filtered.GetProperty("total").GetInt32());
    }
}

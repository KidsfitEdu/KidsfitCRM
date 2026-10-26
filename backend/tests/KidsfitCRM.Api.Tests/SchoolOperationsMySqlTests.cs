using System.Security.Claims;
using System.Text.Json;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using MySql.Data.MySqlClient;

namespace KidsfitCRM.Api.Tests;

[Collection("MySQLIntegration")]
public sealed class SchoolOperationsMySqlTests(ChannelMySqlFixture fixture) : IClassFixture<ChannelMySqlFixture>
{
    private static readonly CancellationToken Ct = CancellationToken.None;
    private static string Key() => Guid.NewGuid().ToString("N");
    private static HttpContext Http(long? user = null) => new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(user.HasValue ? [new Claim(ClaimTypes.NameIdentifier, user.Value.ToString())] : [], "test")) };
    private static JsonElement Json(IResult result) => JsonSerializer.SerializeToElement(((IValueHttpResult)result).Value, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower });
    private async Task<long> User(string email) { await using var db = fixture.Open(); return await db.Users.Where(x => x.Email == email).Select(x => x.Id).SingleAsync(); }
    private sealed record Member(long UserId, long MembershipId);
    private sealed record Scenario(long OrgId, Member Manager, Member Seller, Member Peer, long SchoolId, long CustomerId, long OtherSchoolId, long OtherCustomerId, byte[] Workbook);
    private async Task<Member> AddMember(long orgId, string roleCode, string type, long? managerId = null)
    {
        await using var db = fixture.Open(); var key = Key();
        var user = new User { Code = key[..20], Name = "Nhân sự kiểm thử " + key[..6], Email = key + "@example.test", Password = "unused", Status = "ACTIVE" };
        db.Users.Add(user); await db.SaveChangesAsync();
        db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = await db.Roles.Where(x => x.Code == roleCode).Select(x => x.Id).SingleAsync() });
        var member = new OrganizationMembership { UserId = user.Id, OrganizationId = orgId, MembershipType = type, ManagerUserId = managerId, IsPrimary = true };
        db.OrganizationMemberships.Add(member); await db.SaveChangesAsync(); return new(user.Id, member.Id);
    }
    private async Task<Scenario> Arrange()
    {
        await using var db = fixture.Open();
        var org = new Organization { Code = "T-" + Key(), Name = "Tổ chức kiểm thử", OrganizationType = "PARTNER", CommissionRateCeiling = 15 };
        db.Organizations.Add(org); await db.SaveChangesAsync();
        db.CommissionPolicyVersions.Add(new CommissionPolicyVersion { OrganizationId = org.Id, Code = "TC-" + Key(), Name = "Chính sách kiểm thử",
            RatePercent = 10, EffectiveFrom = ChannelSalesValidation.BusinessDate(DateTime.UtcNow).AddYears(-1), CreatedByUserId = await User("admin@kidsfit.vn") });
        await db.SaveChangesAsync();
        var manager = await AddMember(org.Id, "PARTNER_ADMIN", "PARTNER_ADMIN");
        var seller = await AddMember(org.Id, "PARTNER_COLLABORATOR", "COLLABORATOR", manager.UserId);
        var peer = await AddMember(org.Id, "PARTNER_COLLABORATOR", "COLLABORATOR", manager.UserId);
        var prefix = "OP" + Key()[..12].ToUpperInvariant(); var workbook = SchoolTestWorkbook.Create(prefix);
        await new ChannelSalesActions(db).ImportSchools(SchoolWorkbookReader.Read(workbook), Key(), await User("admin@kidsfit.vn"), Http(), Ct);
        var schools = await db.DirectorySchools.Where(x => x.SchoolCode.StartsWith(prefix)).OrderBy(x => x.SchoolCode).ToArrayAsync();
        return new(org.Id, manager, seller, peer, schools[0].Id, schools[0].CustomerId, schools[1].Id, schools[1].CustomerId, workbook);
    }
    private static RegisterApproachRequest Claim(long customerId, string? key = null) => new(key ?? Key(), customerId, null, null, null, null, null, null, null, null, null, null, null, null, "TEST", null);
    private static CreateSchoolProposalRequest Proposal() => new(Key(), "PR-" + Key().ToUpperInvariant(), "Trường kiểm thử " + Key(), "Tỉnh kiểm thử", "Phường kiểm thử", null, "Liên hệ kiểm thử", null, null, "contact@example.test", "Bổ sung danh bạ", DateTime.UtcNow.AddHours(24));
    private static RequestSchoolExtensionRequest Extension(DateTime until) => new(Key(), until, DateTime.UtcNow.AddHours(12), DateTime.UtcNow.AddDays(1), "Đã tư vấn và xác nhận lịch hẹn", "TEST-APPOINTMENT");
    private async Task<long> Policy(long orgId, bool activate = true)
    {
        await using var db = fixture.Open();
        return await new ChannelSalesActions(db).CreateSchoolWorkflowPolicy(new(orgId, 24, 48, 24, 7, 2, 14, activate, "TEST-APPROVAL-" + Key()), await User("admin@kidsfit.vn"), Http(), Ct);
    }
    private async Task<long> ActiveContract(Scenario s)
    {
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var registration = await a.RegisterCustomerApproach(Claim(s.CustomerId), s.Seller.UserId, Http(), Ct);
        var contract = await a.ReportSignedContract(registration, new(Key(), "TEST-" + Key(), ChannelSalesValidation.BusinessDate(DateTime.UtcNow), null,
            await db.CheckeeProductPackages.Select(x => x.Id).FirstAsync(), 1_000_000, null, "TEST-CONTRACT"), s.Seller.UserId, Http(), Ct);
        await a.ReviewSchoolContract(contract, s.Manager.UserId, Http(), Ct);
        await a.Reconcile(await db.ReconciliationCases.Where(x => x.ContractId == contract).Select(x => x.Id).SingleAsync(), true, new("Kiểm thử xác minh"), await User("checkee@kidsfit.vn"), Http(), Ct);
        await a.GrantSchoolProtection(contract, await User("admin@kidsfit.vn"), Http(), Ct); return contract;
    }

    [MySqlFact] public async Task ActualDatabaseUsesBinaryKeysAndWholeDongNotOnlyModelAnnotations()
    {
        await using var connection = new MySqlConnection(fixture.ConnectionString); await connection.OpenAsync();
        foreach (var table in new[] { "school_proposals", "school_invitations", "school_extension_requests", "revenue_refunds", "approach_registrations", "sales_contracts", "revenue_receipts", "payouts" })
        {
            await using var command = new MySqlCommand("SELECT COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @table AND COLUMN_NAME = 'idempotency_key'", connection);
            command.Parameters.AddWithValue("@table", table);
            Assert.Equal("utf8mb4_bin", Convert.ToString(await command.ExecuteScalarAsync()));
        }
        await using var money = new MySqlCommand("SELECT NUMERIC_SCALE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'revenue_refunds' AND COLUMN_NAME = 'amount'", connection);
        Assert.Equal(0, Convert.ToInt32(await money.ExecuteScalarAsync()));
        var s = await Arrange(); await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var prefix = "Case-" + Key();
        var first = await a.SubmitSchoolProposal(Proposal() with { IdempotencyKey = prefix + "A" }, s.Seller.UserId, Http(), Ct);
        var second = await a.SubmitSchoolProposal(Proposal() with { IdempotencyKey = prefix + "a" }, s.Seller.UserId, Http(), Ct);
        Assert.NotEqual(first, second);
    }

    [MySqlFact] public async Task ProposalMustPassManagerAndAdminAndRetryCannotCreateDuplicateSchool()
    {
        var s = await Arrange(); var request = Proposal(); var admin = await User("admin@kidsfit.vn");
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var id = await a.SubmitSchoolProposal(request, s.Seller.UserId, Http(), Ct);
        Assert.Equal(id, await a.SubmitSchoolProposal(request, s.Seller.UserId, Http(), Ct));
        await Assert.ThrowsAsync<ApiConflictException>(() => a.SubmitSchoolProposal(request with { Name = "Nội dung khác" }, s.Seller.UserId, Http(), Ct));
        await Assert.ThrowsAsync<ApiConflictException>(() => a.ReviewSchoolProposal(id, new(true, "Chưa qua quản lý", null), true, admin, Http(), Ct));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => a.ReviewSchoolProposal(id, new(true, "Không có quyền", DateTime.UtcNow.AddDays(2)), false, s.Peer.UserId, Http(), Ct));
        await a.ReviewSchoolProposal(id, new(true, "Đã kiểm tra", DateTime.UtcNow.AddDays(2)), false, s.Manager.UserId, Http(), Ct);
        var decision = new ReviewSchoolProposalRequest(true, "Đồng ý bổ sung danh bạ", null);
        await a.ReviewSchoolProposal(id, decision, true, admin, Http(), Ct);
        await a.ReviewSchoolProposal(id, decision, true, admin, Http(), Ct);
        Assert.Single(await db.DirectorySchools.Where(x => x.SchoolCode == request.SchoolCode).ToArrayAsync());
        var proposal = await db.SchoolProposals.FindAsync(id);
        Assert.Equal("APPROVED", proposal!.Status);
        var customerId = await db.DirectorySchools.Where(x => x.Id == proposal.DirectorySchoolId).Select(x => x.CustomerId).SingleAsync();
        Assert.False(await db.CustomerProtections.AnyAsync(x => x.CustomerId == customerId));
        Assert.Equal(3, await db.AuditLogs.CountAsync(x => x.EntityType == nameof(SchoolProposal) && x.EntityId == id));
    }

    [MySqlFact] public async Task SameSchoolNameNeedsHumanDuplicateReviewRatherThanBecomingGlobalIdentity()
    {
        var s = await Arrange(); var admin = await User("admin@kidsfit.vn");
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var main = await db.SchoolUnits.AsNoTracking().SingleAsync(x => x.DirectorySchoolId == s.SchoolId && x.UnitType == "MAIN");
        var proposal = await a.SubmitSchoolProposal(Proposal() with { Name = main.Name, Province = main.Province, Ward = main.Ward }, s.Seller.UserId, Http(), Ct);
        await a.ReviewSchoolProposal(proposal, new(true, "Chuyển xác minh trường cùng tên", DateTime.UtcNow.AddDays(1)), false, s.Manager.UserId, Http(), Ct);
        await Assert.ThrowsAsync<ApiConflictException>(() => a.ReviewSchoolProposal(proposal, new(true, "Chưa xác minh danh tính", null), true, admin, Http(), Ct));
        await a.ReviewSchoolProposal(proposal, new(true, "Đã đối chiếu mã và xác minh hai đơn vị khác nhau", null, true), true, admin, Http(), Ct);
        Assert.Equal(2, await db.SchoolUnits.CountAsync(x => x.UnitType == "MAIN" && x.Name == main.Name && x.Province == main.Province && x.Ward == main.Ward));
    }

    [MySqlFact] public async Task ApprovedProposalCanReceiveMatchingImportAndBranchesWithoutDuplicateMainUnit()
    {
        var s = await Arrange(); var admin = await User("admin@kidsfit.vn");
        var workbook = SchoolWorkbookReader.Read(SchoolTestWorkbook.Create("NEW" + Key()[..10].ToUpperInvariant(), 1));
        var main = workbook.Rows.Single(x => x.UnitType == "MAIN");
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var proposal = await a.SubmitSchoolProposal(new(Key(), main.SchoolCode, main.Name, main.Province, main.Ward, main.Address,
            main.ContactName, main.ContactPosition, main.ContactPhone, main.Email, "Đề xuất bổ sung trường", DateTime.UtcNow.AddDays(1)), s.Seller.UserId, Http(), Ct);
        await a.ReviewSchoolProposal(proposal, new(true, "Đã kiểm tra", DateTime.UtcNow.AddDays(1)), false, s.Manager.UserId, Http(), Ct);
        await a.ReviewSchoolProposal(proposal, new(true, "Duyệt chính thức", null), true, admin, Http(), Ct);
        var batch = await a.ImportSchools(workbook, Key(), admin, Http(), Ct);
        Assert.Equal(0, (await db.SchoolImportBatches.FindAsync(batch))!.SchoolsCreated);
        Assert.Equal(1, (await db.SchoolImportBatches.FindAsync(batch))!.UnitsCreated);
        var school = await db.DirectorySchools.SingleAsync(x => x.SchoolCode == main.SchoolCode);
        Assert.Equal(1, await db.SchoolUnits.CountAsync(x => x.DirectorySchoolId == school.Id && x.UnitType == "MAIN"));
        Assert.Equal(1, await db.SchoolUnits.CountAsync(x => x.DirectorySchoolId == school.Id && x.UnitType == "BRANCH"));
    }

    [MySqlFact] public async Task InvitationRequiresAssigneeResponseAndDeclineReleasesItForReallocation()
    {
        var s = await Arrange(); await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var invitation = await a.InviteSchoolCollaborator(new(Key(), s.SchoolId, s.OrgId, s.Seller.UserId, "Phù hợp địa bàn", DateTime.UtcNow.AddDays(1)), s.Manager.UserId, Http(), Ct);
        Assert.False(await db.CustomerProtections.AnyAsync(x => x.CustomerId == s.CustomerId));
        await Assert.ThrowsAsync<KeyNotFoundException>(() => a.RespondSchoolInvitation(invitation, new(true, null), s.Peer.UserId, Http(), Ct));
        await Assert.ThrowsAsync<ApiValidationException>(() => a.RespondSchoolInvitation(invitation, new(false, ""), s.Seller.UserId, Http(), Ct));
        await a.RespondSchoolInvitation(invitation, new(false, "Ở xa"), s.Seller.UserId, Http(), Ct);
        var next = await a.InviteSchoolCollaborator(new(Key(), s.SchoolId, s.OrgId, s.Peer.UserId, "Phân bổ sau phản hồi", DateTime.UtcNow.AddDays(1)), s.Manager.UserId, Http(), Ct);
        var registration = await a.RespondSchoolInvitation(next, new(true, null), s.Peer.UserId, Http(), Ct);
        Assert.Equal(registration, await a.RespondSchoolInvitation(next, new(true, null), s.Peer.UserId, Http(), Ct));
        Assert.Equal(s.Peer.UserId, (await db.ApproachRegistrations.FindAsync(registration))!.OwnerUserId);
        Assert.Single(await db.CustomerProtections.Where(x => x.CustomerId == s.CustomerId && x.Status == "ACTIVE").ToArrayAsync());
    }

    [MySqlFact] public async Task ConcurrentAcceptancesForDifferentSchoolsShareOneCapacityLimit()
    {
        var s = await Arrange(); var admin = await User("admin@kidsfit.vn"); long first, second;
        await using (var db = fixture.Open())
        {
            var a = new ChannelSalesActions(db);
            await a.ChangeSchoolCapacity(s.Seller.MembershipId, new(1, "Kiểm thử hạn mức"), admin, Http(), Ct);
            first = await a.InviteSchoolCollaborator(new(Key(), s.SchoolId, s.OrgId, s.Seller.UserId, "Khu vực phù hợp", DateTime.UtcNow.AddDays(1)), s.Manager.UserId, Http(), Ct);
            second = await a.InviteSchoolCollaborator(new(Key(), s.OtherSchoolId, s.OrgId, s.Seller.UserId, "Khu vực phù hợp", DateTime.UtcNow.AddDays(1)), s.Manager.UserId, Http(), Ct);
        }
        async Task<bool> Accept(long id) { await using var db = fixture.Open(); try { await new ChannelSalesActions(db).RespondSchoolInvitation(id, new(true, null), s.Seller.UserId, Http(), Ct); return true; } catch (ApiConflictException) { return false; } }
        var results = await Task.WhenAll(Accept(first), Accept(second));
        Assert.Single(results, x => x);
        await using var check = fixture.Open();
        Assert.Equal(1, await check.ApproachRegistrations.CountAsync(x => x.OwnerUserId == s.Seller.UserId && x.Status == "ACTIVE"));
        Assert.Equal(1, await check.SchoolInvitations.CountAsync(x => x.AssigneeUserId == s.Seller.UserId && x.Status == "ACCEPTED"));
    }

    [MySqlFact] public async Task PendingExtensionDoesNotHoldExpiredRightsOrOverwriteNewOwner()
    {
        var s = await Arrange(); await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var registration = await a.RegisterCustomerApproach(Claim(s.CustomerId), s.Seller.UserId, Http(), Ct);
        var original = (await db.ApproachRegistrations.FindAsync(registration))!.ProtectedUntil;
        var extension = await a.RequestSchoolExtension(registration, Extension(original.AddDays(7)), s.Seller.UserId, Http(), Ct);
        Assert.Equal(original, (await db.ApproachRegistrations.FindAsync(registration))!.ProtectedUntil);
        await db.ApproachRegistrations.Where(x => x.Id == registration).ExecuteUpdateAsync(v => v.SetProperty(x => x.ProtectedUntil, DateTime.UtcNow.AddMinutes(-1)));
        await db.CustomerProtections.Where(x => x.ApproachRegistrationId == registration).ExecuteUpdateAsync(v => v.SetProperty(x => x.EffectiveUntil, DateTime.UtcNow.AddMinutes(-1)));
        db.ChangeTracker.Clear();
        await a.RegisterCustomerApproach(Claim(s.CustomerId), s.Peer.UserId, Http(), Ct);
        await Assert.ThrowsAsync<ApiConflictException>(() => a.ReviewSchoolExtension(extension, new(true, original.AddDays(7), DateTime.UtcNow.AddDays(1), "Đến muộn"), s.Manager.UserId, Http(), Ct));
        Assert.Equal(s.Peer.UserId, await db.CustomerProtections.Where(x => x.CustomerId == s.CustomerId && x.Status == "ACTIVE").Select(x => x.OwnerUserId).SingleAsync());
        Assert.False(await db.SalesContracts.AnyAsync(x => x.CustomerId == s.CustomerId));
    }

    [MySqlFact] public async Task DraftPolicyCannotApproveExtensionAndActivePolicyEnforcesBoundsAndRetries()
    {
        var s = await Arrange(); await Policy(s.OrgId, false);
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var registration = await a.RegisterCustomerApproach(Claim(s.CustomerId), s.Seller.UserId, Http(), Ct);
        var original = (await db.ApproachRegistrations.FindAsync(registration))!.ProtectedUntil;
        var id = await a.RequestSchoolExtension(registration, Extension(original.AddDays(8)), s.Seller.UserId, Http(), Ct);
        var approved = new ReviewSchoolExtensionRequest(true, original.AddDays(7), DateTime.UtcNow.AddDays(1), "Duyệt có lịch rà soát");
        await Assert.ThrowsAsync<ApiConflictException>(() => a.ReviewSchoolExtension(id, approved, s.Manager.UserId, Http(), Ct));
        Assert.Equal(original, (await db.ApproachRegistrations.FindAsync(registration))!.ProtectedUntil);
        var policyId = await Policy(s.OrgId);
        await Assert.ThrowsAsync<ApiValidationException>(() => a.ReviewSchoolExtension(id, approved with { ApprovedUntil = original.AddDays(8) }, s.Manager.UserId, Http(), Ct));
        await a.ReviewSchoolExtension(id, approved, s.Manager.UserId, Http(), Ct);
        await a.ReviewSchoolExtension(id, approved, s.Manager.UserId, Http(), Ct);
        Assert.Equal(policyId, (await db.SchoolExtensionRequests.FindAsync(id))!.PolicyVersionId);
        var storedUntil = await db.ApproachRegistrations.Where(x => x.Id == registration).Select(x => x.ProtectedUntil).SingleAsync();
        Assert.InRange((original.AddDays(7) - storedUntil).Ticks, 0, 9);
        Assert.Equal(storedUntil, await db.CustomerProtections.Where(x => x.ApproachRegistrationId == registration && x.Status == "ACTIVE").Select(x => x.EffectiveUntil).SingleAsync());
        Assert.Single(await db.AuditLogs.Where(x => x.EntityType == nameof(SchoolExtensionRequest) && x.EntityId == id && x.Action == "REVIEW_SCHOOL_EXTENSION").ToArrayAsync());
    }

    [MySqlFact] public async Task ProposalWorkspaceScopesContactsAndBoardReceivesOverdueWork()
    {
        var s = await Arrange(); var board = await User("board@kidsfit.vn");
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var own = await a.SubmitSchoolProposal(Proposal(), s.Seller.UserId, Http(), Ct);
        await a.SubmitSchoolProposal(Proposal(), s.Peer.UserId, Http(), Ct);
        var data = Json(await SchoolOperationsEndpoints.Workspace(Http(s.Seller.UserId), db, Ct));
        Assert.Single(data.GetProperty("proposals").EnumerateArray());
        Assert.Equal(own, data.GetProperty("proposals")[0].GetProperty("id").GetInt64());
        Assert.Empty(data.GetProperty("team").EnumerateArray());
        await Assert.ThrowsAsync<KeyNotFoundException>(() => a.ReviewSchoolProposal(own, new(true, "Chưa quá hạn", DateTime.UtcNow.AddDays(1)), false, board, Http(), Ct));
        await db.SchoolProposals.Where(x => x.Id == own).ExecuteUpdateAsync(v => v.SetProperty(x => x.ReviewDueAt, DateTime.UtcNow.AddMinutes(-1)));
        db.ChangeTracker.Clear();
        var leadership = Json(await SchoolOperationsEndpoints.Workspace(Http(board), db, Ct));
        Assert.True(leadership.GetProperty("proposals").EnumerateArray().Single(x => x.GetProperty("id").GetInt64() == own).GetProperty("can_manager_review").GetBoolean());
        await a.ReviewSchoolProposal(own, new(true, "Xử lý hồ sơ quá hạn", DateTime.UtcNow.AddDays(1)), false, board, Http(), Ct);
        Assert.Equal("PENDING_ADMIN", (await db.SchoolProposals.FindAsync(own))!.Status);
        var report = Json(await SchoolOperationsEndpoints.Report(Http(board), db, null, Ct));
        Assert.True(report.GetProperty("available_schools").GetInt32() >= 2);
    }

    [MySqlFact] public async Task HandoverRevokesUnsignedClaimsButPreservesSignedProtectionAndEarnedPayout()
    {
        var s = await Arrange(); var contractId = await ActiveContract(s); var admin = await User("admin@kidsfit.vn");
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var unsigned = await a.RegisterCustomerApproach(Claim(s.OtherCustomerId), s.Seller.UserId, Http(), Ct);
        await a.RecordRevenueReceipt(contractId, new(Key(), null, 1_000_000, null, "RC-" + Key(), "BANK_TRANSFER"), admin, Http(), Ct);
        var ledgerBefore = await db.CommissionLedgerEntries.Where(x => x.ContractId == contractId).Select(x => x.Amount).SingleAsync();
        var request = new CompleteSchoolHandoverRequest(Key(), "Ngưng hợp tác", "Đã bàn giao lịch demo và các cam kết; hồ sơ hợp đồng giữ nguyên.", false);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => a.CompleteSchoolHandover(s.Seller.MembershipId, request with { SuspendAccount = true }, s.Manager.UserId, Http(), Ct));
        Assert.Equal("ACTIVE", await db.ApproachRegistrations.Where(x => x.Id == unsigned).Select(x => x.Status).SingleAsync());
        var id = await a.CompleteSchoolHandover(s.Seller.MembershipId, request, s.Manager.UserId, Http(), Ct);
        Assert.Equal(id, await a.CompleteSchoolHandover(s.Seller.MembershipId, request, s.Manager.UserId, Http(), Ct));
        Assert.Equal(1, (await db.SchoolHandovers.FindAsync(id))!.RevokedRegistrations);
        Assert.Equal("REVOKED", await db.ApproachRegistrations.Where(x => x.Id == unsigned).Select(x => x.Status).SingleAsync());
        Assert.True(await db.CustomerProtections.AnyAsync(x => x.ContractId == contractId && x.Status == "ACTIVE"));
        Assert.Equal(ledgerBefore, await db.CommissionLedgerEntries.Where(x => x.ContractId == contractId).Select(x => x.Amount).SingleAsync());
        await Assert.ThrowsAsync<KeyNotFoundException>(() => a.RegisterCustomerApproach(Claim(s.OtherCustomerId), s.Seller.UserId, Http(), Ct));
        var payout = await a.CreatePayout(new(Key(), s.OrgId, s.Seller.UserId, ChannelSalesValidation.BusinessPeriod(DateTime.UtcNow), 0, null), admin, Http(), Ct);
        await a.ApprovePayout(payout, admin, Http(), Ct);
        await a.CompletePayout(payout, new("PAY-" + Key(), "Quyết toán hoa hồng hợp lệ sau nghỉ"), admin, Http(), Ct);
        Assert.Equal("PAID", (await db.Payouts.FindAsync(payout))!.Status);
    }

    [MySqlFact] public async Task UnitCorrectionChecksVersionKeepsPrivateRevisionAndDoesNotOverwriteOnReimport()
    {
        var s = await Arrange(); var admin = await User("admin@kidsfit.vn");
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var unit = await db.SchoolUnits.AsNoTracking().SingleAsync(x => x.DirectorySchoolId == s.SchoolId && x.UnitType == "MAIN");
        var request = new UpdateSchoolUnitRequest(0, unit.Name, unit.Province, "Phường đã xác minh", unit.Address,
            "Đầu mối kiểm thử riêng tư", "Hiệu trưởng", "0900000000", "contact@example.test", null, "Đã rà soát nguồn", "Sửa theo xác nhận");
        await Assert.ThrowsAsync<KeyNotFoundException>(() => a.UpdateSchoolUnit(unit.Id, request, s.Manager.UserId, Http(), Ct));
        await a.UpdateSchoolUnit(unit.Id, request, admin, Http(), Ct);
        await Assert.ThrowsAsync<ApiConflictException>(() => a.UpdateSchoolUnit(unit.Id, request with { Ward = "Ghi đè cũ" }, admin, Http(), Ct));
        var revision = await db.SchoolUnitRevisions.SingleAsync(x => x.SchoolUnitId == unit.Id);
        Assert.Contains("ContactName", revision.AfterValues);
        var audit = await db.AuditLogs.SingleAsync(x => x.EntityType == nameof(SchoolUnit) && x.EntityId == unit.Id);
        Assert.DoesNotContain("0900000000", audit.NewValues);
        Assert.DoesNotContain("ContactName", audit.NewValues);
        var batch = await a.ImportSchools(SchoolWorkbookReader.Read(s.Workbook), Key(), admin, Http(), Ct);
        Assert.Equal(0, (await db.SchoolImportBatches.FindAsync(batch))!.UnitsCreated);
        Assert.Equal("Phường đã xác minh", await db.SchoolUnits.Where(x => x.Id == unit.Id).Select(x => x.Ward).SingleAsync());
        Assert.Equal(unit.ContentHash, await db.SchoolUnits.Where(x => x.Id == unit.Id).Select(x => x.ContentHash).SingleAsync());
    }

    [MySqlFact] public async Task CustomerCareHandoverPreservesActivityAndDoesNotTransferSalesOwnership()
    {
        var s = await Arrange(); var contractId = await ActiveContract(s);
        var first = await AddMember(s.OrgId, "CUSTOMER_CARE", "CUSTOMER_CARE");
        var second = await AddMember(s.OrgId, "CUSTOMER_CARE", "CUSTOMER_CARE");
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        await a.AssignContractCare(contractId, new(Key(), first.UserId, s.OrgId, "Bàn giao hợp đồng đã xác minh"), s.Manager.UserId, Http(), Ct);
        var ticket = await a.CreateCustomerSupportCase(new(Key(), contractId, "Hướng dẫn vận hành", "Khách cần hướng dẫn sử dụng"), first.UserId, Http(), Ct);
        await a.UpdateCustomerSupportCase(ticket, new("IN_PROGRESS", "Đã liên hệ, hẹn đào tạo", DateTime.UtcNow.AddDays(1)), first.UserId, Http(), Ct);
        var handover = new AssignContractCareRequest(Key(), second.UserId, s.OrgId, "Đổi người chăm sóc, giữ lịch đào tạo");
        await a.AssignContractCare(contractId, handover, s.Manager.UserId, Http(), Ct);
        await a.AssignContractCare(contractId, handover, s.Manager.UserId, Http(), Ct);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => a.UpdateCustomerSupportCase(ticket, new("RESOLVED", "Không còn phụ trách", null), first.UserId, Http(), Ct));
        await a.UpdateCustomerSupportCase(ticket, new("RESOLVED", "Đã đào tạo và khách xác nhận", null), second.UserId, Http(), Ct);
        Assert.Equal(s.Seller.UserId, await db.SalesContracts.Where(x => x.Id == contractId).Select(x => x.OwnerUserId).SingleAsync());
        Assert.Equal(2, await db.CustomerActivities.CountAsync(x => x.SupportCaseId == ticket));
        var workspace = Json(await SchoolOperationsEndpoints.Workspace(Http(second.UserId), db, Ct));
        Assert.Equal("Đã đào tạo và khách xác nhận", workspace.GetProperty("support_cases")[0].GetProperty("outcome").GetString());
        Assert.Empty(workspace.GetProperty("receipts").EnumerateArray());
        Assert.Empty(workspace.GetProperty("refunds").EnumerateArray());
    }

    [MySqlFact] public async Task ConcurrentRefundsCannotExceedReceiptAndCancellationNeverDeletesLedgerOrReactivatesContract()
    {
        var s = await Arrange(); var contractId = await ActiveContract(s); var admin = await User("admin@kidsfit.vn");
        long receipt;
        await using (var db = fixture.Open()) receipt = await new ChannelSalesActions(db).RecordRevenueReceipt(contractId, new(Key(), null, 1_000_000, null, "RC-" + Key(), "BANK_TRANSFER"), admin, Http(), Ct);
        async Task<long?> Refund()
        {
            await using var db = fixture.Open();
            try { return await new ChannelSalesActions(db).RecordRevenueRefund(receipt, new(Key(), 750_000, null, "RF-" + Key(), "Hoàn một phần", "TEST-APPROVAL"), admin, Http(), Ct); }
            catch (ApiConflictException) { return null; }
        }
        Assert.Single(await Task.WhenAll(Refund(), Refund()), x => x.HasValue);
        await using var check = fixture.Open(); var a = new ChannelSalesActions(check);
        Assert.Equal(1_000_000, await check.RevenueReceipts.Where(x => x.Id == receipt).Select(x => x.Amount).SingleAsync());
        Assert.Equal(100_000, await check.CommissionLedgerEntries.Where(x => x.ContractId == contractId).Select(x => x.Amount).SingleAsync());
        var finance = Json(await ChannelSalesOperationsEndpoints.Finance(Http(s.Seller.UserId), check, null, Ct));
        Assert.Equal(250_000, finance.GetProperty("summary").GetProperty("net_collected_revenue").GetDecimal());
        var cancellation = new CancelSalesContractRequest(Key(), "Chấm dứt theo quyết định", "TEST-CANCELLATION");
        var id = await a.CancelSalesContract(contractId, cancellation, admin, Http(), Ct);
        Assert.Equal(id, await a.CancelSalesContract(contractId, cancellation, admin, Http(), Ct));
        await Assert.ThrowsAsync<ApiConflictException>(() => a.RecordRevenueReceipt(contractId, new(Key(), null, 1, null, "RC-" + Key(), "BANK_TRANSFER"), admin, Http(), Ct));
        var reconciliation = await check.ReconciliationCases.Where(x => x.ContractId == contractId).Select(x => x.Id).SingleAsync();
        await a.Reconcile(reconciliation, true, new("Đã rà soát quyết toán"), await User("checkee@kidsfit.vn"), Http(), Ct);
        Assert.Equal("CANCELLED", await check.SalesContracts.Where(x => x.Id == contractId).Select(x => x.Status).SingleAsync());
        Assert.False(await check.CustomerProtections.AnyAsync(x => x.ContractId == contractId && x.Status == "ACTIVE"));
        Assert.Single(await check.RevenueRefunds.Where(x => x.ContractId == contractId).ToArrayAsync());
        Assert.Single(await check.CommissionLedgerEntries.Where(x => x.ContractId == contractId).ToArrayAsync());
    }

    [MySqlFact] public async Task DisputeDecisionCannotTakeCurrentOwnersRightsOrCreateOldOwnersCommission()
    {
        var s = await Arrange(); var board = await User("board@kidsfit.vn");
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        await a.RegisterCustomerApproach(Claim(s.CustomerId), s.Peer.UserId, Http(), Ct);
        var id = await a.OpenSchoolDispute(new(Key(), s.CustomerId, "Phản ánh quyền tiếp cận", "TEST-TIMELINE"), s.Seller.UserId, Http(), Ct);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => a.ResolveSchoolDispute(id, new("UPHOLD_CURRENT_RIGHTS", "Tự kết luận"), s.Seller.UserId, Http(), Ct));
        await a.ResolveSchoolDispute(id, new("UPHOLD_CURRENT_RIGHTS", "Giữ quyền đăng ký mới hợp lệ"), board, Http(), Ct);
        Assert.Equal(s.Peer.UserId, await db.CustomerProtections.Where(x => x.CustomerId == s.CustomerId && x.Status == "ACTIVE").Select(x => x.OwnerUserId).SingleAsync());
        Assert.False(await db.CommissionLedgerEntries.AnyAsync(x => x.BeneficiaryUserId == s.Seller.UserId));
    }

    [MySqlFact] public async Task QueuePaginationKeepsOldOverdueWorkVisibleAndSearchCannotBypassScope()
    {
        var s = await Arrange(); var prefix = "PAGE-" + Key(); var now = DateTime.UtcNow;
        await using var db = fixture.Open();
        SchoolProposal Row(string name, string status, long owner, DateTime created, DateTime due) => new()
        {
            OrganizationId = s.OrgId, SubmittedByUserId = owner, ManagerUserId = s.Manager.UserId, SchoolCode = "PG-" + Key().ToUpperInvariant(),
            Name = name, Province = "Tỉnh kiểm thử", Ward = "Phường kiểm thử", Reason = "Kiểm thử phân trang",
            Status = status, ReviewDueAt = due, IdempotencyKey = Key(), RequestFingerprint = new string('A', 64), CreatedAt = created, UpdatedAt = created,
        };
        db.SchoolProposals.AddRange(Enumerable.Range(0, 120).Select(i => Row(prefix + " đã xử lý " + i, "REJECTED", s.Seller.UserId, now.AddMinutes(-i), now)));
        var oldest = Row(prefix + " hồ sơ cũ", "PENDING_MANAGER", s.Seller.UserId, now.AddMonths(-2), now.AddDays(-1));
        db.SchoolProposals.AddRange(oldest, Row(prefix + " hồ sơ chờ mới", "PENDING_MANAGER", s.Seller.UserId, now, now.AddDays(1)),
            Row(prefix + " riêng tư của người khác", "PENDING_MANAGER", s.Peer.UserId, now, now.AddDays(1)));
        await db.SaveChangesAsync();
        var first = Json(await SchoolOperationsEndpoints.WorkspacePage(Http(s.Seller.UserId), db, 1, null, Ct));
        var second = Json(await SchoolOperationsEndpoints.WorkspacePage(Http(s.Seller.UserId), db, 2, null, Ct));
        Assert.Equal(122, first.GetProperty("pagination").GetProperty("totals").GetProperty("proposals").GetInt32());
        Assert.Equal(oldest.Id, first.GetProperty("proposals")[0].GetProperty("id").GetInt64());
        Assert.Equal(100, first.GetProperty("proposals").GetArrayLength()); Assert.Equal(22, second.GetProperty("proposals").GetArrayLength());
        var firstIds = first.GetProperty("proposals").EnumerateArray().Select(x => x.GetProperty("id").GetInt64()).ToHashSet();
        Assert.DoesNotContain(second.GetProperty("proposals").EnumerateArray(), x => firstIds.Contains(x.GetProperty("id").GetInt64()));
        var found = Json(await SchoolOperationsEndpoints.WorkspacePage(Http(s.Seller.UserId), db, 1, oldest.Name, Ct));
        Assert.Single(found.GetProperty("proposals").EnumerateArray());
        var hidden = Json(await SchoolOperationsEndpoints.WorkspacePage(Http(s.Peer.UserId), db, 1, oldest.Name, Ct));
        Assert.Empty(hidden.GetProperty("proposals").EnumerateArray());
    }

    [MySqlFact] public async Task AccountRestorationDoesNotRestoreRevokedClaimsOrPendingExtensions()
    {
        var s = await Arrange(); var admin = await User("admin@kidsfit.vn");
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var registration = await a.RegisterCustomerApproach(Claim(s.CustomerId), s.Seller.UserId, Http(), Ct);
        var until = await db.ApproachRegistrations.Where(x => x.Id == registration).Select(x => x.ProtectedUntil).SingleAsync();
        var extension = await a.RequestSchoolExtension(registration, Extension(until.AddDays(7)), s.Seller.UserId, Http(), Ct);
        await a.CompleteSchoolHandover(s.Seller.MembershipId, new(Key(), "Ngưng tài khoản", "Đã bàn giao toàn bộ lịch hẹn và hồ sơ", true), admin, Http(), Ct);
        Assert.Equal("SUSPENDED", await db.Users.Where(x => x.Id == s.Seller.UserId).Select(x => x.Status).SingleAsync());
        Assert.Equal("CANCELLED", await db.SchoolExtensionRequests.Where(x => x.Id == extension).Select(x => x.Status).SingleAsync());
        await Assert.ThrowsAsync<KeyNotFoundException>(() => a.ReactivateSchoolMembership(s.Seller.MembershipId, new("Không có quyền khóa toàn hệ thống", true), s.Manager.UserId, Http(), Ct));
        await a.ReactivateSchoolMembership(s.Seller.MembershipId, new("CTV quay lại hợp tác", true), admin, Http(), Ct);
        Assert.Equal("ACTIVE", await db.Users.Where(x => x.Id == s.Seller.UserId).Select(x => x.Status).SingleAsync());
        Assert.Equal("REVOKED", await db.ApproachRegistrations.Where(x => x.Id == registration).Select(x => x.Status).SingleAsync());
        Assert.False(await db.CustomerProtections.AnyAsync(x => x.ApproachRegistrationId == registration && x.Status == "ACTIVE"));
        var next = await a.RegisterCustomerApproach(Claim(s.CustomerId), s.Seller.UserId, Http(), Ct);
        Assert.NotEqual(registration, next);
    }

    [MySqlFact] public async Task ExtensionPolicyLimitsBothNumberOfApprovalsAndCumulativeDays()
    {
        var s = await Arrange(); await Policy(s.OrgId);
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var registration = await a.RegisterCustomerApproach(Claim(s.CustomerId), s.Seller.UserId, Http(), Ct);
        var until = await db.ApproachRegistrations.Where(x => x.Id == registration).Select(x => x.ProtectedUntil).SingleAsync();
        for (var i = 0; i < 2; i++)
        {
            until = until.AddDays(7);
            var id = await a.RequestSchoolExtension(registration, Extension(until), s.Seller.UserId, Http(), Ct);
            await a.ReviewSchoolExtension(id, new(true, DateTime.SpecifyKind(until, DateTimeKind.Utc), DateTime.UtcNow.AddDays(1), "Gia hạn theo quyết định"), s.Manager.UserId, Http(), Ct);
        }
        var excess = await a.RequestSchoolExtension(registration, Extension(until.AddDays(1)), s.Seller.UserId, Http(), Ct);
        await Assert.ThrowsAsync<ApiValidationException>(() => a.ReviewSchoolExtension(excess, new(true, DateTime.SpecifyKind(until.AddDays(1), DateTimeKind.Utc), DateTime.UtcNow.AddDays(1), "Vượt trần"), s.Manager.UserId, Http(), Ct));
        Assert.Equal(until, await db.ApproachRegistrations.Where(x => x.Id == registration).Select(x => x.ProtectedUntil).SingleAsync());
        Assert.Equal(2, await db.SchoolExtensionRequests.CountAsync(x => x.ApproachRegistrationId == registration && x.Status == "APPROVED"));
    }

    [MySqlFact] public async Task CrossOrganizationCareIsExplicitAndFormerCaretakerLosesPartnerContacts()
    {
        var s = await Arrange(); var contract = await ActiveContract(s); var admin = await User("admin@kidsfit.vn");
        var caretaker = await User("care@kidsfit.vn");
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var careOrg = await db.OrganizationMemberships.Where(x => x.UserId == caretaker && x.IsPrimary).Select(x => x.OrganizationId).SingleAsync();
        await Assert.ThrowsAsync<KeyNotFoundException>(() => a.AssignContractCare(contract, new(Key(), caretaker, careOrg, "Không có quyền xuyên tổ chức"), s.Manager.UserId, Http(), Ct));
        await a.AssignContractCare(contract, new(Key(), caretaker, careOrg, "KIDSFIT tiếp nhận chăm sóc đối tác"), admin, Http(), Ct);
        var ticket = await a.CreateCustomerSupportCase(new(Key(), contract, "Đào tạo triển khai", "Hẹn hướng dẫn vận hành"), caretaker, Http(), Ct);
        var owned = Json(await SchoolEndpoints.Detail(s.SchoolId, Http(caretaker), db, Ct));
        Assert.NotEqual(JsonValueKind.Null, owned.GetProperty("units")[0].GetProperty("contact_name").ValueKind);
        var next = await AddMember(careOrg, "CUSTOMER_CARE", "CUSTOMER_CARE");
        await a.AssignContractCare(contract, new(Key(), next.UserId, careOrg, "Bàn giao lịch đào tạo"), admin, Http(), Ct);
        await Assert.ThrowsAsync<KeyNotFoundException>(() => SchoolEndpoints.Detail(s.SchoolId, Http(caretaker), db, Ct));
        Assert.Equal(next.UserId, await db.CustomerSupportCases.Where(x => x.Id == ticket).Select(x => x.AssignedUserId).SingleAsync());
        var current = Json(await SchoolOperationsEndpoints.Workspace(Http(next.UserId), db, Ct));
        Assert.Contains(current.GetProperty("support_cases").EnumerateArray(), x => x.GetProperty("id").GetInt64() == ticket);
        Assert.Empty(current.GetProperty("receipts").EnumerateArray());
    }

    [MySqlFact] public async Task RefundAuditFailureRollsBackCashScheduleAndReconciliationThenSameRequestCanRetry()
    {
        var s = await Arrange(); var contract = await ActiveContract(s); var admin = await User("admin@kidsfit.vn");
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var receipt = await a.RecordRevenueReceipt(contract, new(Key(), null, 1_000_000, null, "RC-" + Key(), "BANK_TRANSFER"), admin, Http(), Ct);
        var request = new RecordRevenueRefundRequest(Key(), 400_000, null, "RF-" + Key(), "Hoàn theo chứng từ", "TEST-REFUND-APPROVAL");
        await db.Database.ExecuteSqlRawAsync("CREATE TRIGGER fail_notes_refund_audit BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN IF NEW.action = 'RECORD_REVENUE_REFUND' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'test audit rejected'; END IF; END");
        try { await Assert.ThrowsAsync<DbUpdateException>(() => a.RecordRevenueRefund(receipt, request, admin, Http(), Ct)); }
        finally { await db.Database.ExecuteSqlRawAsync("DROP TRIGGER fail_notes_refund_audit"); db.ChangeTracker.Clear(); }
        Assert.False(await db.RevenueRefunds.AnyAsync(x => x.ContractId == contract));
        Assert.Equal(1_000_000, await db.RevenueSchedules.Where(x => x.ContractId == contract).Select(x => x.AmountReceived).SingleAsync());
        Assert.Equal("CONFIRMED", await db.ReconciliationCases.Where(x => x.ContractId == contract).Select(x => x.Status).SingleAsync());
        var id = await a.RecordRevenueRefund(receipt, request, admin, Http(), Ct);
        Assert.Equal(id, await a.RecordRevenueRefund(receipt, request, admin, Http(), Ct));
        Assert.Equal(600_000, await db.RevenueSchedules.Where(x => x.ContractId == contract).Select(x => x.AmountReceived).SingleAsync());
        Assert.Equal(100_000, await db.CommissionLedgerEntries.Where(x => x.ContractId == contract).Select(x => x.Amount).SingleAsync());
    }

    [MySqlFact] public async Task CommissionPoliciesCanTargetPersonnelWithoutChangingContractGroupAfterHrChange()
    {
        var s = await Arrange(); var admin = await User("admin@kidsfit.vn");
        var collaboratorContract = await ActiveContract(s);
        var employee = await AddMember(s.OrgId, "CHANNEL_SALES", "CHANNEL_SALES", s.Manager.UserId);
        var employeeContract = await ActiveContract(s with { Seller = employee, SchoolId = s.OtherSchoolId, CustomerId = s.OtherCustomerId });
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var specific = new CommissionPolicyVersion { OrganizationId = s.OrgId, Code = "TCTV-" + Key(), Name = "CTV kiểm thử", PersonnelType = "COLLABORATOR",
            RatePercent = 12m, EffectiveFrom = ChannelSalesValidation.BusinessDate(DateTime.UtcNow).AddDays(-1), CreatedByUserId = admin };
        db.CommissionPolicyVersions.Add(specific); await db.SaveChangesAsync();
        await db.OrganizationMemberships.Where(x => x.Id == s.Seller.MembershipId).ExecuteUpdateAsync(v => v.SetProperty(x => x.MembershipType, "SALES"));
        await a.RecordRevenueReceipt(collaboratorContract, new(Key(), null, 1_000_000m, null, "RC-" + Key(), "BANK_TRANSFER"), admin, Http(), Ct);
        await a.RecordRevenueReceipt(employeeContract, new(Key(), null, 1_000_000m, null, "RC-" + Key(), "BANK_TRANSFER"), admin, Http(), Ct);
        Assert.Equal("COLLABORATOR", await db.SalesContracts.Where(x => x.Id == collaboratorContract).Select(x => x.OwnerPersonnelType).SingleAsync());
        Assert.Equal("SALES", await db.SalesContracts.Where(x => x.Id == employeeContract).Select(x => x.OwnerPersonnelType).SingleAsync());
        var collaboratorEntry = await db.CommissionLedgerEntries.SingleAsync(x => x.ContractId == collaboratorContract);
        Assert.Equal(specific.Id, collaboratorEntry.PolicyVersionId); Assert.Equal(120_000m, collaboratorEntry.Amount);
        Assert.Equal(100_000m, await db.CommissionLedgerEntries.Where(x => x.ContractId == employeeContract).Select(x => x.Amount).SingleAsync());
        var future = ChannelSalesValidation.BusinessDate(DateTime.UtcNow).AddDays(1);
        var nextPolicy = await a.CreateCommissionPolicy(new(s.OrgId, "NEXT-" + Key(), "Phiên bản CTV tiếp theo", 11m, future, null, "PARTNER_COLLABORATOR"), s.Manager.UserId, Http(), Ct);
        Assert.Equal("COLLABORATOR", (await db.CommissionPolicyVersions.FindAsync(nextPolicy))!.PersonnelType);
        await Assert.ThrowsAsync<ApiValidationException>(() => a.CreateCommissionPolicy(new(s.OrgId, "BAD-" + Key(), "Nhóm không hợp lệ", 10m, future, null, "UNKNOWN"), s.Manager.UserId, Http(), Ct));
    }

    [MySqlFact] public async Task LegacyContractSnapshotsInactiveOwnersGroupOnNextReceiptWithoutRewritingOldLedger()
    {
        var s = await Arrange(); var contract = await ActiveContract(s); var admin = await User("admin@kidsfit.vn");
        await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        await a.RecordRevenueReceipt(contract, new(Key(), null, 500_000m, null, "RC-" + Key(), "BANK_TRANSFER"), admin, Http(), Ct);
        var original = await db.CommissionLedgerEntries.AsNoTracking().SingleAsync(x => x.ContractId == contract);
        await db.SalesContracts.Where(x => x.Id == contract).ExecuteUpdateAsync(v => v.SetProperty(x => x.OwnerPersonnelType, (string?)null));
        db.CommissionPolicyVersions.Add(new CommissionPolicyVersion { OrganizationId = s.OrgId, Code = "LEG-" + Key(), Name = "CTV kiểm thử", PersonnelType = "COLLABORATOR",
            RatePercent = 12m, EffectiveFrom = ChannelSalesValidation.BusinessDate(DateTime.UtcNow).AddDays(-1), CreatedByUserId = admin });
        await db.SaveChangesAsync(); db.ChangeTracker.Clear();
        await a.CompleteSchoolHandover(s.Seller.MembershipId, new(Key(), "Ngưng hợp tác", "Giữ quyền hợp đồng và đối soát hoa hồng còn lại", false), s.Manager.UserId, Http(), Ct);
        await a.RecordRevenueReceipt(contract, new(Key(), null, 500_000m, null, "RC-" + Key(), "BANK_TRANSFER"), admin, Http(), Ct);
        Assert.Equal("COLLABORATOR", await db.SalesContracts.Where(x => x.Id == contract).Select(x => x.OwnerPersonnelType).SingleAsync());
        var entries = await db.CommissionLedgerEntries.AsNoTracking().Where(x => x.ContractId == contract).OrderBy(x => x.Id).ToArrayAsync();
        Assert.Equal(50_000m, entries[0].Amount); Assert.Equal(original.PolicyVersionId, entries[0].PolicyVersionId);
        Assert.Equal(60_000m, entries[1].Amount); Assert.Equal(s.Seller.UserId, entries[1].BeneficiaryUserId);
    }

    [MySqlFact] public async Task DeferralNeverReservesSchoolAndNonCollaboratorsKeepIndependentCapacityPolicy()
    {
        var s = await Arrange(); await using var db = fixture.Open(); var a = new ChannelSalesActions(db);
        var id = await a.DeferSchool(new(Key(), s.SchoolId, s.OrgId, "Tư vấn từ xa, rà soát lại", DateTime.UtcNow.AddDays(7)), s.Manager.UserId, Http(), Ct);
        Assert.False(await db.CustomerProtections.AnyAsync(x => x.CustomerId == s.CustomerId));
        await a.RegisterCustomerApproach(Claim(s.CustomerId), s.Peer.UserId, Http(), Ct);
        await a.CompleteSchoolDeferral(id, "Đã có nhân sự nhận trường", s.Manager.UserId, Http(), Ct);
        Assert.Equal("COMPLETED", (await db.SchoolDeferrals.FindAsync(id))!.Status);
        var employee = await AddMember(s.OrgId, "CHANNEL_SALES", "SALES", s.Manager.UserId);
        await db.OrganizationMemberships.Where(x => x.Id == employee.MembershipId).ExecuteUpdateAsync(s => s.SetProperty(x => x.SchoolApproachLimit, 0));
        await a.RegisterCustomerApproach(Claim(s.OtherCustomerId), employee.UserId, Http(), Ct);
        Assert.True(await db.CustomerProtections.AnyAsync(x => x.CustomerId == s.OtherCustomerId && x.OwnerUserId == employee.UserId && x.Status == "ACTIVE"));
    }
}

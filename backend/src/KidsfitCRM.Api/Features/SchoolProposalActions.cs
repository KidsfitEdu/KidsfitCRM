using System.Data;
using System.Net.Mail;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;
using MySql.Data.MySqlClient;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    public Task<long> SubmitSchoolProposal(CreateSchoolProposalRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        await RequirePermission(actorId, Permissions.SchoolProposalSubmit, ct);
        var orgId = await PrimaryOrganizationId(actorId, ct);
        var key = SchoolKey(request.IdempotencyKey);
        var hash = ChannelSalesValidation.Fingerprint(request);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await LockSchoolOrganization(orgId, ct);
        var replay = await db.SchoolProposals.SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.SubmittedByUserId, actorId, replay.RequestFingerprint, hash);
        var membership = await ActiveSchoolMembership(actorId, orgId, ct);
        var managerId = membership.ManagerUserId ?? throw ApiValidationException.For("manager", "Cần chỉ định Quản lý trực tiếp trước khi gửi đề xuất.");
        var managerAccess = await ChannelSalesAccess.Load(db, managerId, ct);
        if (!managerAccess.Has(Permissions.SchoolProposalReview) || !managerAccess.CanManageOrganization(orgId) || managerId == actorId)
            throw ApiValidationException.For("manager", "Quản lý trực tiếp chưa có quyền tiếp nhận đề xuất trong tổ chức.");
        var code = Validation.Required(request.SchoolCode, "school_code", "Cần mã trường chính.", 64).ToUpperInvariant();
        if (!System.Text.RegularExpressions.Regex.IsMatch(code, "^[A-Z0-9][A-Z0-9_-]*$")) throw ApiValidationException.For("school_code", "Mã trường chỉ gồm chữ Latin, số, gạch ngang hoặc gạch dưới.");
        if (await db.DirectorySchools.AnyAsync(x => x.SchoolCode == code, ct)) throw new ApiConflictException("Mã trường đã có trong danh bạ chính thức.");
        var now = DateTime.UtcNow;
        var policy = await ActiveSchoolPolicy(orgId, ct);
        var proposal = new SchoolProposal
        {
            OrganizationId = orgId, SubmittedByUserId = actorId, ManagerUserId = managerId,
            SchoolCode = code, Name = Validation.Required(request.Name, "name", "Cần tên trường.", 500),
            Province = Validation.Required(request.Province, "province", "Cần tỉnh/thành phố.", 100),
            Ward = Validation.Required(request.Ward, "ward", "Cần phường/xã.", 100),
            Address = CleanOptional(request.Address, 500), ContactName = CleanOptional(request.ContactName, 500),
            ContactPosition = CleanOptional(request.ContactPosition, 120), ContactPhone = SchoolPhone(request.ContactPhone), Email = SchoolEmail(request.Email),
            Reason = Validation.Required(request.Reason, "reason", "Cần lý do đề xuất.", 4000),
            ReviewDueAt = SchoolDeadline(now, policy?.ManagerReviewHours, request.ReviewDueAt),
            IdempotencyKey = key, RequestFingerprint = hash, CreatedAt = now, UpdatedAt = now,
        };
        db.SchoolProposals.Add(proposal);
        await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "SUBMIT_SCHOOL_PROPOSAL", nameof(SchoolProposal), proposal.Id, null,
            new { proposal.Status, proposal.ManagerUserId, proposal.OrganizationId, proposal.ReviewDueAt }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return proposal.Id;
    }, ct);

    public Task<long> ReviewSchoolProposal(long id, ReviewSchoolProposalRequest request, bool finalReview, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await ChannelSalesAccess.Load(db, actorId, ct);
        var reason = Validation.Required(request.Reason, "reason", "Cần ghi rõ kết quả kiểm tra và lý do.", 4000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        long? centralOrg = null;
        if (finalReview)
        {
            if (!access.Has(Permissions.SchoolDirectoryManage)) throw new KeyNotFoundException();
            centralOrg = await db.Organizations.Where(x => x.Code == "KIDSFIT" && x.Status == "ACTIVE" && access.OrganizationIds.Contains(x.Id)).Select(x => (long?)x.Id).SingleOrDefaultAsync(ct)
                ?? throw new KeyNotFoundException();
            await LockSchoolOrganization(centralOrg.Value, ct);
        }
        var proposal = await db.SchoolProposals.FromSqlInterpolated($"SELECT * FROM school_proposals WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        var now = DateTime.UtcNow;
        if (!finalReview)
        {
            var manager = access.Has(Permissions.SchoolProposalReview) && access.CanManageOrganization(proposal.OrganizationId)
                && (proposal.ManagerUserId == actorId || access.All);
            var escalated = access.Has(Permissions.SchoolEscalationResolve) && access.CanManageOrganization(proposal.OrganizationId) && proposal.ReviewDueAt <= now;
            if (!manager && !escalated) throw new KeyNotFoundException();
        }
        if (proposal.SubmittedByUserId == actorId) throw new ApiConflictException("Người gửi không tự duyệt đề xuất của mình.");
        var expected = finalReview ? "PENDING_ADMIN" : "PENDING_MANAGER";
        var target = request.Approve ? finalReview ? "APPROVED" : "PENDING_ADMIN" : "REJECTED";
        if (proposal.Status == target && proposal.ReviewedByUserId == actorId && proposal.DecisionReason == reason) return proposal.Id;
        if (proposal.Status != expected) throw new ApiConflictException("Đề xuất không ở bước chờ duyệt này.");
        var previous = proposal.Status;
        if (finalReview && request.Approve)
        {
            if (await db.DirectorySchools.AnyAsync(x => x.SchoolCode == proposal.SchoolCode, ct))
                throw new ApiConflictException("Mã trường đã có trong danh bạ. Cần đối chiếu hồ sơ hiện có thay vì tạo bản sao.");
            if (!request.DuplicateReviewed && await db.SchoolUnits.AnyAsync(x => x.UnitType == "MAIN" && x.Name == proposal.Name && x.Province == proposal.Province && x.Ward == proposal.Ward, ct))
                throw new ApiConflictException("Có trường cùng tên và khu vực. Admin cần xác minh đây là đơn vị khác và xác nhận đã kiểm tra trùng.");
            var customer = new ChannelCustomer
            {
                Code = "CUS-" + Guid.NewGuid().ToString("N")[..20].ToUpperInvariant(), DisplayName = proposal.Name,
                CustomerType = "ORGANIZATION", Province = proposal.Province, Address = proposal.Address,
                ContactName = proposal.ContactName, ContactPosition = proposal.ContactPosition, Phone = proposal.ContactPhone,
                Email = proposal.Email, Source = "SCHOOL_PROPOSAL", VerificationStatus = "VERIFIED",
                CreatedByUserId = actorId, OrganizationId = centralOrg!.Value, CreatedAt = now, UpdatedAt = now,
            };
            db.ChannelCustomers.Add(customer); await db.SaveChangesAsync(ct);
            var school = new DirectorySchool { SchoolCode = proposal.SchoolCode, CustomerId = customer.Id, CreatedAt = now, UpdatedAt = now };
            db.DirectorySchools.Add(school); await db.SaveChangesAsync(ct);
            db.CustomerIdentifiers.Add(new CustomerIdentifier { CustomerId = customer.Id, IdentifierType = "SCHOOL_CODE", NormalizedValue = school.SchoolCode, DisplayValue = school.SchoolCode, IsVerified = true, CreatedAt = now, UpdatedAt = now });
            db.SchoolUnits.Add(new SchoolUnit
            {
                DirectorySchoolId = school.Id, ContentHash = SchoolWorkbookReader.ProposedMainFingerprint(proposal.SchoolCode, proposal.Name, proposal.Province, proposal.Ward,
                    proposal.Address, proposal.ContactName, proposal.ContactPosition, proposal.ContactPhone, proposal.Email), UnitType = "MAIN", Name = proposal.Name,
                Province = proposal.Province, Ward = proposal.Ward, Address = proposal.Address, ContactName = proposal.ContactName,
                ContactPosition = proposal.ContactPosition, ContactPhone = proposal.ContactPhone, Email = proposal.Email, SourceRow = 0,
                CreatedAt = now, UpdatedAt = now,
            });
            proposal.DirectorySchoolId = school.Id;
        }
        if (!finalReview && request.Approve)
        {
            var policy = await ActiveSchoolPolicy(proposal.OrganizationId, ct);
            proposal.ReviewDueAt = SchoolDeadline(now, policy?.AdminReviewHours, request.ReviewDueAt);
            proposal.ManagerReviewedAt = now;
        }
        proposal.Status = target; proposal.ReviewedByUserId = actorId; proposal.DecisionReason = reason; proposal.UpdatedAt = now;
        Audit.Add(db, actorId, finalReview ? "ADMIN_REVIEW_SCHOOL_PROPOSAL" : "MANAGER_REVIEW_SCHOOL_PROPOSAL", nameof(SchoolProposal), id,
            new { status = previous }, new { proposal.Status, proposal.ReviewDueAt, proposal.DirectorySchoolId, request.DuplicateReviewed, reason }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return id;
    }, ct);

    public Task<long> CreateSchoolWorkflowPolicy(CreateSchoolWorkflowPolicyRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolWorkflowPolicyManage, ct);
        if (!access.CanManageOrganization(request.OrganizationId)) throw new KeyNotFoundException();
        if (request.ManagerReviewHours is < 1 or > 8760 || request.AdminReviewHours is < 1 or > 8760 || request.InvitationHours is < 1 or > 8760
            || request.MaxExtensionDays is < 1 or > 365 || request.MaxExtensionCount is < 1 or > 100 || request.MaxTotalExtensionDays < request.MaxExtensionDays || request.MaxTotalExtensionDays > 3650)
            throw ApiValidationException.For("policy", "Thời hạn và số lần phải là số dương; tổng ngày phải lớn hơn hoặc bằng số ngày mỗi lần.");
        var reference = Validation.Required(request.DecisionReference, "decision_reference", "Cần căn cứ phê duyệt chính sách.", 120);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await LockSchoolOrganization(request.OrganizationId, ct);
        var policyHash = ChannelSalesValidation.Fingerprint(request);
        var replay = await db.SchoolWorkflowPolicies.SingleOrDefaultAsync(x => x.OrganizationId == request.OrganizationId && x.DecisionReference == reference, ct);
        if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.CreatedByUserId, actorId, replay.RequestFingerprint, policyHash);
        var now = DateTime.UtcNow;
        if (request.Activate) await db.SchoolWorkflowPolicies.Where(x => x.OrganizationId == request.OrganizationId && x.Status == "ACTIVE")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "SUPERSEDED").SetProperty(x => x.UpdatedAt, now), ct);
        var policy = new SchoolWorkflowPolicyVersion
        {
            OrganizationId = request.OrganizationId, Version = (await db.SchoolWorkflowPolicies.Where(x => x.OrganizationId == request.OrganizationId).MaxAsync(x => (int?)x.Version, ct) ?? 0) + 1,
            Status = request.Activate ? "ACTIVE" : "DRAFT", ManagerReviewHours = request.ManagerReviewHours,
            AdminReviewHours = request.AdminReviewHours, InvitationHours = request.InvitationHours, MaxExtensionDays = request.MaxExtensionDays,
            MaxExtensionCount = request.MaxExtensionCount, MaxTotalExtensionDays = request.MaxTotalExtensionDays,
            DecisionReference = reference, RequestFingerprint = policyHash, CreatedByUserId = actorId, CreatedAt = now, UpdatedAt = now,
        };
        db.SchoolWorkflowPolicies.Add(policy); await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "CREATE_SCHOOL_WORKFLOW_POLICY", nameof(SchoolWorkflowPolicyVersion), policy.Id, null,
            new { policy.OrganizationId, policy.Version, policy.Status, policy.ManagerReviewHours, policy.AdminReviewHours, policy.InvitationHours,
                policy.MaxExtensionDays, policy.MaxExtensionCount, policy.MaxTotalExtensionDays, policy.DecisionReference }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return policy.Id;
    }, ct);

    private Task<SchoolWorkflowPolicyVersion?> ActiveSchoolPolicy(long orgId, CancellationToken ct) =>
        db.SchoolWorkflowPolicies.AsNoTracking().Where(x => x.OrganizationId == orgId && x.Status == "ACTIVE").OrderByDescending(x => x.Version).FirstOrDefaultAsync(ct);

    private async Task<Organization> LockSchoolOrganization(long id, CancellationToken ct) =>
        await db.Organizations.FromSqlInterpolated($"SELECT * FROM organizations WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();

    private async Task<OrganizationMembership> ActiveSchoolMembership(long userId, long orgId, CancellationToken ct)
    {
        var member = await db.OrganizationMemberships.FromSqlInterpolated($"SELECT * FROM organization_memberships WHERE user_id = {userId} AND organization_id = {orgId} FOR UPDATE").SingleOrDefaultAsync(ct);
        if (member?.Status != "ACTIVE" || !await db.Users.AnyAsync(x => x.Id == userId && x.Status == "ACTIVE", ct)
            || !await db.Organizations.AnyAsync(x => x.Id == orgId && x.Status == "ACTIVE", ct)) throw new KeyNotFoundException();
        return member;
    }

    private static DateTime SchoolDeadline(DateTime now, int? hours, DateTime? requested)
    {
        if (hours.HasValue) return now.AddHours(hours.Value);
        return SchoolFuture(requested, "review_due_at", now);
    }
    private static DateTime SchoolFuture(DateTime? value, string field, DateTime after)
    {
        if (value is null || SchoolUtc(value.Value) <= SchoolUtc(after)) throw ApiValidationException.For(field, "Cần thời điểm cụ thể trong tương lai.");
        return SchoolUtc(value.Value);
    }
    private static DateTime SchoolUtc(DateTime value)
    {
        var utc = value.Kind == DateTimeKind.Unspecified ? DateTime.SpecifyKind(value, DateTimeKind.Utc) : value.ToUniversalTime();
        return new DateTime(utc.Ticks - utc.Ticks % 10, DateTimeKind.Utc);
    }
    private static string SchoolKey(string? key) => Validation.Required(key, "idempotency_key", "Thiếu khóa chống gửi trùng.", 120);
    private static string? SchoolPhone(string? value)
    {
        var clean = CleanOptional(value, 40);
        if (clean is not null && Validation.Digits(clean).Length is < 9 or > 15) throw ApiValidationException.For("phone", "Số điện thoại cần từ 9 đến 15 chữ số.");
        return clean;
    }
    private static string? SchoolEmail(string? value)
    {
        var clean = NormalizeEmail(value);
        if (clean is not null && (!MailAddress.TryCreate(clean, out var email) || email.Address != clean)) throw ApiValidationException.For("email", "Email không hợp lệ.");
        return clean;
    }
    private Task<T> SchoolWrite<T>(Func<Task<T>> action, CancellationToken ct) => RetryContestedWrite(async () =>
    {
        try { return await action(); }
        catch (DbUpdateException exception) when (exception.GetBaseException() is MySqlException { Number: 1062 })
        { throw new ApiConflictException("Thông tin hoặc mã yêu cầu đã được ghi nhận. Vui lòng tải lại và kiểm tra nội dung."); }
    }, ct);
}

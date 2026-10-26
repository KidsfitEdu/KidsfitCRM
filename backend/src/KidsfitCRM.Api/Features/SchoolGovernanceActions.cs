using System.Data;
using System.Text.Json;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    public Task<long> OpenSchoolDispute(CreateSchoolDisputeRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesView, ct);
        if (!access.Has(Permissions.ChannelSalesRegister) && !access.Has(Permissions.ChannelSalesReconcile) && !access.Has(Permissions.SchoolDisputeResolve)) throw new KeyNotFoundException();
        if (!await access.Customers(db).AnyAsync(x => x.Id == request.CustomerId, ct)
            && !await db.DirectorySchools.AnyAsync(x => x.CustomerId == request.CustomerId, ct)) throw new KeyNotFoundException();
        var orgId = await PrimaryOrganizationId(actorId, ct);
        var key = SchoolKey(request.IdempotencyKey); var hash = ChannelSalesValidation.Fingerprint(request);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await LockCustomer(request.CustomerId, ct);
        var replay = await db.SchoolDisputes.SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.OpenedByUserId, actorId, replay.RequestFingerprint, hash);
        var now = DateTime.UtcNow;
        var dispute = new SchoolDispute
        {
            CustomerId = request.CustomerId, OrganizationId = orgId, OpenedByUserId = actorId,
            Reason = Validation.Required(request.Reason, "reason", "Cần mô tả tranh chấp hoặc phản ánh phân bổ.", 4000),
            EvidenceReference = Validation.Required(request.EvidenceReference, "evidence_reference", "Cần căn cứ phản ánh.", 500),
            IdempotencyKey = key, RequestFingerprint = hash, CreatedAt = now, UpdatedAt = now,
        };
        db.SchoolDisputes.Add(dispute); await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "OPEN_SCHOOL_DISPUTE", nameof(SchoolDispute), dispute.Id, null, new { dispute.CustomerId, dispute.OrganizationId, dispute.Status }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return dispute.Id;
    }, ct);

    public Task<long> ResolveSchoolDispute(long id, ResolveSchoolDisputeRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolDisputeResolve, ct);
        var decision = Validation.Required(request.Decision, "decision", "Cần kết luận tranh chấp.", 32).ToUpperInvariant();
        if (decision is not ("UPHOLD_CURRENT_RIGHTS" or "REJECT_CLAIM" or "RESOLVED")) throw ApiValidationException.For("decision", "Kết luận không hợp lệ.");
        var reason = Validation.Required(request.Reason, "reason", "Cần căn cứ kết luận.", 4000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var dispute = await db.SchoolDisputes.FromSqlInterpolated($"SELECT * FROM school_disputes WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(dispute.OrganizationId)) throw new KeyNotFoundException();
        if (dispute.Status == "RESOLVED" && dispute.Decision == decision && dispute.DecisionReason == reason && dispute.ResolvedByUserId == actorId) return id;
        if (dispute.Status != "OPEN") throw new ApiConflictException("Tranh chấp đã có kết luận.");
        // A dispute conclusion never transfers another person's valid protection or commission.
        dispute.Status = "RESOLVED"; dispute.Decision = decision; dispute.DecisionReason = reason; dispute.ResolvedByUserId = actorId;
        dispute.ResolvedAt = DateTime.UtcNow; dispute.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, actorId, "RESOLVE_SCHOOL_DISPUTE", nameof(SchoolDispute), id, new { status = "OPEN" }, new { dispute.Status, decision, reason }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return id;
    }, ct);

    public Task<long> DeferSchool(DeferSchoolRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolAllocationManage, ct);
        if (!access.CanManageOrganization(request.OrganizationId)) throw new KeyNotFoundException();
        var key = SchoolKey(request.IdempotencyKey); var hash = ChannelSalesValidation.Fingerprint(request);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var school = await db.DirectorySchools.SingleOrDefaultAsync(x => x.Id == request.SchoolId, ct) ?? throw new KeyNotFoundException();
        await LockCustomer(school.CustomerId, ct);
        var replay = await db.SchoolDeferrals.SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.ManagerUserId, actorId, replay.RequestFingerprint, hash);
        var now = DateTime.UtcNow;
        await EnsureSchoolAvailable(school.CustomerId, now, ct);
        if (await db.SchoolDeferrals.AnyAsync(x => x.DirectorySchoolId == school.Id && x.OrganizationId == request.OrganizationId && x.Status == "OPEN", ct))
            throw new ApiConflictException("Tổ chức đã có lịch rà soát trường này. Hãy hoàn tất lịch cũ trước.");
        var item = new SchoolDeferral
        {
            DirectorySchoolId = school.Id, OrganizationId = request.OrganizationId, ManagerUserId = actorId,
            Reason = Validation.Required(request.Reason, "reason", "Cần lý do tạm hoãn hoặc tư vấn từ xa.", 4000),
            ReviewAt = SchoolFuture(request.ReviewAt, "review_at", now), IdempotencyKey = key, RequestFingerprint = hash, CreatedAt = now, UpdatedAt = now,
        };
        db.SchoolDeferrals.Add(item); await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "DEFER_SCHOOL_REVIEW", nameof(SchoolDeferral), item.Id, null, new { item.DirectorySchoolId, item.OrganizationId, item.ReviewAt, item.Reason }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return item.Id;
    }, ct);

    public Task<long> CompleteSchoolDeferral(long id, string? reasonValue, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolAllocationManage, ct);
        var reason = Validation.Required(reasonValue, "reason", "Cần kết quả rà soát.", 4000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var item = await db.SchoolDeferrals.FromSqlInterpolated($"SELECT * FROM school_deferrals WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(item.OrganizationId)) throw new KeyNotFoundException();
        if (item.Status == "COMPLETED") return id;
        item.Status = "COMPLETED"; item.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, actorId, "COMPLETE_SCHOOL_DEFERRAL", nameof(SchoolDeferral), id, new { status = "OPEN" }, new { item.Status, reason }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return id;
    }, ct);

    public Task<long> CompleteSchoolHandover(long membershipId, CompleteSchoolHandoverRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolHandoverManage, ct);
        var key = SchoolKey(request.IdempotencyKey); var hash = ChannelSalesValidation.Fingerprint(request, membershipId);
        var reason = Validation.Required(request.Reason, "reason", "Cần lý do ngưng hoạt động.", 2000);
        var summary = Validation.Required(request.Summary, "summary", "Cần nội dung bàn giao, lịch hẹn và cam kết còn lại.", 4000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var member = await db.OrganizationMemberships.FromSqlInterpolated($"SELECT * FROM organization_memberships WHERE id = {membershipId} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(member.OrganizationId) || member.UserId == actorId) throw new KeyNotFoundException();
        if (!access.Has(Permissions.ChannelSalesIdentityManage) && !IsCollaborator(member)) throw new KeyNotFoundException();
        var replay = await db.SchoolHandovers.SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.CompletedByUserId, actorId, replay.RequestFingerprint, hash);
        if (request.SuspendAccount && (!access.All || !access.Has(Permissions.ChannelSalesIdentityManage))) throw new KeyNotFoundException();
        User? account = request.SuspendAccount
            ? await db.Users.FromSqlInterpolated($"SELECT * FROM users WHERE id = {member.UserId} FOR UPDATE").SingleAsync(ct) : null;
        if (request.SuspendAccount && await db.OrganizationMemberships.AnyAsync(x => x.UserId == member.UserId && x.Id != member.Id && x.Status == "ACTIVE", ct))
            throw new ApiConflictException("Cần bàn giao tại các tổ chức khác trước khi khóa toàn bộ tài khoản.");
        var now = DateTime.UtcNow;
        var registrations = await db.ApproachRegistrations.Where(x => x.OwnerUserId == member.UserId && x.OwnerOrganizationId == member.OrganizationId && x.Status == "ACTIVE")
            .OrderBy(x => x.CustomerId).ToListAsync(ct);
        var revoked = 0;
        foreach (var registration in registrations)
        {
            await LockCustomer(registration.CustomerId, ct);
            if (await db.SalesContracts.AnyAsync(x => x.ApproachRegistrationId == registration.Id && x.Status != "CANCELLED" && x.Status != "REJECTED", ct)) continue;
            registration.Status = "REVOKED"; registration.ExpiredAt = now; registration.UpdatedAt = now; revoked++;
            await db.CustomerProtections.Where(x => x.ApproachRegistrationId == registration.Id && x.SourceType == "APPROACH" && x.Status == "ACTIVE")
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "REVOKED").SetProperty(x => x.UpdatedAt, now), ct);
            Audit.Add(db, actorId, "REVOKE_APPROACH_ON_HANDOVER", nameof(ApproachRegistration), registration.Id, new { status = "ACTIVE" }, new { registration.Status, member.Id }, http);
        }
        await db.SchoolInvitations.Where(x => x.AssigneeUserId == member.UserId && x.OrganizationId == member.OrganizationId && x.Status == "PENDING")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "CANCELLED").SetProperty(x => x.ResponseReason, "Nhân sự ngưng hoạt động; cần phân bổ lại.").SetProperty(x => x.RespondedAt, now).SetProperty(x => x.UpdatedAt, now), ct);
        var pendingExtensions = await db.SchoolExtensionRequests.Where(x => x.RequestedByUserId == member.UserId && x.OrganizationId == member.OrganizationId && x.Status == "PENDING").ToListAsync(ct);
        foreach (var extension in pendingExtensions)
        {
            extension.Status = "CANCELLED"; extension.DecisionReason = "Nhân sự ngưng hoạt động; hồ sơ được bàn giao.";
            extension.ReviewedByUserId = actorId; extension.ReviewedAt = now; extension.UpdatedAt = now;
            Audit.Add(db, actorId, "CANCEL_EXTENSION_ON_HANDOVER", nameof(SchoolExtensionRequest), extension.Id,
                new { status = "PENDING" }, new { extension.Status, member.Id }, http);
        }
        member.Status = "SUSPENDED"; member.UpdatedAt = now;
        if (request.SuspendAccount)
        {
            account!.Status = "SUSPENDED"; account.UpdatedAt = now;
        }
        var handover = new SchoolHandover
        {
            MembershipId = member.Id, OrganizationId = member.OrganizationId, UserId = member.UserId, CompletedByUserId = actorId,
            Reason = reason, Summary = summary, RevokedRegistrations = revoked, AccountSuspended = request.SuspendAccount,
            IdempotencyKey = key, RequestFingerprint = hash, CreatedAt = now, UpdatedAt = now,
        };
        db.SchoolHandovers.Add(handover); await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "COMPLETE_SCHOOL_HANDOVER", nameof(SchoolHandover), handover.Id, null,
            new { handover.MembershipId, handover.OrganizationId, handover.UserId, handover.RevokedRegistrations, handover.AccountSuspended }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return handover.Id;
    }, ct);

    public Task<long> UpdateSchoolUnit(long id, UpdateSchoolUnitRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolDirectoryManage, ct);
        if (!access.All || !await db.Organizations.AnyAsync(x => x.Code == "KIDSFIT" && access.OrganizationIds.Contains(x.Id), ct)) throw new KeyNotFoundException();
        var reason = Validation.Required(request.Reason, "reason", "Cần lý do sửa dữ liệu nhập.", 2000);
        var schoolId = await db.SchoolUnits.Where(x => x.Id == id).Select(x => (long?)x.DirectorySchoolId).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        var customerId = await db.DirectorySchools.Where(x => x.Id == schoolId).Select(x => x.CustomerId).SingleAsync(ct);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var customer = await LockCustomer(customerId, ct) ?? throw new KeyNotFoundException();
        var unit = await db.SchoolUnits.FromSqlInterpolated($"SELECT * FROM school_units WHERE id = {id} FOR UPDATE").SingleAsync(ct);
        if (unit.Version != request.ExpectedVersion) throw new ApiConflictException("Dữ liệu vừa được người khác sửa. Tải lại để đối chiếu trước khi lưu.");
        var before = JsonSerializer.Serialize(SchoolUnitValues(unit));
        unit.Name = Validation.Required(request.Name, "name", "Cần tên đơn vị.", 500);
        unit.Province = Validation.Required(request.Province, "province", "Cần tỉnh/thành phố.", 100);
        unit.Ward = Validation.Required(request.Ward, "ward", "Cần phường/xã.", 100);
        unit.Address = CleanOptional(request.Address, 500); unit.ContactName = CleanOptional(request.ContactName, 500);
        unit.ContactPosition = CleanOptional(request.ContactPosition, 120); unit.ContactPhone = SchoolPhone(request.ContactPhone);
        unit.Email = SchoolEmail(request.Email); unit.SchoolPhone = SchoolPhone(request.SchoolPhone); unit.Note = CleanOptional(request.Note, 4000);
        var after = JsonSerializer.Serialize(SchoolUnitValues(unit));
        if (before == after) return id;
        unit.Version++; unit.UpdatedAt = DateTime.UtcNow;
        if (unit.UnitType == "MAIN")
        {
            customer.DisplayName = unit.Name; customer.Province = unit.Province; customer.Address = unit.Address;
            customer.ContactName = unit.ContactName; customer.ContactPosition = unit.ContactPosition;
            customer.Email = unit.Email; customer.Phone = unit.SchoolPhone ?? unit.ContactPhone; customer.UpdatedAt = unit.UpdatedAt;
        }
        db.SchoolUnitRevisions.Add(new SchoolUnitRevision { SchoolUnitId = id, ActorUserId = actorId, Version = unit.Version, Reason = reason,
            BeforeValues = before, AfterValues = after, CreatedAt = unit.UpdatedAt, UpdatedAt = unit.UpdatedAt });
        Audit.Add(db, actorId, "UPDATE_SCHOOL_UNIT", nameof(SchoolUnit), id, new { version = request.ExpectedVersion }, new { unit.Version, unit.DirectorySchoolId }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return id;
    }, ct);

    public Task<long> ReactivateSchoolMembership(long id, ReactivateSchoolMembershipRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolHandoverManage, ct);
        var reason = Validation.Required(request.Reason, "reason", "Cần lý do khôi phục quyền truy cập.", 2000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var member = await db.OrganizationMemberships.FromSqlInterpolated($"SELECT * FROM organization_memberships WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(member.OrganizationId) || member.UserId == actorId
            || (!access.Has(Permissions.ChannelSalesIdentityManage) && !IsCollaborator(member))) throw new KeyNotFoundException();
        if (request.ReactivateAccount && (!access.All || !access.Has(Permissions.ChannelSalesIdentityManage))) throw new KeyNotFoundException();
        var user = await db.Users.FromSqlInterpolated($"SELECT * FROM users WHERE id = {member.UserId} FOR UPDATE").SingleAsync(ct);
        if (user.Status == "SUSPENDED" && !request.ReactivateAccount) throw new ApiConflictException("Tài khoản đã bị khóa toàn bộ. Admin cần khôi phục tài khoản tại Vận hành → Bàn giao.");
        if (user.Status is not ("ACTIVE" or "SUSPENDED")) throw new ApiConflictException("Trạng thái tài khoản chưa cho phép khôi phục qua thao tác này.");
        if (member.Status == "ACTIVE" && user.Status == "ACTIVE") return id;
        var previousMember = member.Status; var previousAccount = user.Status; var now = DateTime.UtcNow;
        member.Status = "ACTIVE"; member.UpdatedAt = now;
        if (request.ReactivateAccount) { user.Status = "ACTIVE"; user.UpdatedAt = now; }
        Audit.Add(db, actorId, "REACTIVATE_SCHOOL_MEMBERSHIP", nameof(OrganizationMembership), id,
            new { membership_status = previousMember, account_status = previousAccount }, new { membership_status = member.Status, account_status = user.Status, reason }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return id;
    }, ct);

    private static object SchoolUnitValues(SchoolUnit unit) => new { unit.Name, unit.Province, unit.Ward, unit.Address,
        unit.ContactName, unit.ContactPosition, unit.ContactPhone, unit.Email, unit.SchoolPhone, unit.Note };
}

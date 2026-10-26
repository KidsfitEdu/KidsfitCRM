using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    public Task<long> InviteSchoolCollaborator(CreateSchoolInvitationRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolAllocationManage, ct);
        if (!access.CanManageOrganization(request.OrganizationId)) throw new KeyNotFoundException();
        var key = SchoolKey(request.IdempotencyKey); var hash = ChannelSalesValidation.Fingerprint(request);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await ActiveSchoolMembership(request.AssigneeUserId, request.OrganizationId, ct);
        var assignee = await ChannelSalesAccess.Load(db, request.AssigneeUserId, ct);
        if (!assignee.Has(Permissions.ChannelSalesRegister)) throw ApiValidationException.For("assignee_user_id", "Nhân sự chưa có quyền tiếp cận trường.");
        var school = await db.DirectorySchools.SingleOrDefaultAsync(x => x.Id == request.SchoolId, ct) ?? throw new KeyNotFoundException();
        await LockCustomer(school.CustomerId, ct);
        var replay = await db.SchoolInvitations.SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.AssignedByUserId, actorId, replay.RequestFingerprint, hash);
        await CheckSchoolCapacity(request.AssigneeUserId, request.OrganizationId, ct);
        var now = DateTime.UtcNow;
        await EnsureSchoolAvailable(school.CustomerId, now, ct);
        if (await db.SchoolInvitations.AnyAsync(x => x.DirectorySchoolId == school.Id && x.Status == "PENDING" && x.RespondBy > now, ct))
            throw new ApiConflictException("Trường đang có lời mời còn hạn. Cần chờ phản hồi hoặc hủy lời mời trước khi phân bổ lại.");
        var policy = await ActiveSchoolPolicy(request.OrganizationId, ct);
        var invitation = new SchoolInvitation
        {
            DirectorySchoolId = school.Id, OrganizationId = request.OrganizationId, AssigneeUserId = request.AssigneeUserId,
            AssignedByUserId = actorId, Reason = Validation.Required(request.Reason, "reason", "Cần lý do phân bổ.", 2000),
            RespondBy = policy is null ? SchoolFuture(request.RespondBy, "respond_by", now) : now.AddHours(policy.InvitationHours),
            IdempotencyKey = key, RequestFingerprint = hash, CreatedAt = now, UpdatedAt = now,
        };
        db.SchoolInvitations.Add(invitation); await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "INVITE_SCHOOL_COLLABORATOR", nameof(SchoolInvitation), invitation.Id, null,
            new { invitation.DirectorySchoolId, invitation.OrganizationId, invitation.AssigneeUserId, invitation.RespondBy, invitation.Reason }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return invitation.Id;
    }, ct);

    public Task<long> RespondSchoolInvitation(long id, RespondSchoolInvitationRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        await RequirePermission(actorId, Permissions.ChannelSalesRegister, ct);
        var lookup = await db.SchoolInvitations.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.AssigneeUserId == actorId, ct) ?? throw new KeyNotFoundException();
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await ActiveSchoolMembership(actorId, lookup.OrganizationId, ct);
        var school = await db.DirectorySchools.SingleAsync(x => x.Id == lookup.DirectorySchoolId, ct);
        await LockCustomer(school.CustomerId, ct);
        var invitation = await db.SchoolInvitations.FromSqlInterpolated($"SELECT * FROM school_invitations WHERE id = {id} FOR UPDATE").SingleAsync(ct);
        var reason = CleanOptional(request.Reason, 2000);
        var target = request.Accept ? "ACCEPTED" : "DECLINED";
        if (invitation.Status == target && invitation.ResponseReason == reason) return invitation.ApproachRegistrationId ?? invitation.Id;
        if (invitation.Status != "PENDING" || invitation.RespondBy <= DateTime.UtcNow) throw new ApiConflictException("Lời mời đã kết thúc hoặc hết hạn.");
        if (!request.Accept && reason is null) throw ApiValidationException.For("reason", "Cần lý do từ chối như ở xa hoặc quá tải.");
        var now = DateTime.UtcNow;
        if (request.Accept)
        {
            await CheckSchoolCapacity(actorId, invitation.OrganizationId, ct);
            await EnsureSchoolAvailable(school.CustomerId, now, ct);
            var registration = new ApproachRegistration
            {
                CustomerId = school.CustomerId, OwnerUserId = actorId, OwnerOrganizationId = invitation.OrganizationId,
                CreatedByUserId = actorId, RegisteredAt = now, ProtectedUntil = now.AddHours(120), Source = "SCHOOL_ALLOCATION",
                IdempotencyKey = "school-invitation-" + invitation.Id, RequestFingerprint = ChannelSalesValidation.Fingerprint(request, invitation.Id),
                CreatedAt = now, UpdatedAt = now,
            };
            db.ApproachRegistrations.Add(registration); await db.SaveChangesAsync(ct);
            db.CustomerProtections.Add(new CustomerProtection
            {
                CustomerId = school.CustomerId, OwnerUserId = actorId, OwnerOrganizationId = invitation.OrganizationId,
                ApproachRegistrationId = registration.Id, EffectiveFrom = now, EffectiveUntil = registration.ProtectedUntil,
                CreatedAt = now, UpdatedAt = now,
            });
            db.CustomerActivities.Add(new CustomerActivity
            {
                CustomerId = school.CustomerId, ApproachRegistrationId = registration.Id, UserId = actorId,
                ActivityType = "APPROACH_REGISTERED", Content = "Nhận trường từ lời mời phân bổ.", OccurredAt = now, CreatedAt = now, UpdatedAt = now,
            });
            invitation.ApproachRegistrationId = registration.Id;
        }
        invitation.Status = target; invitation.ResponseReason = reason; invitation.RespondedAt = now; invitation.UpdatedAt = now;
        Audit.Add(db, actorId, "RESPOND_SCHOOL_INVITATION", nameof(SchoolInvitation), id, new { status = "PENDING" },
            new { invitation.Status, invitation.ResponseReason, invitation.ApproachRegistrationId, invitation.RespondedAt }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return invitation.ApproachRegistrationId ?? invitation.Id;
    }, ct);

    public Task<long> CancelSchoolInvitation(long id, string? reasonValue, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolAllocationManage, ct);
        var reason = Validation.Required(reasonValue, "reason", "Cần lý do hủy hoặc đổi nhân sự nhận trường.", 2000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var invitation = await db.SchoolInvitations.FromSqlInterpolated($"SELECT * FROM school_invitations WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(invitation.OrganizationId)) throw new KeyNotFoundException();
        if (invitation.Status == "CANCELLED" && invitation.ResponseReason == reason) return id;
        if (invitation.Status != "PENDING") throw new ApiConflictException("Chỉ hủy được lời mời chưa được nhận hoặc từ chối.");
        invitation.Status = "CANCELLED"; invitation.ResponseReason = reason; invitation.RespondedAt = DateTime.UtcNow; invitation.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, actorId, "CANCEL_SCHOOL_INVITATION", nameof(SchoolInvitation), id, new { status = "PENDING" }, new { invitation.Status, reason }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return id;
    }, ct);

    public Task<long> RequestSchoolExtension(long registrationId, RequestSchoolExtensionRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        await RequirePermission(actorId, Permissions.ChannelSalesRegister, ct);
        var key = SchoolKey(request.IdempotencyKey); var hash = ChannelSalesValidation.Fingerprint(request, registrationId);
        var lookup = await db.ApproachRegistrations.AsNoTracking().SingleOrDefaultAsync(x => x.Id == registrationId && x.OwnerUserId == actorId, ct) ?? throw new KeyNotFoundException();
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var member = await ActiveSchoolMembership(actorId, lookup.OwnerOrganizationId, ct);
        await LockCustomer(lookup.CustomerId, ct);
        var registration = await db.ApproachRegistrations.FromSqlInterpolated($"SELECT * FROM approach_registrations WHERE id = {registrationId} FOR UPDATE").SingleAsync(ct);
        var replay = await db.SchoolExtensionRequests.SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.RequestedByUserId, actorId, replay.RequestFingerprint, hash);
        var now = DateTime.UtcNow;
        if (!await db.DirectorySchools.AnyAsync(x => x.CustomerId == lookup.CustomerId, ct)) throw new KeyNotFoundException();
        if (registration.Status != "ACTIVE" || registration.ProtectedUntil <= now) throw new ApiConflictException("Chỉ xin gia hạn trước khi quyền tiếp cận hết hạn.");
        if (await db.SchoolExtensionRequests.AnyAsync(x => x.ApproachRegistrationId == registrationId && x.Status == "PENDING", ct)) throw new ApiConflictException("Lượt tiếp cận đã có yêu cầu gia hạn đang chờ.");
        var managerId = member.ManagerUserId ?? throw ApiValidationException.For("manager", "Chưa có Quản lý trực tiếp nhận yêu cầu.");
        var manager = await ChannelSalesAccess.Load(db, managerId, ct);
        if (!manager.Has(Permissions.SchoolExtensionReview) || !manager.CanManageOrganization(registration.OwnerOrganizationId) || managerId == actorId) throw new ApiConflictException("Quản lý trực tiếp chưa được cấp quyền duyệt gia hạn.");
        var policy = await ActiveSchoolPolicy(registration.OwnerOrganizationId, ct);
        var due = SchoolDeadline(now, policy?.ManagerReviewHours, request.ReviewDueAt);
        var extension = new SchoolExtensionRequest
        {
            ApproachRegistrationId = registrationId, OrganizationId = registration.OwnerOrganizationId, RequestedByUserId = actorId, ManagerUserId = managerId,
            OriginalProtectedUntil = SchoolUtc(registration.ProtectedUntil), RequestedUntil = SchoolFuture(request.RequestedUntil, "requested_until", registration.ProtectedUntil),
            ReviewDueAt = due < registration.ProtectedUntil ? due : registration.ProtectedUntil,
            NextAppointmentAt = SchoolFuture(request.NextAppointmentAt, "next_appointment_at", now),
            Progress = Validation.Required(request.Progress, "progress", "Cần báo cáo tiến độ.", 4000),
            EvidenceReference = Validation.Required(request.EvidenceReference, "evidence_reference", "Cần bằng chứng hoặc lịch hẹn.", 500),
            IdempotencyKey = key, RequestFingerprint = hash, CreatedAt = now, UpdatedAt = now,
        };
        if (extension.NextAppointmentAt > extension.RequestedUntil) throw ApiValidationException.For("next_appointment_at", "Lịch hẹn phải nằm trong thời gian xin gia hạn.");
        db.SchoolExtensionRequests.Add(extension); await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "REQUEST_SCHOOL_EXTENSION", nameof(SchoolExtensionRequest), extension.Id, null,
            new { extension.ApproachRegistrationId, extension.RequestedUntil, extension.ReviewDueAt, extension.NextAppointmentAt }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return extension.Id;
    }, ct);

    public Task<long> ReviewSchoolExtension(long id, ReviewSchoolExtensionRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await ChannelSalesAccess.Load(db, actorId, ct);
        var lookup = await db.SchoolExtensionRequests.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(lookup.OrganizationId) || (!(access.Has(Permissions.SchoolExtensionReview) && (lookup.ManagerUserId == actorId || access.All))
            && !(access.Has(Permissions.SchoolEscalationResolve) && lookup.ReviewDueAt <= DateTime.UtcNow))) throw new KeyNotFoundException();
        var reason = Validation.Required(request.Reason, "reason", "Cần lý do quyết định gia hạn.", 4000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        // Match registration/allocation/offboarding lock order: membership, customer, registration, request.
        var registrationInfo = await db.ApproachRegistrations.AsNoTracking().SingleAsync(x => x.Id == lookup.ApproachRegistrationId, ct);
        await ActiveSchoolMembership(registrationInfo.OwnerUserId, lookup.OrganizationId, ct);
        await LockCustomer(registrationInfo.CustomerId, ct);
        var registration = await db.ApproachRegistrations.FromSqlInterpolated($"SELECT * FROM approach_registrations WHERE id = {lookup.ApproachRegistrationId} FOR UPDATE").SingleAsync(ct);
        var extension = await db.SchoolExtensionRequests.FromSqlInterpolated($"SELECT * FROM school_extension_requests WHERE id = {id} FOR UPDATE").SingleAsync(ct);
        if (actorId == extension.RequestedByUserId) throw new ApiConflictException("Người xin không tự duyệt gia hạn.");
        var target = request.Approve ? "APPROVED" : "REJECTED";
        if (extension.Status == target && extension.ReviewedByUserId == actorId && extension.DecisionReason == reason
            && (!request.Approve || (request.ApprovedUntil.HasValue && request.NextReviewAt.HasValue && extension.ApprovedUntil == SchoolUtc(request.ApprovedUntil.Value) && extension.NextReviewAt == SchoolUtc(request.NextReviewAt.Value)))) return id;
        if (extension.Status != "PENDING") throw new ApiConflictException("Yêu cầu gia hạn đã có quyết định.");
        var now = DateTime.UtcNow;
        if (request.Approve)
        {
            if (registration.Status != "ACTIVE" || registration.ProtectedUntil <= now || SchoolUtc(registration.ProtectedUntil) != extension.OriginalProtectedUntil)
                throw new ApiConflictException("Quyền tiếp cận gốc đã hết hạn hoặc thay đổi. Không thể dùng yêu cầu cũ để khôi phục quyền.");
            if (await db.CustomerProtections.AnyAsync(x => x.CustomerId == registration.CustomerId && x.Status == "ACTIVE" && x.EffectiveUntil > now && x.ApproachRegistrationId != registration.Id, ct))
                throw new ApiConflictException("Đã có quyền hợp lệ khác; không ghi đè người đang được bảo vệ.");
            var policy = await ActiveSchoolPolicy(extension.OrganizationId, ct) ?? throw new ApiConflictException("Admin cần xác nhận chính sách gia hạn trước khi duyệt. Các con số gợi ý chưa tự có hiệu lực.");
            var until = SchoolFuture(request.ApprovedUntil, "approved_until", registration.ProtectedUntil);
            var nextReview = SchoolFuture(request.NextReviewAt, "next_review_at", now);
            var count = await db.SchoolExtensionRequests.CountAsync(x => x.ApproachRegistrationId == registration.Id && x.Status == "APPROVED", ct);
            if (until > extension.RequestedUntil || until > registration.ProtectedUntil.AddDays(policy.MaxExtensionDays)
                || until > registration.RegisteredAt.AddHours(120).AddDays(policy.MaxTotalExtensionDays) || count >= policy.MaxExtensionCount)
                throw ApiValidationException.For("approved_until", "Gia hạn vượt thời gian xin hoặc giới hạn của chính sách đang áp dụng.");
            if (nextReview > until) throw ApiValidationException.For("next_review_at", "Ngày rà soát phải nằm trong hạn mới.");
            registration.ProtectedUntil = until; registration.UpdatedAt = now;
            await db.CustomerProtections.Where(x => x.ApproachRegistrationId == registration.Id && x.SourceType == "APPROACH" && x.Status == "ACTIVE")
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.EffectiveUntil, until).SetProperty(x => x.UpdatedAt, now), ct);
            extension.ApprovedUntil = until; extension.NextReviewAt = nextReview; extension.PolicyVersionId = policy.Id;
        }
        extension.Status = target; extension.ReviewedByUserId = actorId; extension.ReviewedAt = now; extension.DecisionReason = reason; extension.UpdatedAt = now;
        Audit.Add(db, actorId, "REVIEW_SCHOOL_EXTENSION", nameof(SchoolExtensionRequest), id, new { status = "PENDING" },
            new { extension.Status, extension.ApprovedUntil, extension.NextReviewAt, extension.PolicyVersionId, reason }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return id;
    }, ct);

    private async Task EnsureSchoolAvailable(long customerId, DateTime now, CancellationToken ct)
    {
        await ExpireElapsedApproach(customerId, now, ct);
        if (await db.CustomerProtections.AnyAsync(x => x.CustomerId == customerId && x.Status == "ACTIVE" && x.EffectiveUntil > now, ct))
            throw new ApiConflictException("Trường đang có quyền tiếp cận hoặc hợp đồng được bảo vệ.");
    }
}

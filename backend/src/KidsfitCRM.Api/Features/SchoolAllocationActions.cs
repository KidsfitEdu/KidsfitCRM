using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using KidsfitCRM.Api.Features.Schools.Allocations;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    public Task<long> InviteSchoolCollaborator(CreateSchoolInvitationRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolAllocationManage, ct);
        // Organization comes from the eligible active Sales/CTV membership.
        // Older clients may still pass an explicit organization; validate it instead
        // of trusting the request. Multiple eligible memberships are ambiguous.
        var candidates = await db.OrganizationMemberships.AsNoTracking()
            .Where(m => m.UserId == request.AssigneeUserId && m.Status == "ACTIVE"
                && access.OrganizationIds.Contains(m.OrganizationId)
                && (m.MembershipType == "SALES" || m.MembershipType == "CHANNEL_SALES"
                    || m.MembershipType == "COLLABORATOR" || m.MembershipType == "PARTNER_COLLABORATOR")
                && (access.All || (access.Organization && m.ManagerUserId == actorId))
                && (!request.OrganizationId.HasValue || m.OrganizationId == request.OrganizationId.Value))
            .Select(m => m.OrganizationId).Distinct().ToArrayAsync(ct);
        if (candidates.Length == 0) throw new KeyNotFoundException();
        if (candidates.Length > 1)
            throw ApiValidationException.For("assignee_user_id", "Sales/CTV thuộc nhiều tổ chức. Cần xác định tổ chức trước khi phân bổ.");
        var organizationId = candidates[0];
        if (!access.CanManageOrganization(organizationId)) throw new KeyNotFoundException();
        var key = SchoolKey(request.IdempotencyKey); var hash = ChannelSalesValidation.Fingerprint(request);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var membership = await ActiveSchoolMembership(request.AssigneeUserId, organizationId, ct);
        if (!access.All && membership.ManagerUserId != actorId) throw new KeyNotFoundException();
        var assignee = await ChannelSalesAccess.Load(db, request.AssigneeUserId, ct);
        if (!assignee.Has(Permissions.ChannelSalesRegister)) throw ApiValidationException.For("assignee_user_id", "Nhân sự chưa có quyền tiếp cận trường.");
        var school = await db.DirectorySchools.SingleOrDefaultAsync(x => x.Id == request.SchoolId && !x.IsDeleted, ct) ?? throw new KeyNotFoundException();
        await LockCustomer(school.CustomerId, ct);
        var replay = await db.SchoolInvitations.SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.AssignedByUserId, actorId, replay.RequestFingerprint, hash);
        await CheckSchoolCapacity(request.AssigneeUserId, organizationId, ct);
        var now = DateTime.UtcNow;
        await EnsureSchoolAvailable(school.CustomerId, now, ct);
        if (await db.SchoolInvitations.AnyAsync(x => x.DirectorySchoolId == school.Id && x.Status == "PENDING" && x.RespondBy > now, ct))
            throw new ApiConflictException("Trường đang có lời mời còn hạn. Cần chờ phản hồi hoặc hủy lời mời trước khi phân bổ lại.");
        var policy = await ActiveSchoolPolicy(organizationId, ct);
        var invitation = new SchoolInvitation
        {
            DirectorySchoolId = school.Id, OrganizationId = organizationId, AssigneeUserId = request.AssigneeUserId,
            AssignedByUserId = actorId, Reason = Validation.Required(request.Reason, "reason", "Vui lòng nhập lý do phân bổ trường.", 2000),
            RespondBy = policy is null ? now.AddHours(24) : now.AddHours(policy.InvitationHours),
            IdempotencyKey = key, RequestFingerprint = hash, CreatedAt = now, UpdatedAt = now,
        };
        db.SchoolInvitations.Add(invitation); await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "INVITE_SCHOOL_COLLABORATOR", nameof(SchoolInvitation), invitation.Id, null,
            new { invitation.DirectorySchoolId, invitation.OrganizationId, invitation.AssigneeUserId, invitation.RespondBy, invitation.Reason }, http);
        var inviteIsCollaborator = membership.MembershipType is "COLLABORATOR" or "PARTNER_COLLABORATOR";
        CrmNotificationWriter.Add(db, organizationId, invitation.AssigneeUserId,
            "SCHOOL_INVITATION_NEW", nameof(SchoolInvitation), invitation.Id, "Trường mới được phân bổ",
            "Quản lý đã gửi lời mời tiếp cận một trường. Vui lòng xem và phản hồi.",
            inviteIsCollaborator ? "role-collaborator-invitations" : "role-sales-staff-schools");
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
        SchoolInvitationResponsePolicy.EnsurePending(
            invitation.Status, invitation.RespondBy, DateTime.UtcNow, request.Accept, reason);
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
        await db.CrmNotifications.Where(x => x.EntityType == nameof(SchoolInvitation)
            && x.EntityId == invitation.Id && x.Kind == "SCHOOL_INVITATION_NEW" && x.Status == "OPEN")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "RESOLVED")
                .SetProperty(x => x.ResolvedAt, now), ct);
        CrmNotificationWriter.Add(db, invitation.OrganizationId, invitation.AssignedByUserId,
            request.Accept ? "SCHOOL_INVITATION_ACCEPTED" : "SCHOOL_INVITATION_DECLINED",
            nameof(SchoolInvitation), invitation.Id, request.Accept ? "Sales/CTV đã nhận trường" : "Sales/CTV từ chối nhận trường",
            request.Accept ? "Người được phân bổ đã chấp nhận lời mời tiếp cận trường." : "Người được phân bổ đã từ chối lời mời; mở danh sách để xem lý do.",
            "manager-allocations");
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return invitation.ApproachRegistrationId ?? invitation.Id;
    }, ct);

    public Task<long> CancelSchoolInvitation(long id, string? reasonValue, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolAllocationManage, ct);
        var reason = Validation.Required(reasonValue, "reason", "Cần lý do hủy hoặc đổi nhân sự nhận trường.", 2000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var invitation = await db.SchoolInvitations.FromSqlInterpolated($"SELECT * FROM school_invitations WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(invitation.OrganizationId)
            || (!access.All && !await db.OrganizationMemberships.AnyAsync(m =>
                m.UserId == invitation.AssigneeUserId && m.OrganizationId == invitation.OrganizationId
                && m.ManagerUserId == actorId, ct)))
            throw new KeyNotFoundException();
        if (invitation.Status == "CANCELLED" && invitation.ResponseReason == reason) return id;
        if (invitation.Status != "PENDING") throw new ApiConflictException("Chỉ hủy được lời mời chưa được nhận hoặc từ chối.");
        invitation.Status = "CANCELLED"; invitation.ResponseReason = reason; invitation.RespondedAt = DateTime.UtcNow; invitation.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, actorId, "CANCEL_SCHOOL_INVITATION", nameof(SchoolInvitation), id, new { status = "PENDING" }, new { invitation.Status, reason }, http);
        await db.CrmNotifications.Where(x => x.EntityType == nameof(SchoolInvitation)
            && x.EntityId == invitation.Id && x.Kind == "SCHOOL_INVITATION_NEW" && x.Status == "OPEN")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "RESOLVED")
                .SetProperty(x => x.ResolvedAt, invitation.RespondedAt), ct);
        var cancelIsCollaborator = await db.OrganizationMemberships.AsNoTracking().AnyAsync(m =>
            m.UserId == invitation.AssigneeUserId && m.OrganizationId == invitation.OrganizationId
            && m.Status == "ACTIVE" && (m.MembershipType == "COLLABORATOR" || m.MembershipType == "PARTNER_COLLABORATOR"), ct);
        CrmNotificationWriter.Add(db, invitation.OrganizationId, invitation.AssigneeUserId, "SCHOOL_INVITATION_CANCELLED",
            nameof(SchoolInvitation), invitation.Id, "Lời mời nhận trường đã bị hủy",
            "Quản lý đã hủy lời mời tiếp cận trường. Vui lòng kiểm tra danh sách phân bổ.",
            cancelIsCollaborator ? "role-collaborator-invitations" : "role-sales-staff-schools");
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
        if (!await db.DirectorySchools.AnyAsync(x => x.CustomerId == lookup.CustomerId && !x.IsDeleted, ct)) throw new KeyNotFoundException();
        if (registration.Status != "ACTIVE" || registration.ProtectedUntil <= now) throw new ApiConflictException("Chỉ xin gia hạn trước khi quyền tiếp cận hết hạn.");
        if (await db.SchoolExtensionRequests.AnyAsync(x => x.ApproachRegistrationId == registrationId && x.Status == "PENDING", ct)) throw new ApiConflictException("Lượt tiếp cận đã có yêu cầu gia hạn đang chờ.");
        var managerId = member.ManagerUserId ?? throw ApiValidationException.For("manager", "Chưa có Quản lý trực tiếp nhận yêu cầu.");
        var manager = await ChannelSalesAccess.Load(db, managerId, ct);
        if (!manager.Has(Permissions.SchoolExtensionReview) || !manager.CanManageOrganization(registration.OwnerOrganizationId) || managerId == actorId) throw new ApiConflictException("Quản lý trực tiếp chưa được cấp quyền duyệt gia hạn.");
        var policy = await ActiveSchoolPolicy(registration.OwnerOrganizationId, ct)
            ?? throw new ApiConflictException("Admin chưa kích hoạt chính sách gia hạn của tổ chức.");
        var approvedCount = await db.SchoolExtensionRequests.CountAsync(x =>
            x.ApproachRegistrationId == registrationId && x.Status == "APPROVED", ct);
        if (approvedCount >= policy.MaxExtensionCount)
            throw new ApiConflictException("Đã đạt số lần gia hạn tối đa theo chính sách.");
        // The CRM proposes the maximum valid period from the active organization's policy.
        // Explicit dates from older clients remain accepted, subject to the same constraints.
        var maxPerRequest = registration.ProtectedUntil.AddDays(policy.MaxExtensionDays);
        var maxCumulative = registration.RegisteredAt.AddHours(120).AddDays(policy.MaxTotalExtensionDays);
        var maximumUntil = maxPerRequest < maxCumulative ? maxPerRequest : maxCumulative;
        if (maximumUntil <= registration.ProtectedUntil)
            throw new ApiConflictException("Đã hết thời gian gia hạn theo chính sách.");
        var requestedUntil = request.RequestedUntil.HasValue
            ? SchoolFuture(request.RequestedUntil, "requested_until", registration.ProtectedUntil)
            : maximumUntil;
        if (requestedUntil > maximumUntil)
            throw ApiValidationException.For("requested_until", "Thời gian xin gia hạn vượt giới hạn chính sách.");
        var due = SchoolDeadline(now, policy.ManagerReviewHours, request.ReviewDueAt);
        var extension = new SchoolExtensionRequest
        {
            ApproachRegistrationId = registrationId, OrganizationId = registration.OwnerOrganizationId, RequestedByUserId = actorId, ManagerUserId = managerId,
            OriginalProtectedUntil = SchoolUtc(registration.ProtectedUntil), RequestedUntil = requestedUntil,
            ReviewDueAt = due < registration.ProtectedUntil ? due : registration.ProtectedUntil,
            // An appointment is optional; never invent a date when the Sales user did not supply one.
            NextAppointmentAt = request.NextAppointmentAt.HasValue
                ? SchoolFuture(request.NextAppointmentAt, "next_appointment_at", now) : null,
            Progress = Validation.Required(request.Progress, "progress", "Cần nhập lý do xin gia hạn.", 4000),
            // Retain historical evidence references, but do not require a new document code.
            EvidenceReference = CleanOptional(request.EvidenceReference, 500) ?? "",
            IdempotencyKey = key, RequestFingerprint = hash, CreatedAt = now, UpdatedAt = now,
        };
        if (extension.NextAppointmentAt.HasValue && extension.NextAppointmentAt.Value > extension.RequestedUntil) throw ApiValidationException.For("next_appointment_at", "Lịch hẹn phải nằm trong thời gian xin gia hạn.");
        db.SchoolExtensionRequests.Add(extension); await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "REQUEST_SCHOOL_EXTENSION", nameof(SchoolExtensionRequest), extension.Id, null,
            new { extension.ApproachRegistrationId, extension.RequestedUntil, extension.ReviewDueAt, extension.NextAppointmentAt }, http);
        var requestedSchoolName = await db.ChannelCustomers.AsNoTracking()
            .Where(x => x.Id == registration.CustomerId).Select(x => x.DisplayName).SingleAsync(ct);
        CrmNotificationWriter.Add(db, extension.OrganizationId, extension.ManagerUserId, "SCHOOL_EXTENSION_REQUESTED",
            nameof(SchoolExtensionRequest), extension.Id, "Yêu cầu gia hạn tiếp cận",
            $"Sales/CTV đã gửi yêu cầu gia hạn tiếp cận {requestedSchoolName}. Vui lòng xem và xét duyệt.", "manager-extensions");
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return extension.Id;
    }, ct);

    public Task<long> ReviewSchoolExtension(long id, ReviewSchoolExtensionRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await ChannelSalesAccess.Load(db, actorId, ct);
        var lookup = await db.SchoolExtensionRequests.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(lookup.OrganizationId) || (!(access.Has(Permissions.SchoolExtensionReview) && (lookup.ManagerUserId == actorId || access.All))
            && !(access.Has(Permissions.SchoolEscalationResolve) && lookup.ReviewDueAt <= DateTime.UtcNow))) throw new KeyNotFoundException();
        var reason = request.Approve
            ? (string.IsNullOrWhiteSpace(request.Reason)
                ? "Quản lý duyệt gia hạn theo chính sách CRM."
                : Validation.Required(request.Reason, "reason", "Lý do duyệt không hợp lệ.", 4000))
            : Validation.Required(request.Reason, "reason", "Vui lòng nhập lý do từ chối gia hạn.", 4000);
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
            && (!request.Approve || (extension.ApprovedUntil == SchoolUtc(request.ApprovedUntil ?? extension.RequestedUntil)
                && extension.NextReviewAt == SchoolUtc(request.NextReviewAt ?? request.ApprovedUntil ?? extension.RequestedUntil)))) return id;
        if (extension.Status != "PENDING") throw new ApiConflictException("Yêu cầu gia hạn đã có quyết định.");
        var now = DateTime.UtcNow;
        if (request.Approve)
        {
            if (registration.Status != "ACTIVE" || registration.ProtectedUntil <= now || SchoolUtc(registration.ProtectedUntil) != extension.OriginalProtectedUntil)
                throw new ApiConflictException("Quyền tiếp cận gốc đã hết hạn hoặc thay đổi. Không thể dùng yêu cầu cũ để khôi phục quyền.");
            if (await db.CustomerProtections.AnyAsync(x => x.CustomerId == registration.CustomerId && x.Status == "ACTIVE" && x.EffectiveUntil > now && x.ApproachRegistrationId != registration.Id, ct))
                throw new ApiConflictException("Đã có quyền hợp lệ khác; không ghi đè người đang được bảo vệ.");
            var policy = await ActiveSchoolPolicy(extension.OrganizationId, ct) ?? throw new ApiConflictException("Admin cần xác nhận chính sách gia hạn trước khi duyệt. Các con số gợi ý chưa tự có hiệu lực.");
            // The requested deadline was calculated and validated when Sales submitted
            // the extension. Manager approval requires confirmation, not re-entering dates.
            var until = SchoolFuture(request.ApprovedUntil ?? extension.RequestedUntil, "approved_until", registration.ProtectedUntil);
            var nextReview = SchoolFuture(request.NextReviewAt ?? until, "next_review_at", now);
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
        await db.CrmNotifications.Where(x => x.EntityType == nameof(SchoolExtensionRequest)
            && x.EntityId == id && (x.Kind == "SCHOOL_EXTENSION_REQUESTED" || x.Kind == "SCHOOL_EXTENSION_REVIEW_OVERDUE")
            && x.Status == "OPEN")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "RESOLVED")
                .SetProperty(x => x.ResolvedAt, now), ct);
        var salesIsCollaborator = await db.OrganizationMemberships.AsNoTracking().AnyAsync(m =>
            m.UserId == extension.RequestedByUserId && m.OrganizationId == extension.OrganizationId
            && m.Status == "ACTIVE" && (m.MembershipType == "COLLABORATOR" || m.MembershipType == "PARTNER_COLLABORATOR"), ct);
        var reviewedSchoolName = await db.ChannelCustomers.AsNoTracking()
            .Where(x => x.Id == registration.CustomerId).Select(x => x.DisplayName).SingleAsync(ct);
        CrmNotificationWriter.Add(db, extension.OrganizationId, extension.RequestedByUserId,
            request.Approve ? "SCHOOL_EXTENSION_APPROVED" : "SCHOOL_EXTENSION_REJECTED",
            nameof(SchoolExtensionRequest), extension.Id,
            request.Approve ? "Gia hạn đã được duyệt" : "Gia hạn bị từ chối",
            request.Approve ? $"Quản lý đã duyệt gia hạn tiếp cận {reviewedSchoolName}."
                : $"Quản lý đã từ chối gia hạn tiếp cận {reviewedSchoolName}; mở chi tiết để xem lý do.",
            salesIsCollaborator ? "role-collaborator-extensions" : "role-sales-staff-customers");
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return id;
    }, ct);

    private async Task EnsureSchoolAvailable(long customerId, DateTime now, CancellationToken ct)
    {
        await ExpireElapsedApproach(customerId, now, ct);
        if (await db.CustomerProtections.AnyAsync(x => x.CustomerId == customerId && x.Status == "ACTIVE" && x.EffectiveUntil > now, ct))
            throw new ApiConflictException("Trường đang có quyền tiếp cận hoặc hợp đồng được bảo vệ.");
    }
}

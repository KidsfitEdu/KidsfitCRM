using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    /// <summary>
    /// Release a team member's unsigned school approaches without suspending their
    /// membership/account. Pending invitations and extension requests are cancelled.
    /// Contract-backed approaches, contract protections, payouts and audit remain intact.
    /// </summary>
    public Task<long> ReleaseSchoolApproaches(long membershipId, ReleaseSchoolApproachesRequest request,
        long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolHandoverManage, ct);
        var key = SchoolKey(request.IdempotencyKey);
        var hash = ChannelSalesValidation.Fingerprint(request, membershipId);
        var reason = Validation.Required(request.Reason, "reason", "Cần lý do thu hồi quyền tiếp cận.", 2000);

        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var member = await db.OrganizationMemberships.FromSqlInterpolated(
            $"SELECT * FROM organization_memberships WHERE id = {membershipId} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();

        if (!access.CanManageOrganization(member.OrganizationId) || member.UserId == actorId
            || (!access.All && member.ManagerUserId != actorId))
            throw new KeyNotFoundException();
        if (!IsSchoolSales(member))
            throw new KeyNotFoundException();

        var replay = await db.SchoolHandovers.SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (replay is not null)
            return ChannelSalesValidation.Replay(replay.Id, replay.CompletedByUserId,
                actorId, replay.RequestFingerprint, hash);
        if (member.Status != "ACTIVE")
            throw new ApiConflictException("Chỉ có thể thu hồi trường của Sales đang hoạt động.");

        var now = DateTime.UtcNow;
        var registrations = await db.ApproachRegistrations
            .Where(x => x.OwnerUserId == member.UserId
                && x.OwnerOrganizationId == member.OrganizationId && x.Status == "ACTIVE")
            .OrderBy(x => x.CustomerId).ToListAsync(ct);
        var revoked = 0;
        foreach (var registration in registrations)
        {
            await LockCustomer(registration.CustomerId, ct);
            // Preserve a submitted/verified contract and its ownership, even when
            // this approach registration is also a candidate for withdrawal.
            if (await db.SalesContracts.AnyAsync(x =>
                x.ApproachRegistrationId == registration.Id
                && x.Status != "CANCELLED" && x.Status != "REJECTED", ct))
                continue;

            registration.Status = "REVOKED";
            registration.ExpiredAt = now;
            registration.UpdatedAt = now;
            revoked++;
            await db.CustomerProtections
                .Where(x => x.ApproachRegistrationId == registration.Id
                    && x.SourceType == "APPROACH" && x.Status == "ACTIVE")
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "REVOKED")
                    .SetProperty(x => x.UpdatedAt, now), ct);
            Audit.Add(db, actorId, "REVOKE_APPROACH_BY_MANAGER",
                nameof(ApproachRegistration), registration.Id,
                new { status = "ACTIVE" },
                new { registration.Status, member.Id, reason }, http);
        }

        // Invitation acceptance locks the customer before the invitation row.
        // Observe that same order so a concurrent acceptance cannot be overwritten
        // by a stale PENDING snapshot.
        var invitationCandidates = await db.SchoolInvitations.AsNoTracking()
            .Where(x => x.AssigneeUserId == member.UserId
                && x.OrganizationId == member.OrganizationId && x.Status == "PENDING")
            .Select(x => new { x.Id, x.DirectorySchoolId }).ToArrayAsync(ct);
        var cancelledInvitations = 0;
        foreach (var candidate in invitationCandidates)
        {
            var customerId = await db.DirectorySchools.AsNoTracking()
                .Where(s => s.Id == candidate.DirectorySchoolId)
                .Select(s => s.CustomerId).SingleAsync(ct);
            await LockCustomer(customerId, ct);
            var invitation = await db.SchoolInvitations.FromSqlInterpolated(
                $"SELECT * FROM school_invitations WHERE id = {candidate.Id} FOR UPDATE")
                .SingleAsync(ct);
            if (invitation.Status != "PENDING") continue;
            invitation.Status = "CANCELLED";
            invitation.ResponseReason = "Thu hồi để phân bổ lại.";
            invitation.RespondedAt = now;
            invitation.UpdatedAt = now;
            cancelledInvitations++;
            Audit.Add(db, actorId, "CANCEL_INVITATION_BY_MANAGER",
                nameof(SchoolInvitation), invitation.Id,
                new { status = "PENDING" },
                new { invitation.Status, member.Id, reason }, http);
        }

        var extensionCandidates = await db.SchoolExtensionRequests.AsNoTracking()
            .Where(x => x.RequestedByUserId == member.UserId
                && x.OrganizationId == member.OrganizationId && x.Status == "PENDING")
            .Select(x => new { x.Id, x.ApproachRegistrationId }).ToArrayAsync(ct);
        var cancelledExtensions = 0;
        foreach (var candidate in extensionCandidates)
        {
            // Extension approval also locks customer before the extension row.
            var customerId = await db.ApproachRegistrations.AsNoTracking()
                .Where(r => r.Id == candidate.ApproachRegistrationId)
                .Select(r => r.CustomerId).SingleAsync(ct);
            await LockCustomer(customerId, ct);
            var extension = await db.SchoolExtensionRequests.FromSqlInterpolated(
                $"SELECT * FROM school_extension_requests WHERE id = {candidate.Id} FOR UPDATE")
                .SingleAsync(ct);
            if (extension.Status != "PENDING") continue;
            extension.Status = "CANCELLED";
            extension.DecisionReason = "Quản lý thu hồi quyền tiếp cận; yêu cầu gia hạn được hủy.";
            extension.ReviewedByUserId = actorId;
            extension.ReviewedAt = now;
            extension.UpdatedAt = now;
            cancelledExtensions++;
            Audit.Add(db, actorId, "CANCEL_EXTENSION_BY_MANAGER",
                nameof(SchoolExtensionRequest), extension.Id,
                new { status = "PENDING" },
                new { extension.Status, member.Id, reason }, http);
        }

        if (revoked == 0 && cancelledInvitations == 0 && cancelledExtensions == 0)
            throw new ApiConflictException("Sales không có lượt tiếp cận hoặc yêu cầu đang chờ có thể thu hồi.");

        // Reuse the audited/idempotent handover journal; this operation deliberately
        // never changes OrganizationMembership.Status or User.Status.
        var journal = new SchoolHandover
        {
            MembershipId = member.Id, OrganizationId = member.OrganizationId,
            UserId = member.UserId, CompletedByUserId = actorId,
            Reason = reason,
            Summary = $"Thu hồi quyền tiếp cận: {revoked} trường, hủy {cancelledInvitations} lời mời phân bổ và {cancelledExtensions} yêu cầu gia hạn. Không ngưng Sales.",
            RevokedRegistrations = revoked, AccountSuspended = false,
            IdempotencyKey = key, RequestFingerprint = hash,
            CreatedAt = now, UpdatedAt = now
        };
        db.SchoolHandovers.Add(journal);
        await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "RELEASE_SCHOOL_APPROACHES",
            nameof(SchoolHandover), journal.Id, null,
            new { member.Id, revoked, cancelled_invitations = cancelledInvitations,
                cancelled_extensions = cancelledExtensions, reason,
                membership_status = member.Status }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return journal.Id;
    }, ct);
}

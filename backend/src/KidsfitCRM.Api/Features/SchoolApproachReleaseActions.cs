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
        if (!access.Has(Permissions.ChannelSalesIdentityManage) && !IsSchoolSales(member))
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

        var pendingInvitations = await db.SchoolInvitations
            .Where(x => x.AssigneeUserId == member.UserId
                && x.OrganizationId == member.OrganizationId && x.Status == "PENDING")
            .ToListAsync(ct);
        foreach (var invitation in pendingInvitations)
        {
            invitation.Status = "CANCELLED";
            invitation.ResponseReason = "Quản lý thu hồi quyền tiếp cận: " + reason;
            invitation.RespondedAt = now;
            invitation.UpdatedAt = now;
            Audit.Add(db, actorId, "CANCEL_INVITATION_BY_MANAGER",
                nameof(SchoolInvitation), invitation.Id,
                new { status = "PENDING" },
                new { invitation.Status, member.Id, reason }, http);
        }

        var pendingExtensions = await db.SchoolExtensionRequests
            .Where(x => x.RequestedByUserId == member.UserId
                && x.OrganizationId == member.OrganizationId && x.Status == "PENDING")
            .ToListAsync(ct);
        foreach (var extension in pendingExtensions)
        {
            extension.Status = "CANCELLED";
            extension.DecisionReason = "Quản lý thu hồi quyền tiếp cận: " + reason;
            extension.ReviewedByUserId = actorId;
            extension.ReviewedAt = now;
            extension.UpdatedAt = now;
            Audit.Add(db, actorId, "CANCEL_EXTENSION_BY_MANAGER",
                nameof(SchoolExtensionRequest), extension.Id,
                new { status = "PENDING" },
                new { extension.Status, member.Id, reason }, http);
        }

        if (revoked == 0 && pendingInvitations.Count == 0 && pendingExtensions.Count == 0)
            throw new ApiConflictException("Sales không có lượt tiếp cận hoặc yêu cầu đang chờ có thể thu hồi.");

        // Reuse the audited/idempotent handover journal; this operation deliberately
        // never changes OrganizationMembership.Status or User.Status.
        var journal = new SchoolHandover
        {
            MembershipId = member.Id, OrganizationId = member.OrganizationId,
            UserId = member.UserId, CompletedByUserId = actorId,
            Reason = reason,
            Summary = $"Thu hồi quyền tiếp cận: {revoked} trường, hủy {pendingInvitations.Count} lời mời phân bổ và {pendingExtensions.Count} yêu cầu gia hạn. Không ngưng Sales.",
            RevokedRegistrations = revoked, AccountSuspended = false,
            IdempotencyKey = key, RequestFingerprint = hash,
            CreatedAt = now, UpdatedAt = now
        };
        db.SchoolHandovers.Add(journal);
        await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "RELEASE_SCHOOL_APPROACHES",
            nameof(SchoolHandover), journal.Id, null,
            new { member.Id, revoked, cancelled_invitations = pendingInvitations.Count,
                cancelled_extensions = pendingExtensions.Count, reason,
                membership_status = member.Status }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return journal.Id;
    }, ct);
}

using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    private async Task ReconcileAuthorized(long caseId, bool confirm, ReconcileContractRequest request, long actorId, HttpContext http, CancellationToken cancellationToken)
    {
        var contractId = await db.ReconciliationCases.Where(x => x.Id == caseId).Select(x => (long?)x.ContractId).SingleOrDefaultAsync(cancellationToken) ?? throw new KeyNotFoundException();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        var now = DateTime.UtcNow;
        // Lock customer before contract to serialize protection transitions with Sales and KIDSFIT legacy workflows.
        var customerId = await db.SalesContracts.Where(x => x.Id == contractId)
            .Select(x => x.CustomerId).SingleAsync(cancellationToken);
        var customer = await LockCustomer(customerId, cancellationToken) ?? throw new KeyNotFoundException();
        var schoolContract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {contractId} FOR UPDATE").SingleAsync(cancellationToken);
        var reconciliation = await db.ReconciliationCases.FromSqlInterpolated($"SELECT * FROM reconciliation_cases WHERE id = {caseId} FOR UPDATE").SingleOrDefaultAsync(cancellationToken) ?? throw new KeyNotFoundException();
        await EnsureOrganizationScope(reconciliation.CheckeeOrganizationId, actorId, cancellationToken);
        var reason = CleanOptional(request.Reason, 2000);
        if (!confirm && string.IsNullOrWhiteSpace(reason)) throw ApiValidationException.For("reason", "Vui lòng nhập lý do tranh chấp.");
        if ((confirm && reconciliation.Status == "CONFIRMED") || (!confirm && reconciliation.Status == "DISPUTED" && reconciliation.DisputeReason == reason))
        {
            await transaction.CommitAsync(cancellationToken);
            return;
        }
        if (reconciliation.Status is "CONFIRMED" or "RESOLVED") throw new ApiConflictException("Hồ sơ đối soát đã kết thúc.");
        if (reconciliation.Status == "AWAITING_MANAGER") throw new ApiConflictException("Hồ sơ chưa được Quản lý chuyển CHECKEE.");
        var previous = reconciliation.Status;
        if (schoolContract.RequiresSchoolVerification && schoolContract.Status != "CANCELLED")
        {
            if (schoolContract.ManagerReviewedAt is null || schoolContract.Status is "NEEDS_REVISION" or "PENDING_REVIEW")
                throw new ApiConflictException("Cần quản lý kiểm tra và chuyển hồ sơ trước khi CHECKEE xác minh.");
            if (confirm && schoolContract.VerifiedAt is null)
            {
                // CHECKEE verification and five-year protection activate atomically.
                // Never override an unrelated owner's active protection.
                if (await db.CustomerProtections.AnyAsync(x => x.CustomerId == customerId
                    && x.Status == "ACTIVE" && x.EffectiveUntil > now
                    && x.ApproachRegistrationId != schoolContract.ApproachRegistrationId, cancellationToken))
                    throw new ApiConflictException("Trường hiện có quyền bảo vệ khác. Cần giải quyết tranh chấp, không ghi đè quyền.");

                var registration = await db.ApproachRegistrations.FromSqlInterpolated(
                    $"SELECT * FROM approach_registrations WHERE id = {schoolContract.ApproachRegistrationId} FOR UPDATE")
                    .SingleAsync(cancellationToken);
                if (registration.Status is "CANCELLED" or "EXPIRED")
                    throw new ApiConflictException("Quyền tiếp cận của hợp đồng không còn hợp lệ; cần kiểm tra trước khi xác minh.");

                schoolContract.VerifiedAt = now;
                schoolContract.ProtectionStartsAt = now;
                schoolContract.ProtectionUntil = now.AddYears(5);
                schoolContract.Status = "ACTIVE";
                schoolContract.UpdatedAt = now;
                customer.LifecycleStatus = "CONTRACTED";
                customer.UpdatedAt = now;
                registration.Status = "CONVERTED";
                registration.UpdatedAt = now;
                await db.CustomerProtections.Where(x => x.ApproachRegistrationId == registration.Id
                    && x.SourceType == "APPROACH" && x.Status == "ACTIVE")
                    .ExecuteUpdateAsync(x => x.SetProperty(p => p.Status, "CONVERTED")
                        .SetProperty(p => p.UpdatedAt, now), cancellationToken);
                db.CustomerProtections.Add(new CustomerProtection {
                    CustomerId = customerId, OwnerUserId = schoolContract.OwnerUserId,
                    OwnerOrganizationId = schoolContract.OwnerOrganizationId,
                    ContractId = schoolContract.Id, SourceType = "CONTRACT",
                    EffectiveFrom = now, EffectiveUntil = now.AddYears(5),
                    CreatedAt = now, UpdatedAt = now
                });
                Audit.Add(db, actorId, "AUTO_GRANT_VERIFIED_SCHOOL_PROTECTION", nameof(SalesContract),
                    schoolContract.Id, null, new { schoolContract.VerifiedAt, schoolContract.ProtectionUntil }, http);
            }
        }
        reconciliation.Status = confirm ? "CONFIRMED" : "DISPUTED";
        reconciliation.DisputeReason = confirm ? null : reason;
        reconciliation.ResolvedAt = confirm ? now : null;
        reconciliation.UpdatedAt = now;
        db.ReconciliationEvents.Add(new ReconciliationEvent
        {
            ReconciliationCaseId = reconciliation.Id,
            ActorUserId = actorId,
            EventType = confirm ? "CONFIRMED" : "DISPUTED",
            Reason = reason,
            CreatedAt = now,
            UpdatedAt = now,
        });
        Audit.Add(db, actorId, confirm ? "CONFIRM_RECONCILIATION" : "DISPUTE_RECONCILIATION", nameof(ReconciliationCase), reconciliation.Id,
            new { status = previous }, new { reconciliation.Status, reconciliation.DisputeReason }, http);
        await db.CrmNotifications.Where(x => x.EntityType == nameof(SalesContract)
            && x.EntityId == schoolContract.Id && x.Kind == "CONTRACT_FORWARDED_TO_CHECKEE" && x.Status == "OPEN")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "RESOLVED")
                .SetProperty(x => x.ResolvedAt, now), cancellationToken);
        if (schoolContract.RequiresSchoolVerification)
        {
            // An already completed reconciliation may later be re-opened by an authorized business path.
            // The Nth real transition gets a new notice; replay of the same state returns earlier.
            var occurrence = await db.ReconciliationEvents.AsNoTracking()
                .CountAsync(x => x.ReconciliationCaseId == reconciliation.Id
                    && x.EventType == (confirm ? "CONFIRMED" : "DISPUTED"), cancellationToken);
            // Reconciliation after contract cancellation is a settlement review, not a new
            // school contract verification or long-term protection grant.
            var isSettlementOnly = confirm && schoolContract.Status == "CANCELLED";
            var kind = isSettlementOnly ? "CHECKEE_SETTLEMENT_CONFIRMED"
                : confirm ? "CHECKEE_CONTRACT_VERIFIED" : "CHECKEE_CONTRACT_DISPUTED";
            var title = isSettlementOnly ? "CHECKEE đã xác nhận đối soát hợp đồng đã hủy"
                : confirm ? "CHECKEE đã xác minh hợp đồng" : "CHECKEE yêu cầu xử lý hợp đồng";
            var message = isSettlementOnly ? "CHECKEE đã xác nhận kết quả đối soát; hợp đồng vẫn đã hủy và không được khôi phục quyền bảo vệ."
                : confirm ? "Hợp đồng đã được CHECKEE xác minh. Xem trạng thái và quyền bảo vệ theo hồ sơ."
                : "CHECKEE đã phản hồi hợp đồng; cần xem thông tin tranh chấp hoặc hồ sơ cần bổ sung.";
            var isCollaborator = await db.OrganizationMemberships.AsNoTracking().AnyAsync(m =>
                m.UserId == schoolContract.OwnerUserId && m.OrganizationId == schoolContract.OwnerOrganizationId
                && m.Status == "ACTIVE" && (m.MembershipType == "COLLABORATOR" || m.MembershipType == "PARTNER_COLLABORATOR"), cancellationToken);
            CrmNotificationWriter.Add(db, schoolContract.OwnerOrganizationId, schoolContract.OwnerUserId,
                kind, nameof(ReconciliationCase), reconciliation.Id, title, message,
                isCollaborator ? "role-collaborator-approaches" : "role-sales-staff-customers", occurrence);
            var managerId = await db.OrganizationMemberships.AsNoTracking()
                .Where(m => m.UserId == schoolContract.OwnerUserId && m.OrganizationId == schoolContract.OwnerOrganizationId
                    && m.Status == "ACTIVE").Select(m => m.ManagerUserId).FirstOrDefaultAsync(cancellationToken);
            if (managerId.HasValue)
                CrmNotificationWriter.Add(db, schoolContract.OwnerOrganizationId, managerId.Value,
                    kind, nameof(ReconciliationCase), reconciliation.Id, title, message, "manager-contracts", occurrence);
        }
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }
}

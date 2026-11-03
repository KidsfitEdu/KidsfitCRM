using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    private static void ValidateWorkflowPolicyDraft(int managerHours, int adminHours, int invitationHours,
        int extensionDays, int extensionCount, int totalDays)
    {
        if (managerHours is < 1 or > 8760 || adminHours is < 1 or > 8760 || invitationHours is < 1 or > 8760
            || extensionDays is < 1 or > 365 || extensionCount is < 1 or > 100
            || totalDays < extensionDays || totalDays > 3650)
            throw ApiValidationException.For("policy", "Các thời hạn phải hợp lệ và lớn hơn 0.");
    }

    private static void ValidateApprovedExtensionLimits(SchoolWorkflowPolicyVersion policy)
    {
        if (policy.MaxExtensionDays != 7 || policy.MaxExtensionCount != 3 || policy.MaxTotalExtensionDays != 21)
            throw ApiValidationException.For("policy", "Chính sách đang phê duyệt yêu cầu gia hạn 7 ngày/lần, tối đa 3 lần và tổng 21 ngày.");
    }

    public Task<long> UpdateSchoolWorkflowPolicyDraft(long id, UpdateSchoolWorkflowPolicyDraftRequest request,
        long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolWorkflowPolicyManage, ct);
        ValidateWorkflowPolicyDraft(request.ManagerReviewHours, request.AdminReviewHours, request.InvitationHours,
            request.MaxExtensionDays, request.MaxExtensionCount, request.MaxTotalExtensionDays);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var targetOrg = await db.SchoolWorkflowPolicies.AsNoTracking().Where(x => x.Id == id)
            .Select(x => (long?)x.OrganizationId).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(targetOrg)) throw new KeyNotFoundException();
        await LockSchoolOrganization(targetOrg, ct);
        var policy = await db.SchoolWorkflowPolicies.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (policy.Status != "DRAFT") throw new ApiConflictException("Chỉ được sửa bản nháp chưa kích hoạt.");
        var before = new { policy.ManagerReviewHours, policy.AdminReviewHours, policy.InvitationHours,
            policy.MaxExtensionDays, policy.MaxExtensionCount, policy.MaxTotalExtensionDays, policy.DecisionReference };
        policy.ManagerReviewHours = request.ManagerReviewHours;
        policy.AdminReviewHours = request.AdminReviewHours;
        policy.InvitationHours = request.InvitationHours;
        policy.MaxExtensionDays = request.MaxExtensionDays;
        policy.MaxExtensionCount = request.MaxExtensionCount;
        policy.MaxTotalExtensionDays = request.MaxTotalExtensionDays;
        // Editing draft settings must not replace its audit reference with a fake user decision.
        if (!string.IsNullOrWhiteSpace(request.DecisionReference))
            policy.DecisionReference = Validation.Required(request.DecisionReference, "decision_reference", "Mã tham chiếu không hợp lệ.", 120);
        policy.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, actorId, "UPDATE_SCHOOL_WORKFLOW_POLICY_DRAFT", nameof(SchoolWorkflowPolicyVersion),
            id, before, new { policy.ManagerReviewHours, policy.AdminReviewHours, policy.InvitationHours,
                policy.MaxExtensionDays, policy.MaxExtensionCount, policy.MaxTotalExtensionDays, policy.DecisionReference }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return id;
    }, ct);

    public Task<long> ActivateSchoolWorkflowPolicy(long id, ActivateSchoolWorkflowPolicyRequest request,
        long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolWorkflowPolicyManage, ct);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var orgId = await db.SchoolWorkflowPolicies.AsNoTracking().Where(x => x.Id == id)
            .Select(x => (long?)x.OrganizationId).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(orgId)) throw new KeyNotFoundException();
        await LockSchoolOrganization(orgId, ct);
        var policy = await db.SchoolWorkflowPolicies.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (policy.Status != "DRAFT") throw new ApiConflictException("Chỉ được kích hoạt bản nháp.");
        ValidateApprovedExtensionLimits(policy);
        var reference = Validation.Required(request.DecisionReference, "decision_reference", "Cần căn cứ kích hoạt.", 120);
        var now = DateTime.UtcNow;
        await db.SchoolWorkflowPolicies.Where(x => x.OrganizationId == orgId && x.Status == "ACTIVE")
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.Status, "SUPERSEDED")
                .SetProperty(x => x.UpdatedAt, now), ct);
        policy.DecisionReference = reference;
        policy.Status = "ACTIVE";
        policy.UpdatedAt = now;
        Audit.Add(db, actorId, "ACTIVATE_SCHOOL_WORKFLOW_POLICY", nameof(SchoolWorkflowPolicyVersion),
            id, new { status = "DRAFT" }, new { policy.OrganizationId, policy.Version, policy.Status, reference }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return id;
    }, ct);

    // Restore the original policy version directly. Each activation is recorded in audit,
    // while the original settings, identifier and approval reference remain unchanged.
    public Task<long> ReapplySchoolWorkflowPolicy(long sourceId, ActivateSchoolWorkflowPolicyRequest request,
        long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolWorkflowPolicyManage, ct);
        var reference = Validation.Required(request.DecisionReference, "decision_reference", "Cần mã tham chiếu thao tác.", 120);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var orgId = await db.SchoolWorkflowPolicies.AsNoTracking().Where(x => x.Id == sourceId)
            .Select(x => (long?)x.OrganizationId).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(orgId)) throw new KeyNotFoundException();
        await LockSchoolOrganization(orgId, ct);
        var source = await db.SchoolWorkflowPolicies.AsNoTracking().SingleOrDefaultAsync(
            x => x.Id == sourceId && x.OrganizationId == orgId, ct) ?? throw new KeyNotFoundException();
        if (source.Status != "SUPERSEDED")
            throw new ApiConflictException("Chỉ có thể áp dụng lại phiên bản đã được thay thế.");
        ValidateApprovedExtensionLimits(source);
        var previousActive = await db.SchoolWorkflowPolicies.AsNoTracking()
            .Where(x => x.OrganizationId == orgId && x.Status == "ACTIVE")
            .Select(x => new { x.Id, x.Version }).ToArrayAsync(ct);
        var now = DateTime.UtcNow;
        await db.SchoolWorkflowPolicies.Where(x => x.OrganizationId == orgId && x.Status == "ACTIVE")
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.Status, "SUPERSEDED")
                .SetProperty(x => x.UpdatedAt, now), ct);
        // No new SchoolWorkflowPolicyVersion is inserted. This preserves policy_version_id
        // references belonging to prior business records and preserves the version number.
        // Update directly: a caller may already have an older tracked copy of this version.
        await db.SchoolWorkflowPolicies.Where(x => x.Id == sourceId && x.Status == "SUPERSEDED")
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.Status, "ACTIVE")
                .SetProperty(x => x.UpdatedAt, now), ct);
        Audit.Add(db, actorId, "REAPPLY_SCHOOL_WORKFLOW_POLICY", nameof(SchoolWorkflowPolicyVersion),
            source.Id,
            new { source.OrganizationId, source.Version, previousStatus = "SUPERSEDED", previousActive },
            new { status = "ACTIVE", source.Version, reference, effectiveAt = now }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return source.Id;
    }, ct);

    public Task<long> CancelSchoolWorkflowPolicyDraft(long id, CancelSchoolWorkflowPolicyDraftRequest request,
        long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolWorkflowPolicyManage, ct);
        var reason = Validation.Required(request.Reason, "reason", "Cần lý do hủy bản nháp.", 2000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var orgId = await db.SchoolWorkflowPolicies.AsNoTracking().Where(x => x.Id == id)
            .Select(x => (long?)x.OrganizationId).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(orgId)) throw new KeyNotFoundException();
        await LockSchoolOrganization(orgId, ct);
        var policy = await db.SchoolWorkflowPolicies.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (policy.Status != "DRAFT") throw new ApiConflictException("Không thể hủy phiên bản đã được kích hoạt.");
        policy.Status = "CANCELLED";
        policy.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, actorId, "CANCEL_SCHOOL_WORKFLOW_POLICY_DRAFT", nameof(SchoolWorkflowPolicyVersion),
            id, new { status = "DRAFT" }, new { policy.Status, reason }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return id;
    }, ct);
}

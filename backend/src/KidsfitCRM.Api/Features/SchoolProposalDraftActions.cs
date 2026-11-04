using System.Data;
using System.Text.Json;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    public Task<long> CreateSchoolProposalDraft(SaveSchoolProposalDraftRequest request, long actorId, HttpContext http, CancellationToken ct)
        => SchoolWrite(async () =>
    {
        await RequirePermission(actorId, Permissions.SchoolProposalSubmit, ct);
        var orgId = await PrimaryOrganizationId(actorId, ct);
        var key = SchoolKey(request.IdempotencyKey);
        var hash = ChannelSalesValidation.Fingerprint(request);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await LockSchoolOrganization(orgId, ct);
        var existing = await db.SchoolProposals.FirstOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (existing is not null)
            return ChannelSalesValidation.Replay(existing.Id, existing.SubmittedByUserId, actorId, existing.RequestFingerprint, hash);
        var membership = await ActiveSchoolMembership(actorId, orgId, ct);
        var mode = ValidateDraftMode(request.ProposalMode);
        var target = await DraftTarget(mode, request.TargetDirectorySchoolId, ct, required: false);
        var units = BuildDraftUnits(request.Units, mode);
        var main = units.FirstOrDefault(x => x.UnitType == "MAIN");
        var now = DateTime.UtcNow;
        var draft = new SchoolProposal {
            OrganizationId = orgId, SubmittedByUserId = actorId,
            ManagerUserId = membership.ManagerUserId ?? actorId,
            SchoolCode = mode == "ADD_BRANCHES" && target is not null ? target.SchoolCode : "DRAFT-" + Guid.NewGuid().ToString("N").ToUpperInvariant(),
            Name = main?.Name ?? (mode == "ADD_BRANCHES" && target is not null ? await SchoolMainName(target.Id, ct) : ""),
            Province = main?.Province ?? "", Ward = main?.Ward ?? "",
            ProposalMode = mode, TargetDirectorySchoolId = target?.Id,
            Reason = "Sales lưu nháp đề xuất trường học.",
            Status = "DRAFT", ReviewDueAt = now.AddDays(30),
            IdempotencyKey = key, RequestFingerprint = hash, CreatedAt = now, UpdatedAt = now
        };
        db.SchoolProposals.Add(draft);
        await db.SaveChangesAsync(ct);
        foreach (var unit in units) { unit.SchoolProposalId = draft.Id; db.SchoolProposalUnits.Add(unit); }
        Audit.Add(db, actorId, "CREATE_SCHOOL_PROPOSAL_DRAFT", nameof(SchoolProposal), draft.Id, null,
            new { draft.Status, draft.ProposalMode, units = units.Count }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return draft.Id;
    }, ct);

    public Task<long> UpdateSchoolProposalDraft(long id, SaveSchoolProposalDraftRequest request, long actorId, HttpContext http, CancellationToken ct)
        => SchoolWrite(async () =>
    {
        await RequirePermission(actorId, Permissions.SchoolProposalSubmit, ct);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var draft = await OwnedDraft(id, actorId, ct);
        if (draft.Version != request.ExpectedVersion)
            throw new ApiConflictException("Bản nháp đã được cập nhật ở nơi khác. Vui lòng tải lại.");
        var mode = ValidateDraftMode(request.ProposalMode);
        var target = await DraftTarget(mode, request.TargetDirectorySchoolId, ct, required: false);
        var units = BuildDraftUnits(request.Units, mode, false);
        var oldValues = JsonSerializer.Serialize(await db.SchoolProposalUnits.AsNoTracking().Where(x => x.SchoolProposalId == id).ToArrayAsync(ct));
        // Flush deletions first to avoid a temporary unique (proposal_id, sort_order) collision.
        await db.SchoolProposalUnits.Where(x => x.SchoolProposalId == id).ExecuteDeleteAsync(ct);
        foreach (var unit in units) { unit.SchoolProposalId = id; db.SchoolProposalUnits.Add(unit); }
        var main = units.FirstOrDefault(x => x.UnitType == "MAIN");
        draft.ProposalMode = mode; draft.TargetDirectorySchoolId = target?.Id;
        draft.SchoolCode = mode == "ADD_BRANCHES" && target is not null ? target.SchoolCode : draft.SchoolCode.StartsWith("DRAFT-") ? draft.SchoolCode : "DRAFT-" + Guid.NewGuid().ToString("N").ToUpperInvariant();
        draft.Name = main?.Name ?? (mode == "ADD_BRANCHES" && target is not null ? await SchoolMainName(target.Id, ct) : "");
        draft.Province = main?.Province ?? ""; draft.Ward = main?.Ward ?? "";
        draft.Version++; draft.UpdatedAt = DateTime.UtcNow;
        db.SchoolProposalRevisions.Add(new SchoolProposalRevision {
            SchoolProposalId = id, ActorUserId = actorId, Version = draft.Version,
            Reason = "Sales cập nhật bản nháp trường học.", BeforeValues = oldValues,
            AfterValues = JsonSerializer.Serialize(units.Select(u => new {u.UnitType,u.Name,u.Province,u.Ward,u.Address,u.ContactName,u.ContactPosition,u.ContactPhone,u.Email,u.SchoolPhone,u.Note})),
            CreatedAt = draft.UpdatedAt, UpdatedAt = draft.UpdatedAt
        });
        Audit.Add(db, actorId, "UPDATE_SCHOOL_PROPOSAL_DRAFT", nameof(SchoolProposal), id, null,
            new { draft.Version, units = units.Count }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return id;
    }, ct);

    public Task<long> DeleteSchoolProposalDraft(long id, DeleteSchoolProposalDraftRequest request, long actorId, HttpContext http, CancellationToken ct)
        => SchoolWrite(async () =>
    {
        await RequirePermission(actorId, Permissions.SchoolProposalSubmit, ct);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var draft = await OwnedDraft(id, actorId, ct);
        if (draft.Version != request.ExpectedVersion)
            throw new ApiConflictException("Phiên bản nháp không còn mới. Vui lòng tải lại.");
        draft.IsDeleted = true; draft.DeletedAt = DateTime.UtcNow; draft.DeletedByUserId = actorId;
        draft.Version++; draft.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, actorId, "SOFT_DELETE_SCHOOL_PROPOSAL_DRAFT", nameof(SchoolProposal), id,
            new { isDeleted = false }, new { draft.IsDeleted, draft.DeletedAt }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return id;
    }, ct);

    public Task<long> SendSchoolProposalDraft(long id, SubmitSchoolProposalDraftRequest request, long actorId, HttpContext http, CancellationToken ct)
        => SchoolWrite(async () =>
    {
        await RequirePermission(actorId, Permissions.SchoolProposalSubmit, ct);
        var orgId = await PrimaryOrganizationId(actorId, ct);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await LockSchoolOrganization(orgId, ct);
        var draft = await OwnedDraft(id, actorId, ct);
        if (draft.Version != request.ExpectedVersion)
            throw new ApiConflictException("Bản nháp đã thay đổi. Vui lòng tải lại trước khi gửi.");
        var previousStatus = draft.Status;
        var membership = await ActiveSchoolMembership(actorId, orgId, ct);
        var managerId = membership.ManagerUserId ?? throw ApiValidationException.For("manager", "Cần chỉ định Quản lý trực tiếp.");
        var manager = await ChannelSalesAccess.Load(db, managerId, ct);
        if (managerId == actorId || !manager.Has(Permissions.SchoolProposalReview) || !manager.CanManageOrganization(orgId))
            throw ApiValidationException.For("manager", "Quản lý trực tiếp không có quyền tiếp nhận.");
        var mode = ValidateDraftMode(draft.ProposalMode);
        var target = await DraftTarget(mode, draft.TargetDirectorySchoolId, ct);
        var units = await db.SchoolProposalUnits.Where(x => x.SchoolProposalId == id).OrderBy(x => x.SortOrder).ToArrayAsync(ct);
        if (units.Length == 0) throw ApiValidationException.For("units", "Cần nhập trường chính hoặc phân hiệu.");
        if (mode == "NEW_MAIN" && units.Count(x => x.UnitType == "MAIN") != 1)
            throw ApiValidationException.For("units", "Cần đúng một trường chính.");
        if (mode == "ADD_BRANCHES" && (units.Any(x => x.UnitType != "BRANCH") || target is null))
            throw ApiValidationException.For("units", "Cần chọn trường chính hợp lệ và ít nhất một phân hiệu.");
        foreach (var unit in units)
        {
            Validation.Required(unit.Name, "name", "Cần tên trường/phân hiệu.", 500);
            Validation.Required(unit.Province, "province", "Cần tỉnh/thành.", 100);
            Validation.Required(unit.Ward, "ward", "Cần phường/xã.", 100);
        }
        if (mode == "ADD_BRANCHES")
        {
            foreach (var unit in units)
                if (await db.SchoolUnits.AnyAsync(x => x.DirectorySchoolId == target!.Id &&
                    x.Name == unit.Name && x.Province == unit.Province && x.Ward == unit.Ward, ct))
                    throw new ApiConflictException("Phân hiệu đã tồn tại trong danh bạ trường chính.");
        }
        if (units.GroupBy(x => new { x.Name, x.Province, x.Ward }).Any(g => g.Count() > 1))
            throw new ApiConflictException("Có trường/phân hiệu trùng tên và khu vực trong hồ sơ.");
        var main = units.FirstOrDefault(x => x.UnitType == "MAIN");
        var policy = await ActiveSchoolPolicy(orgId, ct);
        draft.ManagerUserId = managerId;
        draft.Name = main?.Name ?? await SchoolMainName(target!.Id, ct);
        draft.Province = main?.Province ?? (await db.SchoolUnits.Where(x => x.DirectorySchoolId == target!.Id && x.UnitType == "MAIN").Select(x => x.Province).FirstAsync(ct));
        draft.Ward = main?.Ward ?? (await db.SchoolUnits.Where(x => x.DirectorySchoolId == target!.Id && x.UnitType == "MAIN").Select(x => x.Ward).FirstAsync(ct));
        draft.Address = main?.Address; draft.ContactName = main?.ContactName; draft.ContactPosition = main?.ContactPosition;
        draft.ContactPhone = main?.ContactPhone; draft.Email = main?.Email;
        draft.Reason = "Sales đề xuất bổ sung trường học mới.";
        draft.Status = "PENDING_MANAGER"; draft.ReviewDueAt = DateTime.UtcNow.AddHours(policy?.ManagerReviewHours ?? 72);
        draft.Version++; draft.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, actorId, "SUBMIT_SCHOOL_PROPOSAL", nameof(SchoolProposal), id,
            new { status = previousStatus }, new { draft.Status, draft.ManagerUserId, draft.ReviewDueAt, units = units.Length }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return id;
    }, ct);

    public Task<long> ReturnSchoolProposalForRevision(long id, RequestSchoolProposalRevisionRequest request,
        long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolProposalReview, ct);
        var reason = Validation.Required(request.Reason, "reason", "Cần ghi nội dung Sales phải bổ sung.", 4000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var proposal = await db.SchoolProposals.FromSqlInterpolated(
            $"SELECT * FROM school_proposals WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException();
        if (proposal.IsDeleted || proposal.ProposalMode == "LEGACY" || proposal.Status != "PENDING_MANAGER"
            || proposal.ManagerUserId != actorId || !access.CanManageOrganization(proposal.OrganizationId))
            throw new KeyNotFoundException();
        proposal.Status = "NEEDS_REVISION"; proposal.DecisionReason = reason;
        proposal.Version++; proposal.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, actorId, "REQUEST_SCHOOL_PROPOSAL_REVISION", nameof(SchoolProposal), id,
            new { status = "PENDING_MANAGER" }, new { proposal.Status, proposal.Version, reason }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return id;
    }, ct);

    private async Task<SchoolProposal> OwnedDraft(long id, long actorId, CancellationToken ct)
    {
        var proposal = await db.SchoolProposals.FromSqlInterpolated(
            $"SELECT * FROM school_proposals WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException();
        if (proposal.SubmittedByUserId != actorId || proposal.IsDeleted || proposal.Status is not ("DRAFT" or "NEEDS_REVISION")
            || proposal.ProposalMode == "LEGACY") throw new KeyNotFoundException();
        return proposal;
    }

    private async Task<DirectorySchool?> DraftTarget(string mode, long? targetId, CancellationToken ct, bool required = true)
    {
        if (mode == "NEW_MAIN")
        {
            if (targetId.HasValue) throw ApiValidationException.For("target_directory_school_id", "Trường mới không liên kết trường chính cũ.");
            return null;
        }
        if (!targetId.HasValue)
        {
            if (!required) return null;
            throw ApiValidationException.For("target_directory_school_id", "Cần chọn trường chính đã có.");
        }
        var target = await db.DirectorySchools.AsNoTracking().SingleOrDefaultAsync(x => x.Id == targetId && !x.IsDeleted, ct)
            ?? throw ApiValidationException.For("target_directory_school_id", "Trường chính không tồn tại hoặc đã ngừng sử dụng.");
        return target;
    }

    private async Task<string> SchoolMainName(long id, CancellationToken ct)
        => await db.SchoolUnits.Where(x => x.DirectorySchoolId == id && x.UnitType == "MAIN")
                .Select(x => x.Name).FirstOrDefaultAsync(ct) ?? "";

    private static string ValidateDraftMode(string? mode) => mode is "NEW_MAIN" or "ADD_BRANCHES"
        ? mode : throw ApiValidationException.For("proposal_mode", "Loại đề xuất không hợp lệ.");

    private static List<SchoolProposalUnit> BuildDraftUnits(SchoolProposalUnitInput[]? values, string mode)
    {
        var list = new List<SchoolProposalUnit>();
        if (values is null || values.Length > 50)
            throw ApiValidationException.For("units", "Hồ sơ phải chứa tối đa 50 đơn vị.");
        for (var index = 0; index < values.Length; index++)
        {
            var v = values[index];
            var kind = v.UnitType?.ToUpperInvariant();
            if (kind is not ("MAIN" or "BRANCH") || (mode == "ADD_BRANCHES" && kind != "BRANCH"))
                throw ApiValidationException.For("units", "Loại trường/phân hiệu không hợp lệ.");
            list.Add(new SchoolProposalUnit {
                UnitType = kind, SortOrder = index, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
                Name = CleanOptional(v.Name, 500) ?? "",
                Province = CleanOptional(v.Province, 100) ?? "",
                Ward = CleanOptional(v.Ward, 100) ?? "",
                Address = CleanOptional(v.Address, 500),
                ContactName = CleanOptional(v.ContactName, 500),
                ContactPosition = CleanOptional(v.ContactPosition, 120),
                ContactPhone = SchoolPhone(v.ContactPhone), Email = SchoolEmail(v.Email),
                SchoolPhone = SchoolPhone(v.SchoolPhone), Note = CleanOptional(v.Note, 4000)
            });
        }
        if (mode == "NEW_MAIN" && list.Count(x => x.UnitType == "MAIN") != 1)
            throw ApiValidationException.For("units", "Cần đúng một trường chính.");
        if (mode == "ADD_BRANCHES" && list.Count == 0)
            throw ApiValidationException.For("units", "Cần ít nhất một phân hiệu.");
        return list;
    }
}

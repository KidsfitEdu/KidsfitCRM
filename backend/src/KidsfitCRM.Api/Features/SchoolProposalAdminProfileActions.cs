using System.Data;
using System.Text.Json;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

// The Admin editor changes a pending proposal, never an official directory school.
public sealed record UpdateAdminProposalProfileRequest(
    int ExpectedVersion, SchoolProposalUnitInput[]? Units, string? Reason);

public sealed partial class ChannelSalesActions
{
    public Task<long> UpdateAdminProposalProfile(long id, UpdateAdminProposalProfileRequest request,
        long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolDirectoryManage, ct);
        if (!access.All || !await db.Organizations.AnyAsync(o => o.Code == "KIDSFIT"
            && o.Status == "ACTIVE" && access.OrganizationIds.Contains(o.Id), ct))
            throw new KeyNotFoundException();

        var reason = Validation.Required(request.Reason, "reason", "Cần lý do chỉnh sửa.", 2000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var proposal = await db.SchoolProposals.FromSqlInterpolated(
            $"SELECT * FROM school_proposals WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException();
        if (proposal.IsDeleted || proposal.Status != "PENDING_ADMIN")
            throw new ApiConflictException("Chỉ có thể chỉnh sửa đề xuất đang chờ Admin duyệt.");
        if (proposal.Version != request.ExpectedVersion)
            throw new ApiConflictException("Đề xuất vừa được cập nhật. Vui lòng tải lại hồ sơ.");

        var mode = proposal.ProposalMode;
        if (mode is not ("NEW_MAIN" or "ADD_BRANCHES" or "LEGACY"))
            throw new ApiConflictException("Loại đề xuất không hỗ trợ chỉnh sửa.");
        // Legacy proposals are stored as a single scalar school. Modern proposals
        // are stored as a set of proposal units and must retain their original mode.
        var expectedMode = mode == "LEGACY" ? "NEW_MAIN" : mode;
        var units = BuildDraftUnits(request.Units, expectedMode);
        if (units.Count == 0 || (mode == "LEGACY" && units.Count != 1))
            throw ApiValidationException.For("units", "Số đơn vị không phù hợp với loại đề xuất.");
        foreach (var unit in units)
        {
            unit.Name = Validation.Required(unit.Name, "units", "Cần tên trường/phân hiệu.", 500);
            unit.Province = Validation.Required(unit.Province, "units", "Cần tỉnh/thành phố.", 100);
            unit.Ward = Validation.Required(unit.Ward, "units", "Cần phường/xã.", 100);
        }
        if (mode == "ADD_BRANCHES" && (!proposal.TargetDirectorySchoolId.HasValue
            || !await db.DirectorySchools.AnyAsync(s => s.Id == proposal.TargetDirectorySchoolId.Value && !s.IsDeleted, ct)))
            throw new ApiConflictException("Trường chính liên kết không còn khả dụng.");

        var fingerprints = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var unit in units)
        {
            var key = $"{unit.UnitType}|{unit.Name.Trim()}|{unit.Province.Trim()}|{unit.Ward.Trim()}";
            if (!fingerprints.Add(key))
                throw ApiValidationException.For("units", "Có phân hiệu trùng tên và địa bàn trong đề xuất.");
            if (mode == "ADD_BRANCHES" && await db.SchoolUnits.AnyAsync(s =>
                s.DirectorySchoolId == proposal.TargetDirectorySchoolId && s.UnitType == "BRANCH"
                && s.Name == unit.Name && s.Province == unit.Province && s.Ward == unit.Ward, ct))
                throw new ApiConflictException("Phân hiệu đã tồn tại trong trường chính.");
        }
        var previous = await db.SchoolProposalUnits.AsNoTracking()
            .Where(u => u.SchoolProposalId == id).OrderBy(u => u.SortOrder).ToArrayAsync(ct);
        var before = JsonSerializer.Serialize(new {
            proposal.ProposalMode, proposal.Name, proposal.Province, proposal.Ward,
            proposal.Address, proposal.ContactName, proposal.ContactPosition,
            proposal.ContactPhone, proposal.Email, units = previous
        });
        var main = units.SingleOrDefault(u => u.UnitType == "MAIN");
        if (mode is "NEW_MAIN" or "LEGACY")
        {
            if (main is null) throw ApiValidationException.For("units", "Cần đúng một trường chính.");
            proposal.Name = main.Name;
            proposal.Province = main.Province;
            proposal.Ward = main.Ward;
            proposal.Address = main.Address;
            proposal.ContactName = main.ContactName;
            proposal.ContactPosition = main.ContactPosition;
            proposal.ContactPhone = main.ContactPhone;
            proposal.Email = main.Email;
        }
        if (mode == "ADD_BRANCHES")
        {
            proposal.Name = await SchoolMainName(proposal.TargetDirectorySchoolId!.Value, ct);
            var mainLocation = await db.SchoolUnits.Where(u =>
                u.DirectorySchoolId == proposal.TargetDirectorySchoolId && u.UnitType == "MAIN")
                .Select(u => new { u.Province, u.Ward }).SingleAsync(ct);
            proposal.Province = mainLocation.Province;
            proposal.Ward = mainLocation.Ward;
        }
        // Store complete form details for all proposal modes, including legacy:
        // the scalar legacy identity/code remains unchanged, while school phone and
        // notes are retained as one proposal-unit row.
        await db.SchoolProposalUnits.Where(u => u.SchoolProposalId == id).ExecuteDeleteAsync(ct);
        foreach (var unit in units)
        {
            unit.SchoolProposalId = id;
            db.SchoolProposalUnits.Add(unit);
        }
        var now = DateTime.UtcNow;
        proposal.Version++;
        proposal.UpdatedAt = now;
        db.SchoolProposalRevisions.Add(new SchoolProposalRevision {
            SchoolProposalId = id, ActorUserId = actorId, Version = proposal.Version,
            Reason = reason, BeforeValues = before,
            AfterValues = JsonSerializer.Serialize(new {
                proposal.ProposalMode, proposal.Name, proposal.Province, proposal.Ward,
                proposal.Address, proposal.ContactName, proposal.ContactPosition,
                proposal.ContactPhone, proposal.Email,
                units = units.Select(u => new {
                    u.UnitType, u.Name, u.Province, u.Ward, u.Address, u.ContactName,
                    u.ContactPosition, u.ContactPhone, u.Email, u.SchoolPhone, u.Note
                })
            }), CreatedAt = now, UpdatedAt = now
        });
        Audit.Add(db, actorId, "ADMIN_UPDATE_SCHOOL_PROPOSAL_PROFILE", nameof(SchoolProposal),
            id, new { version = request.ExpectedVersion }, new { proposal.Version, mode, units = units.Count, reason }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return id;
    }, ct);
}

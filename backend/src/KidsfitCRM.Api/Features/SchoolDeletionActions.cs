using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    // Archive the canonical school and all its branches together, without deleting customer history.
    public Task<long> ChangeSchoolDeletion(long id, string? reason, bool delete, long actorId,
        HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolDirectoryManage, ct);
        var centralId = await db.Organizations.AsNoTracking()
            .Where(x => x.Code == "KIDSFIT" && x.Status == "ACTIVE")
            .Select(x => (long?)x.Id).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.All || !access.InOrganization(centralId)) throw new KeyNotFoundException();
        // The Admin confirmation has no reason input; keep an auditable server-side reason.
        var validatedReason = delete
            ? (string.IsNullOrWhiteSpace(reason)
                ? "Admin xác nhận xóa mềm trường học."
                : Validation.Required(reason, "reason", "Lý do ngừng sử dụng trường không hợp lệ.", 2000))
            : null;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await LockSchoolOrganization(centralId, ct);
        var school = await db.DirectorySchools.FromSqlInterpolated(
            $"SELECT * FROM directory_schools WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException();
        if (school.IsDeleted == delete)
            throw new ApiConflictException(delete ? "Trường đã ngừng sử dụng." : "Trường đang hoạt động.");

        if (delete)
        {
            var now = DateTime.UtcNow;
            // Return the most actionable blocker first, without changing the deletion rules.
            if (await db.SalesContracts.AnyAsync(x => x.CustomerId == school.CustomerId
                && x.Status != "CANCELLED" && x.Status != "REJECTED", ct))
                throw new ApiConflictException("Không thể xóa trường vì có hợp đồng chưa kết thúc. Vui lòng kiểm tra trạng thái hợp đồng.");
            if (await db.CustomerProtections.AnyAsync(x => x.CustomerId == school.CustomerId
                && x.Status == "ACTIVE" && x.EffectiveUntil > now, ct))
                throw new ApiConflictException("Không thể xóa trường vì quyền bảo vệ khách hàng vẫn còn hiệu lực.");
            if (await db.ApproachRegistrations.AnyAsync(x => x.CustomerId == school.CustomerId
                && x.Status == "ACTIVE" && x.ProtectedUntil > now, ct))
                throw new ApiConflictException("Không thể xóa trường vì đang có nhân viên hoặc CTV tiếp cận. Vui lòng xử lý quyền tiếp cận trước.");
            if (await db.SchoolInvitations.AnyAsync(x => x.DirectorySchoolId == id && x.Status == "PENDING", ct))
                throw new ApiConflictException("Không thể xóa trường vì có lời mời phân bổ chưa được xử lý. Vui lòng hoàn tất hoặc hủy lời mời.");
            school.IsDeleted = true;
            school.DeletedAt = now;
            school.DeletedByUserId = actorId;
            school.DeleteReason = validatedReason;
        }
        else
        {
            var main = await db.SchoolUnits.AsNoTracking().FirstOrDefaultAsync(
                x => x.DirectorySchoolId == id && x.UnitType == "MAIN", ct);
            if (main is not null && await db.SchoolUnits.AnyAsync(x =>
                x.DirectorySchoolId != id && x.UnitType == "MAIN" && x.Name == main.Name
                && x.Province == main.Province && x.Ward == main.Ward
                && db.DirectorySchools.Any(s => s.Id == x.DirectorySchoolId && !s.IsDeleted), ct))
                throw new ApiConflictException("Trùng tên trường chính và địa bàn với trường đang hoạt động.");
            school.IsDeleted = false;
            school.DeletedAt = null;
            school.DeletedByUserId = null;
            school.DeleteReason = null;
        }

        school.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, actorId, delete ? "SOFT_DELETE_SCHOOL" : "RESTORE_SCHOOL",
            nameof(DirectorySchool), school.Id,
            new { isDeleted = !delete }, new { school.IsDeleted, school.DeletedAt, reason = validatedReason }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return id;
    }, ct);
}

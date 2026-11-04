using System.Data;
using System.Text.Json;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

// One Admin school record contains exactly one MAIN and zero or more BRANCH units.
// Existing units must be included during an update; omissions never silently delete history.
public sealed record SchoolRecordUnitInput(
    long? Id, int? ExpectedVersion, string? UnitType, string? Name,
    string? Province, string? Ward, string? Address, string? ContactName,
    string? ContactPosition, string? ContactPhone, string? Email,
    string? SchoolPhone, string? Note);

public sealed record SaveSchoolRecordRequest(string? SchoolCode, SchoolRecordUnitInput[]? Units, string? Reason);

public sealed partial class ChannelSalesActions
{
    public Task<long> SaveSchoolRecord(long? schoolId, SaveSchoolRecordRequest request, long actorId, HttpContext http, CancellationToken ct)
        => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolDirectoryManage, ct);
        var centralId = await db.Organizations.Where(x => x.Code == "KIDSFIT" && x.Status == "ACTIVE")
            .Select(x => (long?)x.Id).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.All || !access.InOrganization(centralId)) throw new KeyNotFoundException();

        var code = Validation.Required(request.SchoolCode, "school_code", "Cần mã trường chính.", 64).ToUpperInvariant();
        if (!System.Text.RegularExpressions.Regex.IsMatch(code, "^[A-Z0-9][A-Z0-9_-]*$"))
            throw ApiValidationException.For("school_code", "Mã trường không hợp lệ.");
        var inputs = request.Units ?? Array.Empty<SchoolRecordUnitInput>();
        if (inputs.Length == 0 || inputs.Length > 50 || inputs.Count(x => x.UnitType?.ToUpperInvariant() == "MAIN") != 1)
            throw ApiValidationException.For("units", "Cần đúng một trường chính và tối đa 49 phân hiệu.");
        if (inputs.Any(x => x.UnitType?.ToUpperInvariant() is not ("MAIN" or "BRANCH")))
            throw ApiValidationException.For("unit_type", "Loại đơn vị chỉ được là MAIN hoặc BRANCH.");
        if (inputs.Select(x => x.Id).Where(x => x.HasValue).Distinct().Count() != inputs.Count(x => x.Id.HasValue))
            throw ApiValidationException.For("units", "Đơn vị bị lặp trong yêu cầu.");

        var reason = string.IsNullOrWhiteSpace(request.Reason)
            ? (schoolId.HasValue ? "Admin cập nhật hồ sơ trường học." : "Admin tạo hồ sơ trường học.")
            : Validation.Required(request.Reason, "reason", "Lý do không hợp lệ.", 2000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await LockSchoolOrganization(centralId, ct);

        DirectorySchool school;
        ChannelCustomer? customer = null;
        var now = DateTime.UtcNow;
        if (schoolId.HasValue)
        {
            school = await db.DirectorySchools.FromSqlInterpolated(
                $"SELECT * FROM directory_schools WHERE id = {schoolId.Value} FOR UPDATE").SingleOrDefaultAsync(ct)
                ?? throw new KeyNotFoundException();
            if (school.IsDeleted) throw new ApiConflictException("Trường đã ngừng sử dụng; cần khôi phục trước khi sửa.");
            if (school.SchoolCode != code) throw new ApiConflictException("Không được thay đổi mã trường chính khi chỉnh sửa.");
            customer = await LockCustomer(school.CustomerId, ct) ?? throw new KeyNotFoundException();
        }
        else
        {
            if (inputs.Any(x => x.Id.HasValue)) throw ApiValidationException.For("units", "Trường mới không có ID đơn vị.");
            if (await db.DirectorySchools.AnyAsync(x => x.SchoolCode == code, ct))
                throw new ApiConflictException("Mã trường chính đã tồn tại.");
            var main = inputs.Single(x => x.UnitType == "MAIN");
            customer = new ChannelCustomer {
                Code = "SCH-" + Guid.NewGuid().ToString("N")[..24],
                CustomerType = "ORGANIZATION", DisplayName = Validation.Required(main.Name, "name", "Cần tên trường.", 500),
                Province = Validation.Required(main.Province, "province", "Cần tỉnh/thành.", 100),
                Address = CleanOptional(main.Address, 500), ContactName = CleanOptional(main.ContactName, 500),
                ContactPosition = CleanOptional(main.ContactPosition, 120),
                Phone = SchoolPhone(main.SchoolPhone) ?? SchoolPhone(main.ContactPhone),
                Email = SchoolEmail(main.Email), Source = "SCHOOL_DIRECTORY", VerificationStatus = "VERIFIED",
                OrganizationId = centralId, CreatedByUserId = actorId, CreatedAt = now, UpdatedAt = now
            };
            db.ChannelCustomers.Add(customer);
            await db.SaveChangesAsync(ct);
            school = new DirectorySchool { SchoolCode = code, CustomerId = customer.Id, CreatedAt = now, UpdatedAt = now };
            db.DirectorySchools.Add(school);
            db.CustomerIdentifiers.Add(new CustomerIdentifier { CustomerId = customer.Id, IdentifierType = "SCHOOL_CODE",
                NormalizedValue = code, DisplayValue = code, IsVerified = true, CreatedAt = now, UpdatedAt = now });
            await db.SaveChangesAsync(ct);
        }

        var existing = await db.SchoolUnits.Where(x => x.DirectorySchoolId == school.Id).ToArrayAsync(ct);
        var providedIds = inputs.Where(x => x.Id.HasValue).Select(x => x.Id!.Value).ToHashSet();
        if (existing.Any(x => !providedIds.Contains(x.Id)))
            throw new ApiConflictException("Không thể bỏ đơn vị đã tồn tại khỏi hồ sơ; dữ liệu và lịch sử cần được giữ nguyên.");
        if (inputs.Any(x => x.Id.HasValue && existing.All(y => y.Id != x.Id.Value)))
            throw ApiValidationException.For("units", "Đơn vị không thuộc trường này.");
        if (schoolId.HasValue && existing.Count(x => x.UnitType == "MAIN") != 1)
            throw new ApiConflictException("Dữ liệu trường chính chưa nhất quán, cần rà soát trước khi sửa.");

        var unique = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var input in inputs)
        {
            var kind = input.UnitType!.ToUpperInvariant();
            var name = Validation.Required(input.Name, "name", "Cần tên đơn vị.", 500);
            var province = Validation.Required(input.Province, "province", "Cần tỉnh/thành.", 100);
            var ward = Validation.Required(input.Ward, "ward", "Cần phường/xã.", 100);
            if (!unique.Add($"{kind}|{name.Trim()}|{province.Trim()}|{ward.Trim()}"))
                throw new ApiConflictException("Có đơn vị trùng tên và địa bàn trong hồ sơ.");
            if (kind == "MAIN" && await db.SchoolUnits.AnyAsync(x => x.UnitType == "MAIN" && x.DirectorySchoolId != school.Id
                && x.Name == name && x.Province == province && x.Ward == ward, ct))
                throw new ApiConflictException("Tên trường và địa bàn đã tồn tại.");

            var unit = input.Id.HasValue ? existing.Single(x => x.Id == input.Id.Value) : new SchoolUnit {
                DirectorySchoolId = school.Id, UnitType = kind, ContentHash = Guid.NewGuid().ToString("N"),
                SourceRow = 0, CreatedAt = now, UpdatedAt = now
            };
            if (input.Id.HasValue && (unit.Version != input.ExpectedVersion || unit.UnitType != kind))
                throw new ApiConflictException("Dữ liệu đơn vị vừa thay đổi hoặc sai loại; hãy tải lại.");
            var before = input.Id.HasValue ? JsonSerializer.Serialize(SchoolUnitValues(unit)) : null;
            unit.Name = name; unit.Province = province; unit.Ward = ward;
            unit.Address = CleanOptional(input.Address, 500);
            unit.ContactName = CleanOptional(input.ContactName, 500);
            unit.ContactPosition = CleanOptional(input.ContactPosition, 120);
            unit.ContactPhone = SchoolPhone(input.ContactPhone);
            unit.SchoolPhone = SchoolPhone(input.SchoolPhone);
            unit.Email = SchoolEmail(input.Email);
            unit.Note = CleanOptional(input.Note, 4000);
            var after = JsonSerializer.Serialize(SchoolUnitValues(unit));
            if (input.Id.HasValue)
            {
                if (before != after)
                {
                    unit.Version++; unit.UpdatedAt = now;
                    db.SchoolUnitRevisions.Add(new SchoolUnitRevision {
                        SchoolUnitId = unit.Id, ActorUserId = actorId, Version = unit.Version,
                        Reason = reason, BeforeValues = before!, AfterValues = after,
                        CreatedAt = now, UpdatedAt = now
                    });
                    Audit.Add(db, actorId, "UPDATE_SCHOOL_UNIT", nameof(SchoolUnit), unit.Id,
                        new { version = input.ExpectedVersion }, new { unit.Version, unit.DirectorySchoolId }, http);
                }
            }
            else
            {
                db.SchoolUnits.Add(unit);
            }
            if (kind == "MAIN")
            {
                customer!.DisplayName = name; customer.Province = province; customer.Address = unit.Address;
                customer.ContactName = unit.ContactName; customer.ContactPosition = unit.ContactPosition;
                customer.Phone = unit.SchoolPhone ?? unit.ContactPhone; customer.Email = unit.Email;
                customer.UpdatedAt = now;
            }
        }
        await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, schoolId.HasValue ? "UPDATE_SCHOOL_RECORD" : "CREATE_SCHOOL_RECORD",
            nameof(DirectorySchool), school.Id, null, new { school.SchoolCode, units = inputs.Length, reason }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return school.Id;
    }, ct);
}

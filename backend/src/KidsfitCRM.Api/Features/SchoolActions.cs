using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed record ChangeSchoolCapacityRequest(int Limit, string? Reason);

public sealed partial class ChannelSalesActions
{
    public Task<long> ImportSchools(ParsedSchoolWorkbook workbook, string? key, long actorId, HttpContext http, CancellationToken ct) =>
        RetryContestedWrite(() => ImportSchoolsCore(workbook, key, actorId, http, ct), ct);

    private async Task<long> ImportSchoolsCore(ParsedSchoolWorkbook workbook, string? key, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.SchoolDirectoryManage, ct);
        var idempotencyKey = Validation.Required(key, "idempotency_key", "Thiếu khóa chống nhập trùng.", 120);
        // Official directory is owned centrally, not by the uploading partner.
        var organizationId = await db.Organizations.Where(x => x.Code == "KIDSFIT" && x.Status == "ACTIVE").Select(x => x.Id).SingleAsync(ct);
        if (!access.InOrganization(organizationId)) throw new KeyNotFoundException();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await db.Organizations.FromSqlInterpolated($"SELECT * FROM organizations WHERE id = {organizationId} FOR UPDATE").SingleAsync(ct);
        var previous = await db.SchoolImportBatches.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, ct);
        if (previous is not null) return ChannelSalesValidation.Replay(previous.Id, previous.ActorUserId, actorId, previous.FileHash, workbook.FileHash);
        var now = DateTime.UtcNow;
        var batch = new SchoolImportBatch { IdempotencyKey = idempotencyKey, FileHash = workbook.FileHash, ActorUserId = actorId, OrganizationId = organizationId, CreatedAt = now, UpdatedAt = now };
        var codes = workbook.Rows.Select(x => x.SchoolCode).Distinct().ToArray();
        var schools = await db.DirectorySchools.Where(x => codes.Contains(x.SchoolCode)).ToDictionaryAsync(x => x.SchoolCode, ct);
        var ids = schools.Values.Select(x => x.Id).ToArray();
        var existingUnits = await db.SchoolUnits.Where(x => ids.Contains(x.DirectorySchoolId)).Select(x => new { x.DirectorySchoolId, x.ContentHash }).ToArrayAsync(ct);
        var unitKeys = existingUnits.Select(x => (x.DirectorySchoolId, x.ContentHash)).ToHashSet();
        foreach (var main in workbook.Rows.Where(x => x.UnitType == "MAIN"))
        {
            if (schools.TryGetValue(main.SchoolCode, out var existing))
            {
                var name = await db.ChannelCustomers.Where(x => x.Id == existing.CustomerId).Select(x => x.DisplayName).SingleAsync(ct);
                if (!string.Equals(name, main.Name, StringComparison.Ordinal)) throw new ApiConflictException($"Mã {main.SchoolCode} đã có tên khác. Cần rà soát thay vì ghi đè.");
                if (!unitKeys.Contains((existing.Id, main.ContentHash))) throw new ApiConflictException($"Thông tin trường chính {main.SchoolCode} đã thay đổi. Import không tự ghi đè dữ liệu chính thức.");
                continue;
            }
            var customer = new ChannelCustomer
            {
                Code = "SCH-" + Guid.NewGuid().ToString("N")[..24], CustomerType = "ORGANIZATION", DisplayName = main.Name,
                Province = main.Province, Address = main.Address, ContactName = main.ContactName, ContactPosition = main.ContactPosition,
                Phone = main.SchoolPhone, Email = main.Email, Source = "SCHOOL_DIRECTORY", VerificationStatus = "VERIFIED",
                CreatedByUserId = actorId, OrganizationId = organizationId, CreatedAt = now, UpdatedAt = now,
            };
            db.ChannelCustomers.Add(customer);
            await db.SaveChangesAsync(ct);
            var school = new DirectorySchool { SchoolCode = main.SchoolCode, CustomerId = customer.Id, CreatedAt = now, UpdatedAt = now };
            db.DirectorySchools.Add(school);
            db.CustomerIdentifiers.Add(new CustomerIdentifier { CustomerId = customer.Id, IdentifierType = "SCHOOL_CODE", NormalizedValue = main.SchoolCode, DisplayValue = main.SchoolCode, IsVerified = true, CreatedAt = now, UpdatedAt = now });
            await db.SaveChangesAsync(ct);
            schools.Add(main.SchoolCode, school);
            batch.SchoolsCreated++;
        }
        foreach (var row in workbook.Rows)
        {
            var school = schools[row.SchoolCode];
            if (!unitKeys.Add((school.Id, row.ContentHash))) continue;
            db.SchoolUnits.Add(new SchoolUnit
            {
                DirectorySchoolId = school.Id, ContentHash = row.ContentHash, UnitType = row.UnitType, Name = row.Name, Province = row.Province,
                Ward = row.Ward, Address = row.Address, ContactName = row.ContactName, ContactPosition = row.ContactPosition,
                ContactPhone = row.ContactPhone, Email = row.Email, SchoolPhone = row.SchoolPhone, Note = row.Note, SourceRow = row.Row,
                CreatedAt = now, UpdatedAt = now,
            });
            batch.UnitsCreated++;
        }
        db.SchoolImportBatches.Add(batch);
        await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "IMPORT_SCHOOL_DIRECTORY", nameof(SchoolImportBatch), batch.Id, null,
            new { batch.FileHash, batch.SchoolsCreated, batch.UnitsCreated, warningCount = workbook.Warnings.Length }, http);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return batch.Id;
    }

    public async Task ChangeSchoolCapacity(long membershipId, ChangeSchoolCapacityRequest request, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.SchoolCapacityManage, ct);
        var reason = Validation.Required(request.Reason, "reason", "Cần lý do thay đổi hạn mức.", 2000);
        if (request.Limit is < 0 or > 1000) throw ApiValidationException.For("limit", "Hạn mức từ 0 đến 1.000 trường.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var membership = await db.OrganizationMemberships.FromSqlInterpolated($"SELECT * FROM organization_memberships WHERE id = {membershipId} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(membership.OrganizationId) || !IsCollaborator(membership)) throw new KeyNotFoundException();
        if (membership.SchoolApproachLimit == request.Limit) return;
        var change = new SchoolCapacityChange { MembershipId = membership.Id, ActorUserId = actorId, PreviousLimit = membership.SchoolApproachLimit, NewLimit = request.Limit, Reason = reason, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.SchoolCapacityChanges.Add(change);
        membership.SchoolApproachLimit = request.Limit;
        membership.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, actorId, "CHANGE_SCHOOL_CAPACITY", nameof(OrganizationMembership), membership.Id,
            new { limit = change.PreviousLimit }, new { limit = change.NewLimit, reason }, http);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    private static bool IsCollaborator(OrganizationMembership membership) => membership.MembershipType is "COLLABORATOR" or "PARTNER_COLLABORATOR";

    private async Task CheckSchoolCapacity(long ownerId, long organizationId, CancellationToken ct)
    {
        // This row serializes different-school claims by the same CTV, not just claims for one customer.
        var membership = await db.OrganizationMemberships.FromSqlInterpolated($"SELECT * FROM organization_memberships WHERE user_id = {ownerId} AND organization_id = {organizationId} FOR UPDATE").SingleOrDefaultAsync(ct);
        if (membership is null || membership.Status != "ACTIVE") throw new KeyNotFoundException();
        if (!IsCollaborator(membership)) return;
        var now = DateTime.UtcNow;
        var count = await db.ApproachRegistrations.Where(r => r.OwnerUserId == ownerId && r.OwnerOrganizationId == organizationId && r.Status == "ACTIVE" && r.ProtectedUntil > now
            && db.DirectorySchools.Any(s => s.CustomerId == r.CustomerId)).Select(x => x.CustomerId).Distinct().CountAsync(ct);
        if (count >= membership.SchoolApproachLimit) throw new ApiConflictException($"Đã sử dụng {count}/{membership.SchoolApproachLimit} suất trường. Không thể nhận thêm.");
    }

    public async Task ReviewSchoolContract(long contractId, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.SchoolContractReview, ct);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var contract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {contractId} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!contract.RequiresSchoolVerification || !access.CanManageOrganization(contract.OwnerOrganizationId)) throw new KeyNotFoundException();
        if (contract.ManagerReviewedAt is not null) return;
        if (contract.Status != "PENDING_REVIEW") throw new ApiConflictException("Hợp đồng không ở bước quản lý kiểm tra.");
        contract.Status = "MANAGER_REVIEWED";
        contract.ManagerReviewedAt = DateTime.UtcNow;
        contract.ManagerReviewedByUserId = actorId;
        contract.UpdatedAt = DateTime.UtcNow;
        Audit.Add(db, actorId, "REVIEW_SCHOOL_CONTRACT", nameof(SalesContract), contract.Id, null, new { contract.Status }, http);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    public Task<long> GrantSchoolProtection(long contractId, long actorId, HttpContext http, CancellationToken ct) =>
        RetryContestedWrite(() => GrantSchoolProtectionCore(contractId, actorId, http, ct), ct);

    private async Task<long> GrantSchoolProtectionCore(long contractId, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.SchoolProtectionGrant, ct);
        if (!await db.Organizations.AnyAsync(x => x.Code == "KIDSFIT" && access.OrganizationIds.Contains(x.Id), ct)) throw new KeyNotFoundException();
        var customerId = await db.SalesContracts.Where(x => x.Id == contractId).Select(x => (long?)x.CustomerId).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var customer = await LockCustomer(customerId, ct) ?? throw new KeyNotFoundException();
        var contract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {contractId} FOR UPDATE").SingleAsync(ct);
        if (!contract.RequiresSchoolVerification) throw new KeyNotFoundException();
        if (contract.Status == "ACTIVE") return contract.Id;
        if (contract.Status != "PENDING_KIDSFIT" || contract.VerifiedAt is null || !await db.ReconciliationCases.AnyAsync(x => x.ContractId == contract.Id && x.Status == "CONFIRMED", ct))
            throw new ApiConflictException("Cần quản lý kiểm tra và CHECKEE xác minh hợp lệ trước.");
        var now = DateTime.UtcNow;
        if (await db.CustomerProtections.AnyAsync(x => x.CustomerId == customerId && x.Status == "ACTIVE" && x.EffectiveUntil > now && x.ApproachRegistrationId != contract.ApproachRegistrationId, ct))
            throw new ApiConflictException("Trường hiện có quyền bảo vệ khác. Cần giải quyết tranh chấp, không ghi đè quyền.");
        contract.ProtectionStartsAt = contract.VerifiedAt.Value;
        contract.ProtectionUntil = contract.VerifiedAt.Value.AddYears(5);
        contract.Status = "ACTIVE";
        contract.UpdatedAt = now;
        customer.LifecycleStatus = "CONTRACTED";
        customer.UpdatedAt = now;
        var registration = await db.ApproachRegistrations.SingleAsync(x => x.Id == contract.ApproachRegistrationId, ct);
        registration.Status = "CONVERTED";
        registration.UpdatedAt = now;
        await db.CustomerProtections.Where(x => x.ApproachRegistrationId == registration.Id && x.Status == "ACTIVE").ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "CONVERTED").SetProperty(x => x.UpdatedAt, now), ct);
        db.CustomerProtections.Add(new CustomerProtection { CustomerId = customerId, OwnerUserId = contract.OwnerUserId, OwnerOrganizationId = contract.OwnerOrganizationId,
            ContractId = contract.Id, SourceType = "CONTRACT", EffectiveFrom = contract.ProtectionStartsAt, EffectiveUntil = contract.ProtectionUntil, CreatedAt = now, UpdatedAt = now });
        Audit.Add(db, actorId, "GRANT_VERIFIED_SCHOOL_PROTECTION", nameof(SalesContract), contract.Id, null, new { contract.VerifiedAt, contract.ProtectionUntil }, http);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return contract.Id;
    }
}

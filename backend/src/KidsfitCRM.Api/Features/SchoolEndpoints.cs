using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public static class SchoolEndpoints
{
    public static void MapSchoolDirectory(this RouteGroupBuilder group)
    {
        group.MapSchoolOperations();
        group.MapGet("/schools", List).RequireAuthorization(Permissions.ChannelSalesView);
        group.MapGet("/schools/{id:long}", Detail).RequireAuthorization(Permissions.ChannelSalesView);
        group.MapGet("/school-capacities", Capacities).RequireAuthorization(Permissions.ChannelSalesView);
        group.MapPatch("/school-capacities/{id:long}", async (long id, ChangeSchoolCapacityRequest request, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
        {
            await actions.ChangeSchoolCapacity(id, request, http.UserId(), http, ct);
            return Results.Ok(new { message = "Đã cập nhật hạn mức; không thu hồi quyền đang hợp lệ." });
        }).RequireAuthorization(Permissions.SchoolCapacityManage);
        group.MapPost("/schools/import/preview", Preview).RequireAuthorization(Permissions.SchoolDirectoryManage)
            .WithMetadata(new RequestSizeLimitAttribute(SchoolWorkbookReader.MaxFileBytes + 65536));
        group.MapPost("/schools/import/commit", Commit).RequireAuthorization(Permissions.SchoolDirectoryManage)
            .WithMetadata(new RequestSizeLimitAttribute(SchoolWorkbookReader.MaxFileBytes + 65536));
        group.MapPost("/school-contracts/{id:long}/review", async (long id, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
        {
            await actions.ReviewSchoolContract(id, http.UserId(), http, ct);
            return Results.Ok(new { message = "Đã kiểm tra, chuyển CHECKEE xác minh." });
        }).RequireAuthorization(Permissions.SchoolContractReview);
        group.MapPost("/school-contracts/{id:long}/grant-protection", async (long id, HttpContext http, ChannelSalesActions actions, CancellationToken ct) =>
            Results.Ok(new { data = new { id = await actions.GrantSchoolProtection(id, http.UserId(), http, ct) } })).RequireAuthorization(Permissions.SchoolProtectionGrant);
    }

    private static async Task<ParsedSchoolWorkbook> ReadUpload(HttpRequest request, CancellationToken ct)
    {
        if (!request.HasFormContentType || request.ContentLength > SchoolWorkbookReader.MaxFileBytes + 65536) throw ApiValidationException.For("file", "Cần file .xlsx tối đa 2 MB.");
        var form = await request.ReadFormAsync(ct);
        var file = form.Files.GetFile("file");
        if (file is null || form.Files.Count != 1 || !Path.GetExtension(file.FileName).Equals(".xlsx", StringComparison.OrdinalIgnoreCase) || file.Length > SchoolWorkbookReader.MaxFileBytes)
            throw ApiValidationException.For("file", "Chọn một file .xlsx tối đa 2 MB.");
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream, ct);
        return SchoolWorkbookReader.Read(stream.ToArray());
    }

    private static async Task<IResult> Preview(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!await db.Organizations.AnyAsync(x => x.Code == "KIDSFIT" && access.OrganizationIds.Contains(x.Id), ct)) throw new KeyNotFoundException();
        var workbook = await ReadUpload(http.Request, ct);
        var codes = workbook.Rows.Select(x => x.SchoolCode).Distinct().ToArray();
        var existing = await db.DirectorySchools.CountAsync(x => codes.Contains(x.SchoolCode), ct);
        return Results.Ok(new { file_hash = workbook.FileHash, schools = workbook.SchoolCount, branches = workbook.BranchCount,
            rows = workbook.Rows.Length, existing_schools = existing, warnings = workbook.Warnings,
            sample = workbook.Rows.Take(8).Select(x => new { x.Row, x.SchoolCode, x.UnitType, x.Name, x.Province, x.Ward }) });
    }

    private static async Task<IResult> Commit(HttpContext http, KidsfitDbContext db, ChannelSalesActions actions, CancellationToken ct)
    {
        var workbook = await ReadUpload(http.Request, ct);
        var form = await http.Request.ReadFormAsync(ct);
        if (form["preview_hash"].ToString() != workbook.FileHash) throw new ApiConflictException("File đã thay đổi. Vui lòng xem trước lại.");
        var id = await actions.ImportSchools(workbook, form["idempotency_key"].ToString(), http.UserId(), http, ct);
        var batch = await db.SchoolImportBatches.AsNoTracking().SingleAsync(x => x.Id == id, ct);
        return Results.Ok(new { data = new { batch.Id, batch.SchoolsCreated, batch.UnitsCreated } });
    }

    internal static async Task<IResult> List(HttpContext http, KidsfitDbContext db, string? search, int? page, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var broad = access.All || access.Has(Permissions.ChannelSalesRegister) || access.Has(Permissions.ChannelSalesManage);
        var scopedCustomers = access.Customers(db).Select(x => x.Id);
        var query = from school in db.DirectorySchools.AsNoTracking()
                    join customer in db.ChannelCustomers on school.CustomerId equals customer.Id
                    where access.OrganizationIds.Length > 0 && (broad || scopedCustomers.Contains(customer.Id))
                    select new { school.Id, school.SchoolCode, school.CustomerId, customer.DisplayName, customer.Province };
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            var unitSchools = db.SchoolUnits.Where(x => x.Ward.Contains(term) || x.Name.Contains(term)).Select(x => x.DirectorySchoolId);
            query = query.Where(x => x.SchoolCode.Contains(term) || x.DisplayName.Contains(term) || (x.Province != null && x.Province.Contains(term)) || unitSchools.Contains(x.Id));
        }
        var selectedPage = Math.Max(1, page ?? 1);
        var now = DateTime.UtcNow;
        var total = await query.CountAsync(ct);
        var rows = await query.OrderBy(x => x.SchoolCode).Skip((Math.Min(selectedPage, 10000) - 1) * 20).Take(20).ToArrayAsync(ct);
        var ids = rows.Select(x => x.CustomerId).ToArray();
        var protections = await db.CustomerProtections.AsNoTracking().Where(x => ids.Contains(x.CustomerId) && x.Status == "ACTIVE" && x.EffectiveUntil > now).ToArrayAsync(ct);
        var contracts = await access.Contracts(db).AsNoTracking().Where(x => ids.Contains(x.CustomerId) && x.RequiresSchoolVerification).OrderByDescending(x => x.CreatedAt).ToArrayAsync(ct);
        var schoolIds = rows.Select(x => x.Id).ToArray();
        var units = await db.SchoolUnits.Where(x => schoolIds.Contains(x.DirectorySchoolId)).GroupBy(x => x.DirectorySchoolId).Select(g => new { Id = g.Key, Branches = g.Count(x => x.UnitType == "BRANCH"), Ward = g.Where(x => x.UnitType == "MAIN").Select(x => x.Ward).FirstOrDefault() }).ToDictionaryAsync(x => x.Id, ct);
        return Results.Ok(new { total, page = selectedPage, page_size = 20, data = rows.Select(x =>
        {
            var protection = protections.OrderByDescending(p => p.SourceType == "CONTRACT").FirstOrDefault(p => p.CustomerId == x.CustomerId);
            var contract = contracts.FirstOrDefault(c => c.CustomerId == x.CustomerId);
            return new { x.Id, x.SchoolCode, x.CustomerId, x.DisplayName, x.Province, ward = units.GetValueOrDefault(x.Id)?.Ward,
                branches = units.GetValueOrDefault(x.Id)?.Branches ?? 0,
                visible_status = ChannelCustomerStatusPolicy.Calculate(protection?.SourceType == "CONTRACT", protection is not null && protection.SourceType != "CONTRACT"),
                protected_until = protection?.EffectiveUntil, can_register = protection is null && access.Has(Permissions.ChannelSalesRegister),
                contract_id = contract?.Id, contract_status = contract?.Status };
        }) });
    }

    internal static async Task<IResult> Detail(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var school = await db.DirectorySchools.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (access.OrganizationIds.Length == 0 || (!access.All && !access.Has(Permissions.ChannelSalesRegister) && !await access.Customers(db).AnyAsync(x => x.Id == school.CustomerId, ct))) throw new KeyNotFoundException();
        var customer = await db.ChannelCustomers.AsNoTracking().SingleAsync(x => x.Id == school.CustomerId, ct);
        var registrations = await db.ApproachRegistrations.AsNoTracking().Where(x => x.CustomerId == school.CustomerId).OrderByDescending(x => x.RegisteredAt).ToArrayAsync(ct);
        var now = DateTime.UtcNow;
        var current = registrations.FirstOrDefault(x => x.Status == "ACTIVE" && x.ProtectedUntil > now);
        var scopedContractIds = access.Contracts(db).Select(c => c.Id);
        var contracts = await db.SalesContracts.AsNoTracking().Where(x => x.CustomerId == school.CustomerId
            && (scopedContractIds.Contains(x.Id) || (access.Has(Permissions.ChannelSalesReconcile) && db.ReconciliationCases.Any(r => r.ContractId == x.Id && access.OrganizationIds.Contains(r.CheckeeOrganizationId))))).ToArrayAsync(ct);
        var pii = access.All || (current is not null && access.CanManage(current.OwnerUserId, current.OwnerOrganizationId)) || (contracts.Length > 0 && access.Has(Permissions.ChannelSalesActivity));
        var canWork = current is not null && access.CanManage(current.OwnerUserId, current.OwnerOrganizationId);
        var units = await db.SchoolUnits.AsNoTracking().Where(x => x.DirectorySchoolId == id).OrderBy(x => x.SourceRow).ToArrayAsync(ct);
        var activities = pii ? await db.CustomerActivities.AsNoTracking().Where(x => x.CustomerId == school.CustomerId).OrderByDescending(x => x.CreatedAt).Take(50)
            .Select(x => new { x.ActivityType, x.Content, x.OccurredAt, x.ContactName, x.ContactPosition, x.Feedback, x.Commitment, x.NextFollowUpAt, x.CreatedAt }).ToArrayAsync(ct) : [];
        var available = !await db.CustomerProtections.AnyAsync(x => x.CustomerId == school.CustomerId && x.Status == "ACTIVE" && x.EffectiveUntil > now, ct);
        var canEdit = access.All && access.Has(Permissions.SchoolDirectoryManage) && await db.Organizations.AnyAsync(x => x.Code == "KIDSFIT" && access.OrganizationIds.Contains(x.Id), ct);
        var packages = await db.CheckeeProductPackages.AsNoTracking().Where(x => x.Status == "ACTIVE").Select(x => new { x.Id, x.Name, x.ListPrice }).ToArrayAsync(ct);
        return Results.Ok(new { school.Id, school.SchoolCode, school.CustomerId, customer.DisplayName,
            registration_id = canWork ? current!.Id : (long?)null, protected_until = current?.ProtectedUntil,
            registration_organization_id = canWork ? current!.OwnerOrganizationId : (long?)null,
            can_report_contract = canWork && access.Has(Permissions.ChannelSalesReportContract) && !contracts.Any(c => c.ApproachRegistrationId == current!.Id),
            can_activity = canWork && access.Has(Permissions.ChannelSalesActivity), activities, packages,
            can_request_extension = current is not null && current.OwnerUserId == access.UserId && access.Has(Permissions.ChannelSalesRegister)
                && !await db.SchoolExtensionRequests.AnyAsync(x => x.ApproachRegistrationId == current.Id && x.Status == "PENDING", ct),
            can_allocate = available && access.Has(Permissions.SchoolAllocationManage),
            can_dispute = access.Has(Permissions.ChannelSalesRegister) || access.Has(Permissions.ChannelSalesReconcile) || access.Has(Permissions.SchoolDisputeResolve),
            units = units.Select(x => new { x.Id, x.Version, can_edit = canEdit, x.UnitType, x.Name, x.Province, x.Ward, x.Address,
                contact_name = pii ? x.ContactName : null, contact_position = pii ? x.ContactPosition : null, contact_phone = pii ? x.ContactPhone : null,
                school_phone = pii ? x.SchoolPhone : null, email = pii ? x.Email : null, note = pii ? x.Note : null }),
            contracts = contracts.Select(x => new { x.Id, x.ContractCode, x.Status, x.VerifiedAt, x.EvidenceReference,
                protection_until = x.Status == "ACTIVE" ? x.ProtectionUntil : (DateTime?)null,
                can_review = x.Status == "PENDING_REVIEW" && access.Has(Permissions.SchoolContractReview) && access.CanManageOrganization(x.OwnerOrganizationId),
                can_grant = x.Status == "PENDING_KIDSFIT" && access.Has(Permissions.SchoolProtectionGrant) }) });
    }

    private static async Task<IResult> Capacities(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var query = db.OrganizationMemberships.AsNoTracking().Where(x => (x.MembershipType == "COLLABORATOR" || x.MembershipType == "PARTNER_COLLABORATOR")
            && (access.All || (access.OrganizationIds.Contains(x.OrganizationId) && (access.Has(Permissions.ChannelSalesManage) || x.UserId == access.UserId))));
        var now = DateTime.UtcNow;
        return Results.Ok(new { data = await (from membership in query
            join user in db.Users on membership.UserId equals user.Id
            join org in db.Organizations on membership.OrganizationId equals org.Id
            orderby user.Name
            select new { membership.Id, user.Name, organization_name = org.Name, membership.SchoolApproachLimit,
                active = db.ApproachRegistrations.Where(r => r.OwnerUserId == membership.UserId && r.OwnerOrganizationId == membership.OrganizationId && r.Status == "ACTIVE" && r.ProtectedUntil > now && db.DirectorySchools.Any(s => s.CustomerId == r.CustomerId)).Select(x => x.CustomerId).Distinct().Count(),
                history = db.SchoolCapacityChanges.Where(x => x.MembershipId == membership.Id).OrderByDescending(x => x.CreatedAt).Take(10).Select(x => new { x.PreviousLimit, x.NewLimit, x.Reason, x.CreatedAt }).ToArray()
            }).Take(100).ToArrayAsync(ct) });
    }
}

using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>Sales sees own requests; KIDSFIT sales managers approve; directors oversee only.</summary>
public static class ProtectionRenewalEndpoints
{
    public sealed record ReviewRequest(string? Reason);

    public static void Map(RouteGroupBuilder channel)
    {
        channel.MapGet("/protection-renewals", List).RequireAuthorization(Permissions.ChannelSalesView);
        channel.MapGet("/protection-renewals/eligible", Eligible).RequireAuthorization(Permissions.ChannelSalesView);
        channel.MapPost("/contracts/{contractId:long}/protection-renewal/request-review", RequestReview)
            .RequireAuthorization(Permissions.ChannelSalesRegister);
        channel.MapPost("/protection-renewals/{id:long}/approve", Approve)
            .RequireAuthorization(Permissions.ProtectionRenewalApprove);
        channel.MapPost("/protection-renewals/{id:long}/reject", Reject)
            .RequireAuthorization(Permissions.ProtectionRenewalApprove);
    }

    private static async Task<bool> IsKidsfitManager(KidsfitDbContext db, ChannelSalesAccess access, CancellationToken ct) =>
        access.Has(Permissions.ProtectionRenewalApprove)
        && await (from membership in db.OrganizationMemberships
                  join org in db.Organizations on membership.OrganizationId equals org.Id
                  where membership.UserId == access.UserId && membership.Status == "ACTIVE"
                     && org.Code == "KIDSFIT" && org.Status == "ACTIVE"
                  select membership.Id).AnyAsync(ct)
        && await (from roleUser in db.UserRoles
                  join role in db.Roles on roleUser.RoleId equals role.Id
                  where roleUser.UserId == access.UserId && role.Code == "SALES_MANAGER"
                  select role.Id).AnyAsync(ct);

    public static async Task<IResult> Eligible(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var now = DateTime.UtcNow;
        var contracts = await db.SalesContracts.AsNoTracking()
            .Where(c => c.OwnerUserId == access.UserId && c.Status == "ACTIVE"
                && c.VerifiedAt != null && access.OrganizationIds.Contains(c.OwnerOrganizationId)
                && !db.ContractCancellations.Any(x => x.ContractId == c.Id))
            .OrderByDescending(c => c.CreatedAt).Take(200).ToArrayAsync(ct);
        var data = new List<object>();
        foreach (var contract in contracts)
        {
            var protectedUntil = await db.CustomerProtections.AsNoTracking()
                .Where(p => p.ContractId == contract.Id && p.SourceType == "CONTRACT"
                    && p.OwnerUserId == access.UserId && p.Status == "ACTIVE")
                .OrderByDescending(p => p.EffectiveUntil)
                .Select(p => (DateTime?)p.EffectiveUntil).FirstOrDefaultAsync(ct);
            if (!protectedUntil.HasValue || !ProtectionRenewalPolicy.EligibleWindow(now, protectedUntil.Value))
                continue;
            var item = await db.ProtectionRenewalCases.AsNoTracking()
                .Where(x => x.ContractId == contract.Id && x.PreviousProtectionUntil == protectedUntil.Value)
                .OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync(ct);
            var confirmed = await ProtectionRenewalPolicy.HasConfirmedContinuationAsync(db,
                contract, protectedUntil.Value, now, ct);
            var name = await db.ChannelCustomers.Where(x => x.Id == contract.CustomerId)
                .Select(x => x.DisplayName).SingleAsync(ct);
            data.Add(new { contract_id = contract.Id, contract_code = contract.ContractCode,
                customer_name = name, protected_until = protectedUntil.Value,
                priority_until = ProtectionRenewalPolicy.PriorityEnds(protectedUntil.Value),
                renewal_confirmed = confirmed, request_id = item?.Id, request_status = item?.Status,
                can_request_review = item is null });
        }
        return Results.Ok(new { data });
    }

    public static async Task<IResult> List(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var manager = await IsKidsfitManager(db, access, ct);
        var director = access.Has(Permissions.ChannelSalesAllScope)
            && await (from ur in db.UserRoles join r in db.Roles on ur.RoleId equals r.Id
                where ur.UserId == access.UserId && r.Code == "DIRECTOR" select r.Id).AnyAsync(ct);
        var cases = db.ProtectionRenewalCases.AsNoTracking();
        if (!manager && !director)
            cases = cases.Where(x => x.OwnerUserId == access.UserId ||
                (access.Has(Permissions.ChannelSalesManage) && access.OrganizationIds.Contains(x.OwnerOrganizationId)
                    && db.OrganizationMemberships.Any(m => m.UserId == x.OwnerUserId
                        && m.OrganizationId == x.OwnerOrganizationId
                        && m.ManagerUserId == access.UserId && m.Status == "ACTIVE")));
        var data = await (from item in cases
            join contract in db.SalesContracts on item.ContractId equals contract.Id
            join customer in db.ChannelCustomers on item.CustomerId equals customer.Id
            join owner in db.Users on item.OwnerUserId equals owner.Id
            join organization in db.Organizations on item.OwnerOrganizationId equals organization.Id
            orderby item.UpdatedAt descending
            select new
            {
                item.Id, item.ContractId, item.CustomerId, customer_name = customer.DisplayName,
                contract.ContractCode, item.OwnerUserId, owner_name = owner.Name,
                item.OwnerOrganizationId, organization_name = organization.Name, item.Status, item.Source, item.Note,
                item.PreviousProtectionUntil, item.PriorityUntil,
                item.DecisionReason, item.ReviewedAt, item.NewProtectionFrom, item.NewProtectionUntil,
                can_approve = manager && item.Status == "PENDING_MANAGER"
            }).Take(200).ToArrayAsync(ct);
        return Results.Ok(new { data, can_approve = manager });
    }

    public static async Task<IResult> RequestReview(long contractId, ReviewRequest request,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesRegister)) return Results.Forbid();
        var now = DateTime.UtcNow;
        var note = request.Reason?.Trim();
        if (note is { Length: > 1000 }) throw ApiValidationException.For("reason", "Lý do tối đa 1000 ký tự.");
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var source = await db.SalesContracts.AsNoTracking().SingleOrDefaultAsync(c =>
            c.Id == contractId && c.OwnerUserId == access.UserId && c.Status == "ACTIVE"
            && c.VerifiedAt != null, ct) ?? throw new KeyNotFoundException();
        await db.ChannelCustomers.FromSqlInterpolated(
            $"SELECT * FROM channel_customers WHERE id = {source.CustomerId} FOR UPDATE").SingleAsync(ct);
        if (!access.InOrganization(source.OwnerOrganizationId) ||
            !await db.OrganizationMemberships.AnyAsync(x => x.UserId == access.UserId
                && x.OrganizationId == source.OwnerOrganizationId && x.Status == "ACTIVE", ct)
            || await db.ContractCancellations.AnyAsync(x => x.ContractId == source.Id, ct))
            throw new KeyNotFoundException();
        var protection = await db.CustomerProtections.AsNoTracking()
            .Where(p => p.ContractId == contractId && p.SourceType == "CONTRACT"
                && p.OwnerUserId == access.UserId && p.Status == "ACTIVE")
            .OrderByDescending(p => p.EffectiveUntil).FirstOrDefaultAsync(ct)
            ?? throw new ApiConflictException("Hợp đồng chưa có chu kỳ bảo vệ hợp lệ.");
        if (!ProtectionRenewalPolicy.EligibleWindow(now, protection.EffectiveUntil))
            throw new ApiConflictException("Chưa đến kỳ đăng ký lại hoặc đã hết 15 ngày ưu tiên.");
        var key = $"sl02:{contractId}:{protection.EffectiveUntil.Ticks}:{access.UserId}";
        var existing = await db.ProtectionRenewalCases.FirstOrDefaultAsync(x => x.DeduplicationKey == key, ct);
        if (existing is not null) return Results.Ok(new { data = new { existing.Id, existing.Status } });
        var confirmed = await ProtectionRenewalPolicy.HasConfirmedContinuationAsync(db, source, protection.EffectiveUntil, now, ct);
        var item = new ProtectionRenewalCase
        {
            ContractId = contractId, CustomerId = source.CustomerId, OwnerUserId = access.UserId,
            OwnerOrganizationId = source.OwnerOrganizationId,
            PreviousProtectionUntil = protection.EffectiveUntil,
            PriorityUntil = ProtectionRenewalPolicy.PriorityEnds(protection.EffectiveUntil),
            Status = confirmed ? "PENDING_MANAGER" : "WAITING_RENEWAL",
            Source = "MANUAL", Note = note, DeduplicationKey = key,
            CreatedAt = now, UpdatedAt = now
        };
        db.ProtectionRenewalCases.Add(item);
        await db.SaveChangesAsync(ct);
        Audit.Add(db, access.UserId, "REQUEST_PROTECTION_RENEWAL_REVIEW", nameof(ProtectionRenewalCase),
            item.Id, null, new { item.ContractId, item.Status, item.PriorityUntil }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.Created($"/api/channel-sales/protection-renewals/{item.Id}", new { data = new { item.Id, item.Status } });
    }

    public static Task<IResult> Approve(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct) =>
        Decide(id, true, null, http, db, ct);

    public static Task<IResult> Reject(long id, ReviewRequest request, HttpContext http, KidsfitDbContext db,
        CancellationToken ct) => Decide(id, false, request.Reason, http, db, ct);

    private static async Task<IResult> Decide(long id, bool approve, string? reason,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!await IsKidsfitManager(db, access, ct)) return Results.Forbid();
        if (!approve) reason = Validation.Required(reason, "reason", "Cần nhập lý do từ chối.", 1000);
        var now = DateTime.UtcNow;
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var caseCustomerId = await db.ProtectionRenewalCases.AsNoTracking()
            .Where(x => x.Id == id).Select(x => (long?)x.CustomerId).SingleOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException();
        await db.ChannelCustomers.FromSqlInterpolated(
            $"SELECT * FROM channel_customers WHERE id = {caseCustomerId} FOR UPDATE").SingleAsync(ct);
        var item = await db.ProtectionRenewalCases.FromSqlInterpolated(
            $"SELECT * FROM protection_renewal_cases WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException();
        if (item.Status != "PENDING_MANAGER")
            throw new ApiConflictException("Hồ sơ không còn ở trạng thái chờ Quản lý KIDSFIT.");
        if (now >= item.PriorityUntil && now >= item.PreviousProtectionUntil)
            throw new ApiConflictException("Đã hết thời gian ưu tiên; hồ sơ cần xử lý theo quy trình đăng ký mới.");
        var contract = await db.SalesContracts.FromSqlInterpolated(
            $"SELECT * FROM sales_contracts WHERE id = {item.ContractId} FOR UPDATE").SingleAsync(ct);
        if (contract.CustomerId != item.CustomerId || contract.OwnerUserId != item.OwnerUserId
            || contract.OwnerOrganizationId != item.OwnerOrganizationId
            || contract.Status != "ACTIVE" || contract.VerifiedAt is null
            || await db.ContractCancellations.AnyAsync(x => x.ContractId == contract.Id, ct))
            throw new ApiConflictException("Hợp đồng hoặc người phụ trách đã thay đổi.");
        if (approve)
        {
            if (!await db.OrganizationMemberships.AnyAsync(m =>
                    m.UserId == item.OwnerUserId && m.OrganizationId == item.OwnerOrganizationId
                    && m.Status == "ACTIVE", ct)
                || !await db.Users.AnyAsync(u => u.Id == item.OwnerUserId && u.Status == "ACTIVE", ct))
                throw new ApiConflictException("Sales cũ không còn quyền phụ trách hợp lệ.");
            if (!await ProtectionRenewalPolicy.HasConfirmedContinuationAsync(db, contract,
                item.PreviousProtectionUntil, now, ct))
                throw new ApiConflictException("Kế toán chưa xác nhận kỳ tái ký tiếp tục sử dụng phần mềm.");
            var interruption = await ServiceInterruptionService.AssessAsync(db, item.CustomerId,
                ContractExpiryAlertService.BusinessDate(now), now, ct);
            if (interruption is not null && interruption.Assessment.Status is
                (ServiceInterruptionPolicy.AssessmentStatus.ThresholdReached
                or ServiceInterruptionPolicy.AssessmentStatus.HistoricalThresholdRequiresReview))
                throw new ApiConflictException("Khách hàng có gián đoạn dịch vụ đủ 12 tháng; cần xử lý quyền bảo vệ theo GI-01.");
            if (!await db.CustomerProtections.AnyAsync(p => p.ContractId == item.ContractId
                && p.OwnerUserId == item.OwnerUserId && p.SourceType == "CONTRACT"
                && p.Status == "ACTIVE", ct))
                throw new ApiConflictException("Quyền bảo vệ cũ đã kết thúc, không thể gia hạn lại.");
            var from = now > item.PreviousProtectionUntil ? now : item.PreviousProtectionUntil;
            var until = from.AddYears(5);
            if (await db.CustomerProtections.AnyAsync(p => p.CustomerId == item.CustomerId
                && p.Status == "ACTIVE" && p.EffectiveFrom < until && p.EffectiveUntil > from, ct))
                throw new ApiConflictException("Khách hàng đã có quyền bảo vệ giao nhau với chu kỳ mới.");
            db.CustomerProtections.Add(new CustomerProtection
            {
                ContractId = item.ContractId, CustomerId = item.CustomerId,
                OwnerUserId = item.OwnerUserId, OwnerOrganizationId = item.OwnerOrganizationId,
                SourceType = "CONTRACT", Status = "ACTIVE", EffectiveFrom = from, EffectiveUntil = until,
                CreatedAt = now, UpdatedAt = now
            });
            item.NewProtectionFrom = from;
            item.NewProtectionUntil = until;
            item.Status = "APPROVED";
            // Historical source contract protection timestamps stay immutable. The new
            // five-year cycle is a separate CustomerProtection record linked to the same contract.
        }
        else
        {
            item.Status = "REJECTED";
            item.DecisionReason = reason;
        }
        item.ReviewedByUserId = access.UserId;
        item.ReviewedAt = now;
        item.UpdatedAt = now;
        Audit.Add(db, access.UserId, approve ? "APPROVE_PROTECTION_RENEWAL" : "REJECT_PROTECTION_RENEWAL",
            nameof(ProtectionRenewalCase), item.Id, null,
            new { item.Status, item.DecisionReason, item.NewProtectionFrom, item.NewProtectionUntil }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.Ok(new { data = new { item.Id, item.Status, item.NewProtectionFrom, item.NewProtectionUntil } });
    }
}

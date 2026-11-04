using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    public Task<long> AssignContractCare(long contractId, AssignContractCareRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolCareAssign, ct);
        // Only a central Admin may assign across partner-owned contracts.
        // Old permission rows granted to Sales Managers must not authorize this action.
        if (!access.All || !access.Has(Permissions.ChannelSalesIdentityManage)
            || !await db.Organizations.AnyAsync(o => o.Code == "KIDSFIT" && o.Status == "ACTIVE"
                && access.OrganizationIds.Contains(o.Id), ct))
            throw new KeyNotFoundException();
        var key = SchoolKey(request.IdempotencyKey); var hash = ChannelSalesValidation.Fingerprint(request, contractId);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        if (!await db.Organizations.AnyAsync(o => o.Id == request.CareOrganizationId && o.Code == "KIDSFIT" && o.Status == "ACTIVE", ct))
            throw ApiValidationException.For("care_organization_id", "Chỉ phân công CSKH thuộc KIDSFIT.");
        await ActiveSchoolMembership(request.UserId, request.CareOrganizationId, ct);
        var nextCare = await ChannelSalesAccess.Load(db, request.UserId, ct);
        if (!nextCare.Has(Permissions.SchoolSupportManage)) throw ApiValidationException.For("user_id", "Nhân sự cần có quyền chăm sóc khách hàng.");
        var contract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {contractId} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        // Admin already authorized with all-scope; owner organization may be a partner.
        var replay = await db.ContractCareHandovers.SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.ActorUserId, actorId, replay.RequestFingerprint, hash);
        if (contract.Status != "ACTIVE" || contract.VerifiedAt is null)
            throw new ApiConflictException("Chỉ phân công CSKH cho hợp đồng đang hoạt động đã được CHECKEE xác minh.");
        // The Admin assignment form does not request a reason. Store a meaningful default in handover history.
        var reason = string.IsNullOrWhiteSpace(request.Reason)
            ? (contract.CareUserId.HasValue
                ? "Admin điều chuyển nhân viên CSKH."
                : "Admin phân công nhân viên CSKH.")
            : Validation.Required(request.Reason, "reason", "Nội dung bàn giao CSKH không hợp lệ.", 4000);
        var now = DateTime.UtcNow;
        var handover = new ContractCareHandover
        {
            ContractId = contract.Id, PreviousUserId = contract.CareUserId, AssignedUserId = request.UserId,
            CareOrganizationId = request.CareOrganizationId, ActorUserId = actorId, Reason = reason,
            IdempotencyKey = key, RequestFingerprint = hash, CreatedAt = now, UpdatedAt = now,
        };
        contract.CareUserId = request.UserId; contract.CareOrganizationId = request.CareOrganizationId; contract.UpdatedAt = now;
        await db.CustomerSupportCases.Where(x => x.ContractId == contractId && x.Status != "RESOLVED")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.AssignedUserId, request.UserId).SetProperty(x => x.OrganizationId, request.CareOrganizationId).SetProperty(x => x.UpdatedAt, now), ct);
        db.ContractCareHandovers.Add(handover); await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "ASSIGN_CONTRACT_CARE", nameof(ContractCareHandover), handover.Id, new { handover.PreviousUserId },
            new { handover.ContractId, handover.AssignedUserId, handover.CareOrganizationId }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return handover.Id;
    }, ct);

    public Task<long> CreateCustomerSupportCase(CreateCustomerSupportCaseRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolSupportManage, ct);
        var key = SchoolKey(request.IdempotencyKey); var hash = ChannelSalesValidation.Fingerprint(request);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var contract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {request.ContractId} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        EnsureContractCareAccess(access, contract);
        var replay = await db.CustomerSupportCases.SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.CreatedByUserId, actorId, replay.RequestFingerprint, hash);
        if (contract.Status != "ACTIVE" || contract.VerifiedAt is null) throw new ApiConflictException("Hợp đồng chưa được CHECKEE xác minh để hỗ trợ CSKH.");
        if (!contract.CareUserId.HasValue || !contract.CareOrganizationId.HasValue) throw new ApiConflictException("Cần phân công người CSKH trước khi mở hồ sơ hỗ trợ.");
        // Contract lock serializes assignment changes; membership is read here to avoid reversing its lock order.
        if (!await db.OrganizationMemberships.AnyAsync(x => x.UserId == contract.CareUserId && x.OrganizationId == contract.CareOrganizationId && x.Status == "ACTIVE", ct)
            || !await db.Users.AnyAsync(x => x.Id == contract.CareUserId && x.Status == "ACTIVE", ct)) throw new ApiConflictException("Người CSKH đã ngưng hoạt động; cần bàn giao lại.");
        var caretaker = await ChannelSalesAccess.Load(db, contract.CareUserId.Value, ct);
        if (!caretaker.Has(Permissions.SchoolSupportManage)) throw new ApiConflictException("Người phụ trách không còn quyền CSKH; cần bàn giao lại.");
        // Usage questions are logged via CustomerActivity SUPPORT; tickets represent software errors only.
        var checkeeOrg = await db.Organizations.Where(o => o.Code == "CHECKEE" && o.Status == "ACTIVE")
            .Select(o => (long?)o.Id).SingleOrDefaultAsync(ct);
        if (!checkeeOrg.HasValue) throw new ApiConflictException("Chưa cấu hình đơn vị CHECKEE hỗ trợ kỹ thuật.");
        var now = DateTime.UtcNow;
        var item = new CustomerSupportCase
        {
            ContractId = contract.Id, CustomerId = contract.CustomerId, OrganizationId = contract.CareOrganizationId.Value,
            AssignedUserId = contract.CareUserId.Value, CreatedByUserId = actorId,
            TicketType = "SYSTEM_ERROR", CheckeeOrganizationId = checkeeOrg.Value,
            ForwardedAt = now, ForwardedByUserId = actorId,
            Subject = Validation.Required(request.Subject, "subject", "Cần tiêu đề yêu cầu.", 190),
            Description = Validation.Required(request.Description, "description", "Cần nội dung yêu cầu.", 4000),
            IdempotencyKey = key, RequestFingerprint = hash, CreatedAt = now, UpdatedAt = now,
        };
        db.CustomerSupportCases.Add(item); await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "CREATE_CUSTOMER_SUPPORT_CASE", nameof(CustomerSupportCase), item.Id, null,
            new { item.ContractId, item.AssignedUserId, item.OrganizationId, item.Status, item.TicketType, item.CheckeeOrganizationId }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return item.Id;
    }, ct);

    public Task<long> UpdateCustomerSupportCase(long id, UpdateCustomerSupportCaseRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.SchoolSupportManage, ct);
        var status = Validation.Required(request.Status, "status", "Cần trạng thái xử lý.", 24).ToUpperInvariant();
        if (status is not ("OPEN" or "IN_PROGRESS" or "RESOLVED")) throw ApiValidationException.For("status", "Trạng thái hỗ trợ không hợp lệ.");
        var content = Validation.Required(request.Content, "content", "Cần ghi tiến độ hoặc kết quả xử lý.", 4000);
        var lookup = await db.CustomerSupportCases.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var contract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {lookup.ContractId} FOR UPDATE").SingleAsync(ct);
        EnsureContractCareAccess(access, contract);
        var item = await db.CustomerSupportCases.FromSqlInterpolated($"SELECT * FROM customer_support_cases WHERE id = {id} FOR UPDATE").SingleAsync(ct);
        if (item.Status == "RESOLVED") throw new ApiConflictException("Yêu cầu đã kết thúc; cần mở yêu cầu mới để tiếp tục hỗ trợ.");
        if (status == "RESOLVED" && item.TicketType == "SYSTEM_ERROR" && !item.CheckeeRespondedAt.HasValue)
            throw new ApiConflictException("Cần CHECKEE hoàn tất kỹ thuật trước khi CSKH đóng ticket.");
        if (item.Status == "IN_PROGRESS" && status == "OPEN") throw new ApiConflictException("Không chuyển ngược yêu cầu đang xử lý về mới nhận.");
        var now = DateTime.UtcNow; var previous = item.Status;
        item.Status = status; item.UpdatedAt = now;
        if (status == "RESOLVED") { item.Outcome = content; item.ResolvedAt = now; }
        db.CustomerActivities.Add(new CustomerActivity
        {
            CustomerId = item.CustomerId, SupportCaseId = item.Id, UserId = actorId, ActivityType = "SUPPORT",
            Content = content, OccurredAt = now, NextFollowUpAt = request.NextFollowUpAt?.ToUniversalTime(), CreatedAt = now, UpdatedAt = now,
        });
        Audit.Add(db, actorId, "UPDATE_CUSTOMER_SUPPORT_CASE", nameof(CustomerSupportCase), item.Id, new { status = previous }, new { item.Status, item.ResolvedAt }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return id;
    }, ct);

    private static void EnsureContractCareAccess(ChannelSalesAccess access, SalesContract contract)
    {
        if (!access.All && !(contract.CareUserId == access.UserId && contract.CareOrganizationId.HasValue && access.InOrganization(contract.CareOrganizationId.Value))
            && !(access.All && access.Has(Permissions.ChannelSalesIdentityManage))) throw new KeyNotFoundException();
    }
}

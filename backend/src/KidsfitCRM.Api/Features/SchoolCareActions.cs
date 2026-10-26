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
        var key = SchoolKey(request.IdempotencyKey); var hash = ChannelSalesValidation.Fingerprint(request, contractId);
        var reason = Validation.Required(request.Reason, "reason", "Cần nội dung bàn giao CSKH.", 4000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await ActiveSchoolMembership(request.UserId, request.CareOrganizationId, ct);
        var nextCare = await ChannelSalesAccess.Load(db, request.UserId, ct);
        if (!nextCare.Has(Permissions.SchoolSupportManage)) throw ApiValidationException.For("user_id", "Nhân sự cần có quyền chăm sóc khách hàng.");
        var contract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {contractId} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if ((!access.CanManageOrganization(contract.OwnerOrganizationId)
            && !(contract.CareOrganizationId.HasValue && access.CanManageOrganization(contract.CareOrganizationId.Value)))
            || !access.CanManageOrganization(request.CareOrganizationId)) throw new KeyNotFoundException();
        var replay = await db.ContractCareHandovers.SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.ActorUserId, actorId, replay.RequestFingerprint, hash);
        var historicalCare = contract.Status == "CANCELLED" && await db.ContractCancellations.AnyAsync(x => x.ContractId == contractId && x.PreviousStatus == "ACTIVE", ct);
        if ((contract.Status != "ACTIVE" && !historicalCare) || (contract.RequiresSchoolVerification && contract.VerifiedAt is null))
            throw new ApiConflictException("Chỉ bàn giao CSKH cho hợp đồng đang hoạt động và đã xác minh hợp lệ.");
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
        if (contract.Status != "ACTIVE" || (contract.RequiresSchoolVerification && contract.VerifiedAt is null)) throw new ApiConflictException("Hợp đồng chưa đủ điều kiện tiếp nhận CSKH.");
        if (!contract.CareUserId.HasValue || !contract.CareOrganizationId.HasValue) throw new ApiConflictException("Cần phân công người CSKH trước khi mở hồ sơ hỗ trợ.");
        // Contract lock serializes assignment changes; membership is read here to avoid reversing its lock order.
        if (!await db.OrganizationMemberships.AnyAsync(x => x.UserId == contract.CareUserId && x.OrganizationId == contract.CareOrganizationId && x.Status == "ACTIVE", ct)
            || !await db.Users.AnyAsync(x => x.Id == contract.CareUserId && x.Status == "ACTIVE", ct)) throw new ApiConflictException("Người CSKH đã ngưng hoạt động; cần bàn giao lại.");
        var caretaker = await ChannelSalesAccess.Load(db, contract.CareUserId.Value, ct);
        if (!caretaker.Has(Permissions.SchoolSupportManage)) throw new ApiConflictException("Người phụ trách không còn quyền CSKH; cần bàn giao lại.");
        var now = DateTime.UtcNow;
        var item = new CustomerSupportCase
        {
            ContractId = contract.Id, CustomerId = contract.CustomerId, OrganizationId = contract.CareOrganizationId.Value,
            AssignedUserId = contract.CareUserId.Value, CreatedByUserId = actorId,
            Subject = Validation.Required(request.Subject, "subject", "Cần tiêu đề yêu cầu.", 190),
            Description = Validation.Required(request.Description, "description", "Cần nội dung yêu cầu.", 4000),
            IdempotencyKey = key, RequestFingerprint = hash, CreatedAt = now, UpdatedAt = now,
        };
        db.CustomerSupportCases.Add(item); await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "CREATE_CUSTOMER_SUPPORT_CASE", nameof(CustomerSupportCase), item.Id, null,
            new { item.ContractId, item.AssignedUserId, item.OrganizationId, item.Status }, http);
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
            && !(access.Has(Permissions.SchoolCareAssign) && access.CanManageOrganization(contract.OwnerOrganizationId))) throw new KeyNotFoundException();
    }
}

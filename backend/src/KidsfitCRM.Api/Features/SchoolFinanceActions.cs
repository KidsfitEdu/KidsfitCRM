using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    public Task<long> CancelSalesContract(long contractId, CancelSalesContractRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesContractCancel, ct);
        var key = SchoolKey(request.IdempotencyKey); var hash = ChannelSalesValidation.Fingerprint(request, contractId);
        var reason = Validation.Required(request.Reason, "reason", "Cần lý do hủy/chấm dứt hợp đồng.", 4000);
        var reference = Validation.Required(request.DecisionReference, "decision_reference", "Cần căn cứ quyết định hủy hợp đồng.", 120);
        var customerId = await db.SalesContracts.Where(x => x.Id == contractId).Select(x => (long?)x.CustomerId).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var customer = await LockCustomer(customerId, ct) ?? throw new KeyNotFoundException();
        var contract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {contractId} FOR UPDATE").SingleAsync(ct);
        if (!access.CanManageOrganization(contract.OwnerOrganizationId)) throw new KeyNotFoundException();
        var replay = await db.ContractCancellations.SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.ActorUserId, actorId, replay.RequestFingerprint, hash);
        if (contract.Status is "CANCELLED" or "REJECTED") throw new ApiConflictException("Hợp đồng đã hủy hoặc từ chối; không ghi thêm quyết định hủy khác.");
        var now = DateTime.UtcNow;
        var cancellation = new ContractCancellation
        {
            ContractId = contract.Id, ActorUserId = actorId, PreviousStatus = contract.Status, Reason = reason, DecisionReference = reference,
            IdempotencyKey = key, RequestFingerprint = hash, CreatedAt = now, UpdatedAt = now,
        };
        contract.Status = "CANCELLED"; contract.UpdatedAt = now;
        await db.CustomerProtections.Where(x => x.ContractId == contract.Id && x.Status == "ACTIVE")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "CANCELLED").SetProperty(x => x.UpdatedAt, now), ct);
        // Release only this contract's registration. Another legitimate owner's protection is untouched.
        var registration = await db.ApproachRegistrations.SingleAsync(x => x.Id == contract.ApproachRegistrationId, ct);
        if (registration.Status is "ACTIVE" or "CONVERTED")
        {
            registration.Status = "CANCELLED"; registration.UpdatedAt = now;
            await db.CustomerProtections.Where(x => x.ApproachRegistrationId == registration.Id && x.SourceType == "APPROACH" && x.Status == "ACTIVE")
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "CANCELLED").SetProperty(x => x.UpdatedAt, now), ct);
        }
        if (!await db.SalesContracts.AnyAsync(x => x.CustomerId == customerId && x.Id != contractId && x.Status == "ACTIVE", ct))
        { customer.LifecycleStatus = "PROSPECT"; customer.UpdatedAt = now; }
        await db.RevenueSchedules.Where(x => x.ContractId == contractId && x.Status != "PAID")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "CANCELLED").SetProperty(x => x.UpdatedAt, now), ct);
        await ReopenFinancialReconciliation(contract, actorId, "CONTRACT_CANCELLED", reference, now, ct);
        db.ContractCancellations.Add(cancellation); await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "CANCEL_SALES_CONTRACT", nameof(ContractCancellation), cancellation.Id, new { cancellation.PreviousStatus },
            new { cancellation.ContractId, contract.Status, cancellation.DecisionReference }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return cancellation.Id;
    }, ct);

    public Task<long> RecordRevenueRefund(long receiptId, RecordRevenueRefundRequest request, long actorId, HttpContext http, CancellationToken ct) => SchoolWrite(async () =>
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesRevenueRefund, ct);
        ChannelSalesValidation.WholeDong(request.Amount, "amount");
        var key = SchoolKey(request.IdempotencyKey); var hash = ChannelSalesValidation.Fingerprint(request, receiptId);
        var reason = Validation.Required(request.Reason, "reason", "Cần lý do hoàn tiền.", 4000);
        var reference = Validation.Required(request.ReferenceCode, "reference_code", "Cần mã chứng từ hoàn tiền thực tế.", 120).ToUpperInvariant();
        var decision = Validation.Required(request.DecisionReference, "decision_reference", "Cần căn cứ phê duyệt hoàn tiền.", 120);
        var contractId = await db.RevenueReceipts.Where(x => x.Id == receiptId).Select(x => (long?)x.ContractId).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var contract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {contractId} FOR UPDATE").SingleAsync(ct);
        if (!access.CanManageOrganization(contract.OwnerOrganizationId)) throw new KeyNotFoundException();
        var replay = await db.RevenueRefunds.SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.RecordedByUserId, actorId, replay.RequestFingerprint, hash);
        var receipt = await db.RevenueReceipts.SingleAsync(x => x.Id == receiptId, ct);
        if (receipt.Status != "COMPLETED") throw new ApiConflictException("Chỉ hoàn khoản đã thu thực tế.");
        var refunded = await db.RevenueRefunds.Where(x => x.RevenueReceiptId == receiptId).SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
        if (request.Amount > receipt.Amount - refunded) throw new ApiConflictException("Số tiền hoàn vượt phần đã thu chưa hoàn của phiếu gốc.");
        var now = DateTime.UtcNow; var refundedAt = request.RefundedAt?.ToUniversalTime() ?? now;
        if (refundedAt > now || refundedAt < receipt.ReceivedAt) throw ApiValidationException.For("refunded_at", "Ngày hoàn phải từ ngày thu đến hiện tại.");
        var refund = new RevenueRefund
        {
            RevenueReceiptId = receipt.Id, ContractId = contract.Id, RecordedByUserId = actorId, Amount = request.Amount,
            RefundedAt = refundedAt, ReferenceCode = reference, Reason = reason, DecisionReference = decision,
            IdempotencyKey = key, RequestFingerprint = hash, CreatedAt = now, UpdatedAt = now,
        };
        db.RevenueRefunds.Add(refund);
        if (receipt.RevenueScheduleId.HasValue)
        {
            var schedule = await db.RevenueSchedules.SingleAsync(x => x.Id == receipt.RevenueScheduleId, ct);
            schedule.AmountReceived -= refund.Amount;
            schedule.Status = contract.Status == "CANCELLED" ? "CANCELLED" : schedule.AmountReceived == 0 ? "PENDING" : "PARTIAL";
            schedule.UpdatedAt = now;
        }
        await ReopenFinancialReconciliation(contract, actorId, "REVENUE_REFUNDED", decision, now, ct);
        // Deliberately no automatic commission debit. Any approved adjustment uses the existing append-only ledger action.
        await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "RECORD_REVENUE_REFUND", nameof(RevenueRefund), refund.Id, null,
            new { refund.ContractId, refund.RevenueReceiptId, refund.Amount, refund.RefundedAt, refund.ReferenceCode, refund.DecisionReference }, http);
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return refund.Id;
    }, ct);

    private async Task ReopenFinancialReconciliation(SalesContract contract, long actorId, string eventType, string reference, DateTime now, CancellationToken ct)
    {
        var reconciliation = await db.ReconciliationCases.SingleOrDefaultAsync(x => x.ContractId == contract.Id, ct);
        if (reconciliation is null) return;
        reconciliation.Status = "REVIEW_REQUIRED"; reconciliation.ResolvedAt = null; reconciliation.UpdatedAt = now;
        db.ReconciliationEvents.Add(new ReconciliationEvent
        {
            ReconciliationCaseId = reconciliation.Id, ActorUserId = actorId, EventType = eventType,
            Reason = reference, CreatedAt = now, UpdatedAt = now,
        });
    }
}

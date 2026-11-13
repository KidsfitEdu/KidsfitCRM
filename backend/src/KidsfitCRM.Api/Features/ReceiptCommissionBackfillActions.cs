using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>
/// Explicit one-receipt remediation for legacy cash with NO commission ledger.
/// It never rewrites historical earnings or silently backfills a paid receipt.
/// </summary>
public sealed partial class ChannelSalesActions
{
    private sealed record ReceiptCommissionAssessment(
        RevenueReceipt Receipt, SalesContract Contract, decimal EligibleCash,
        long? ManagerId, bool ManagerValid, decimal SalesRate, decimal ManagerRate,
        string PolicySource, long? PolicyVersionId, int LedgerCount)
    {
        public object Preview => new {
            receipt_id = Receipt.Id, contract_id = Contract.Id,
            eligible_cash = EligibleCash, sales_user_id = Contract.OwnerUserId,
            manager_user_id = ManagerValid ? ManagerId : null,
            manager_review_required = ManagerRate > 0 && !ManagerValid,
            requires_manager_verification = ManagerRate > 0 && ManagerValid,
            sales_percent = SalesRate, manager_percent = ManagerRate,
            sales_amount = decimal.Round(EligibleCash * SalesRate / 100m, 0, MidpointRounding.AwayFromZero),
            manager_amount = ManagerValid
                ? decimal.Round(EligibleCash * ManagerRate / 100m, 0, MidpointRounding.AwayFromZero)
                : 0m,
            policy_source = PolicySource, board_policy_version_id = PolicyVersionId,
            has_existing_ledger = LedgerCount > 0,
            can_apply = LedgerCount == 0 && EligibleCash > 0
        };
    }

    private async Task<ReceiptCommissionAssessment> AssessReceiptCommission(
        long receiptId, ChannelSalesAccess access, CancellationToken ct)
    {
        var receipt = await db.RevenueReceipts.AsNoTracking().SingleOrDefaultAsync(x => x.Id == receiptId, ct)
            ?? throw new KeyNotFoundException();
        var contract = await db.SalesContracts.AsNoTracking().SingleOrDefaultAsync(x => x.Id == receipt.ContractId, ct)
            ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(contract.OwnerOrganizationId)) throw new KeyNotFoundException();
        if (receipt.Status != "COMPLETED") throw new ApiConflictException("Chỉ đối soát khoản thu đã hoàn tất.");
        var refunds = await db.RevenueRefunds.AsNoTracking()
            .Where(x => x.RevenueReceiptId == receiptId)
            .SumAsync(x => (decimal?)x.Amount, ct) ?? 0m;
        var eligibleCash = receipt.Amount - refunds;
        var managerId = await db.OrganizationMemberships.AsNoTracking()
            .Where(m => m.OrganizationId == contract.OwnerOrganizationId && m.UserId == contract.OwnerUserId
                && (m.Status == "ACTIVE" || m.Status == "SUSPENDED"))
            .OrderByDescending(m => m.IsPrimary).ThenByDescending(m => m.CreatedAt)
            .Select(m => m.ManagerUserId).FirstOrDefaultAsync(ct);
        var managerValid = managerId.HasValue && managerId != contract.OwnerUserId
            && await db.OrganizationMemberships.AsNoTracking().AnyAsync(m =>
                m.OrganizationId == contract.OwnerOrganizationId
                && m.UserId == managerId.Value && m.Status == "ACTIVE"
                && db.Users.Any(u => u.Id == m.UserId && u.Status == "ACTIVE")
                && db.UserRoles.Any(ur => ur.UserId == m.UserId
                    && db.Roles.Any(r => r.Id == ur.RoleId && r.Code == "SALES_MANAGER")), ct);
        var versions = await db.BoardCommissionPolicyVersions.AsNoTracking()
            .Where(x => x.CreatedAt <= receipt.ReceivedAt).ToArrayAsync(ct);
        var p = BoardCommissionPolicyEndpoints.ResolveAt(versions,
            contract.OwnerOrganizationId, managerId, contract.OwnerUserId, receipt.ReceivedAt);
        var existing = await db.CommissionLedgerEntries.AsNoTracking()
            .CountAsync(x => x.RevenueReceiptId == receiptId, ct);
        return new(receipt, contract, eligibleCash, managerId, managerValid,
            p.Sales, p.Manager, p.Source, p.VersionId, existing);
    }

    public async Task<IResult> PreviewReceiptCommissionBackfill(long receiptId, long actorId, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesCommissionAdjust, ct);
        var preview = await AssessReceiptCommission(receiptId, access, ct);
        return Results.Ok(new { data = preview.Preview });
    }

    public async Task<IResult> BackfillReceiptCommission(
        long receiptId, ConfirmReceiptCommissionBackfillRequest request,
        long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesCommissionAdjust, ct);
        if (!request.Confirm)
            throw ApiValidationException.For("confirm", "Cần xác nhận đối soát khoản thu trước khi lập bút toán.");
        var reason = Validation.Required(request.Reason, "reason",
            "Cần nêu lý do đối soát và tính hoa hồng bổ sung.", 1000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        // Serialize with other financial writes on the contract. The receipt-role
        // unique index is the final concurrency guard.
        var contractId = await db.RevenueReceipts.Where(x => x.Id == receiptId)
            .Select(x => (long?)x.ContractId).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        await db.SalesContracts.FromSqlInterpolated(
            $"SELECT * FROM sales_contracts WHERE id = {contractId} FOR UPDATE").SingleAsync(ct);
        var assessment = await AssessReceiptCommission(receiptId, access, ct);
        if (assessment.LedgerCount != 0)
            throw new ApiConflictException("Khoản thu đã có bút toán hoa hồng; không tự tính lại hoặc bổ sung chồng lấn. Cần rà soát lịch sử.");
        if (assessment.EligibleCash <= 0)
            throw new ApiConflictException("Khoản thu không còn số tiền thực thu đủ điều kiện tính hoa hồng.");
        if (assessment.SalesRate <= 0 && !(assessment.ManagerRate > 0
            && assessment.ManagerValid && request.ManagerVerified))
            throw new ApiConflictException("Chưa có người hưởng và tỷ lệ dương đã được xác minh để tạo bút toán.");
        var now = DateTime.UtcNow;
        if (assessment.SalesRate > 0)
            db.CommissionLedgerEntries.Add(NewCommissionAccrual(
                assessment.Contract, assessment.Receipt, actorId,
                assessment.Receipt.ReceivedAt, now, assessment.EligibleCash,
                "SALES", assessment.Contract.OwnerUserId, assessment.SalesRate,
                assessment.PolicySource, assessment.PolicyVersionId));
        if (assessment.ManagerRate > 0 && assessment.ManagerValid && assessment.ManagerId.HasValue
            && request.ManagerVerified)
            db.CommissionLedgerEntries.Add(NewCommissionAccrual(
                assessment.Contract, assessment.Receipt, actorId,
                assessment.Receipt.ReceivedAt, now, assessment.EligibleCash,
                "MANAGER", assessment.ManagerId.Value, assessment.ManagerRate,
                assessment.PolicySource, assessment.PolicyVersionId));
        if (assessment.ManagerRate > 0 && (!assessment.ManagerValid || !request.ManagerVerified))
            Audit.Add(db, actorId, "COMMISSION_MANAGER_REVIEW_REQUIRED",
                nameof(RevenueReceipt), receiptId, null,
                new { assessment.Contract.OwnerUserId, assessment.ManagerId,
                    assessment.ManagerRate, request.ManagerVerified, backfill = true }, http);
        Audit.Add(db, actorId, "BACKFILL_RECEIPT_COMMISSION",
            nameof(RevenueReceipt), receiptId, null,
            new { reason, assessment.EligibleCash, assessment.SalesRate,
                assessment.ManagerRate, assessment.PolicyVersionId,
                assessment.PolicySource, manager_review_required =
                    assessment.ManagerRate > 0 && (!assessment.ManagerValid || !request.ManagerVerified) }, http);
        try
        {
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (DbUpdateException)
        {
            await tx.RollbackAsync(ct);
            throw new ApiConflictException("Khoản thu đã được đối soát bởi yêu cầu khác. Vui lòng tải lại.");
        }
        return Results.Ok(new { message = "Đã đối soát và tạo bút toán hoa hồng bổ sung.",
            data = assessment.Preview });
    }
}

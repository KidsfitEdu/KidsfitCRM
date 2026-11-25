using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    public Task<long> RecordRevenueReceipt(long contractId, RecordRevenueReceiptRequest request, long actorId, HttpContext http, CancellationToken cancellationToken) =>
        RetryContestedWrite(() => RecordRevenueReceiptCore(contractId, request, actorId, http, cancellationToken), cancellationToken);

    private async Task<long> RecordRevenueReceiptCore(long contractId, RecordRevenueReceiptRequest request, long actorId, HttpContext http, CancellationToken cancellationToken)
    {
        var idempotencyKey = Validation.Required(request.IdempotencyKey, "idempotency_key", "Thiếu khóa chống gửi trùng.", 120);
        var hash = ChannelSalesValidation.Fingerprint(request, contractId);
        await RequirePermission(actorId, Permissions.ChannelSalesRecordRevenue, cancellationToken);
        var existing = await db.RevenueReceipts.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, cancellationToken);
        if (existing is not null) return ChannelSalesValidation.Replay(existing.Id, existing.RecordedByUserId, actorId, existing.RequestFingerprint, hash);
        ChannelSalesValidation.WholeDong(request.Amount, "amount");
        var referenceCode = Validation.Required(request.ReferenceCode, "reference_code", "Vui lòng nhập mã phiếu thu.", 64).ToUpperInvariant();
        var paymentMethod = Validation.Required(request.PaymentMethod ?? "BANK_TRANSFER", "payment_method", "Phương thức thu không hợp lệ.", 32).ToUpperInvariant();
        if (!new[] { "BANK_TRANSFER", "CASH", "CARD", "OTHER" }.Contains(paymentMethod)) throw ApiValidationException.For("payment_method", "Phương thức thu không được hỗ trợ.");
        var now = DateTime.UtcNow;

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        try
        {
            var contract = await db.SalesContracts
                .FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {contractId} FOR UPDATE")
                .SingleOrDefaultAsync(cancellationToken) ?? throw new KeyNotFoundException();
            var replayAfterLock = await db.RevenueReceipts.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, cancellationToken);
            if (replayAfterLock is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ChannelSalesValidation.Replay(replayAfterLock.Id, replayAfterLock.RecordedByUserId, actorId, replayAfterLock.RequestFingerprint, hash);
            }
            await EnsureOrganizationScope(contract.OwnerOrganizationId, actorId, cancellationToken);
            if (contract.Status != "ACTIVE") throw new ApiConflictException("Chỉ có thể ghi nhận thu cho hợp đồng đang hoạt động.");
            // Check early so the client receives a field-level validation error.
            // The unique database index remains the final guard for concurrent contracts.
            if (await db.RevenueReceipts.AsNoTracking().AnyAsync(x => x.ReferenceCode == referenceCode, cancellationToken))
                throw ApiValidationException.For("reference_code", "Mã giao dịch ngân hàng đã được ghi nhận cho khoản thu khác. Vui lòng kiểm tra mã trên chứng từ.");
            if (contract.OwnerPersonnelType is null)
            {
                // Legacy contracts acquire a group snapshot at their first subsequent receipt.
                // Existing commission entries and their policy versions remain unchanged.
                contract.OwnerPersonnelType = CommissionPersonnelTypes.Normalize(await db.OrganizationMemberships
                    .Where(x => x.UserId == contract.OwnerUserId && x.OrganizationId == contract.OwnerOrganizationId)
                    .Select(x => x.MembershipType).SingleOrDefaultAsync(cancellationToken));
                contract.UpdatedAt = now;
            }
            var amount = decimal.Round(request.Amount, 0);
            var schedule = request.RevenueScheduleId.HasValue
                ? await db.RevenueSchedules.SingleOrDefaultAsync(x => x.Id == request.RevenueScheduleId && x.ContractId == contract.Id, cancellationToken)
                : await db.RevenueSchedules.Where(x => x.ContractId == contract.Id && x.Status != "PAID")
                    .OrderBy(x => x.DueOn).FirstOrDefaultAsync(cancellationToken);
            if (schedule is null) throw ApiValidationException.For("revenue_schedule_id", "Không tìm thấy kỳ phải thu phù hợp.");

            ContractRenewal? renewal = null;
            if (schedule.ContractRenewalId.HasValue)
            {
                renewal = await db.ContractRenewals.AsNoTracking().SingleOrDefaultAsync(x =>
                    x.Id == schedule.ContractRenewalId && x.ContractId == contract.Id
                    && x.Status == "CONFIRMED", cancellationToken);
                if (renewal is null)
                    throw new ApiConflictException("Kỳ tái ký chưa được xác nhận hoặc không thuộc hợp đồng.");
            }
            // An original and every confirmed renewal each have independent face value.
            // Only receipts assigned to the selected period consume that period's limit.
            var periodReceipts = db.RevenueReceipts.Where(x => x.ContractId == contract.Id
                && x.Status == "COMPLETED");
            if (schedule.ContractRenewalId.HasValue)
            {
                var renewalId = schedule.ContractRenewalId.Value;
                periodReceipts = periodReceipts.Where(x => db.RevenueSchedules.Any(due =>
                    due.Id == x.RevenueScheduleId && due.ContractRenewalId == renewalId));
            }
            else
            {
                // Include pre-migration receipts without a schedule in the original term.
                periodReceipts = periodReceipts.Where(x => x.RevenueScheduleId == null
                    || db.RevenueSchedules.Any(due => due.Id == x.RevenueScheduleId
                        && due.ContractRenewalId == null));
            }
            var collected = await periodReceipts.SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;
            if (renewal is null)
                collected -= await db.RevenueRefunds.Where(x => x.ContractId == contract.Id)
                    .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;
            var periodValue = renewal?.TotalValue ?? contract.TotalValue;
            if (collected + amount > periodValue)
                throw ApiValidationException.For("amount",
                    "Khoản thu vượt giá trị còn phải thu của kỳ hợp đồng đã chọn.");
            if (schedule.AmountReceived + amount > schedule.AmountDue) throw ApiValidationException.For("amount", "Khoản thu vượt số tiền còn lại của kỳ phải thu.");

            var receivedAt = request.ReceivedAt?.ToUniversalTime() ?? now;
            if (receivedAt > now.AddMinutes(1) || ChannelSalesValidation.BusinessDate(receivedAt) < (renewal?.SignedOn ?? contract.SignedOn))
                throw ApiValidationException.For("received_at", "Thời điểm thu phải từ ngày ký đến hiện tại.");
            FinancialEvidence? receiptProof = null;
            if (request.EvidenceId.HasValue)
            {
                receiptProof = await db.FinancialEvidences
                    .FromSqlInterpolated($"SELECT * FROM financial_evidences WHERE id = {request.EvidenceId.Value} FOR UPDATE")
                    .SingleOrDefaultAsync(cancellationToken);
                if (receiptProof is null || receiptProof.Kind != "RECEIPT" || receiptProof.ContractId != contract.Id
                    || receiptProof.UploadedByUserId != actorId || receiptProof.AttachedAt.HasValue) throw new KeyNotFoundException();
            }
            var receipt = new RevenueReceipt
            {
                ContractId = contract.Id,
                RevenueScheduleId = schedule.Id,
                Amount = amount,
                ReceivedAt = receivedAt,
                ReferenceCode = referenceCode,
                PaymentMethod = paymentMethod,
                Status = "COMPLETED",
                IdempotencyKey = idempotencyKey,
                RequestFingerprint = hash,
                RecordedByUserId = actorId,
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.RevenueReceipts.Add(receipt);
            schedule.AmountReceived += amount;
            schedule.Status = schedule.AmountReceived == schedule.AmountDue ? "PAID" : "PARTIAL";
            schedule.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            if (receiptProof is not null)
            {
                receiptProof.RevenueReceiptId = receipt.Id;
                receiptProof.AttachedAt = now;
                receiptProof.UpdatedAt = now;
            }

            var policies = await db.BoardCommissionPolicyVersions.AsNoTracking()
                .Where(p => p.CreatedAt <= receivedAt).ToArrayAsync(cancellationToken);
            var managerId = await db.OrganizationMemberships.AsNoTracking()
                .Where(m => m.OrganizationId == contract.OwnerOrganizationId
                    && m.UserId == contract.OwnerUserId
                    && (m.Status == "ACTIVE" || m.Status == "SUSPENDED"))
                .OrderByDescending(m => m.IsPrimary).ThenByDescending(m => m.CreatedAt)
                .Select(m => m.ManagerUserId).FirstOrDefaultAsync(cancellationToken);
            var policy = BoardCommissionPolicy.ResolveAt(policies,
                contract.OwnerOrganizationId, managerId, contract.OwnerUserId, receivedAt);
            // One immutable entitlement per beneficiary role; both use this actual
            // completed cash amount, never the contract face value.
            if (policy.Sales > 0m)
                db.CommissionLedgerEntries.Add(CommissionAccrual.Create(
                    contract, receipt, actorId, receivedAt, now, amount,
                    "SALES", contract.OwnerUserId, policy.Sales, policy.Source, policy.VersionId));
            if (policy.Manager > 0m && managerId.HasValue && managerId != contract.OwnerUserId
                && await db.OrganizationMemberships.AnyAsync(m =>
                    m.OrganizationId == contract.OwnerOrganizationId && m.UserId == managerId
                    && m.Status == "ACTIVE" && db.Users.Any(u => u.Id == m.UserId && u.Status == "ACTIVE")
                    && db.UserRoles.Any(ur => ur.UserId == m.UserId && db.Roles.Any(r =>
                        r.Id == ur.RoleId && r.Code == "SALES_MANAGER")), cancellationToken))
                db.CommissionLedgerEntries.Add(CommissionAccrual.Create(
                    contract, receipt, actorId, receivedAt, now, amount,
                    "MANAGER", managerId.Value, policy.Manager, policy.Source, policy.VersionId));
            else if (policy.Manager > 0m)
                Audit.Add(db, actorId, "COMMISSION_MANAGER_REVIEW_REQUIRED", nameof(RevenueReceipt),
                    receipt.Id, null, new {
                        contract.OwnerOrganizationId, contract.OwnerUserId,
                        manager_user_id = managerId, policy.Manager, policy.VersionId
                    }, http);
            Audit.Add(db, actorId, "RECORD_CHANNEL_REVENUE", nameof(RevenueReceipt), receipt.Id, null,
                new { receipt.ContractId, receipt.Amount, receipt.ReferenceCode, receipt.ReceivedAt }, http);
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return receipt.Id;
        }
        catch (DbUpdateException exception) when (!IsTransientLock(exception))
        {
            await transaction.RollbackAsync(cancellationToken);
            db.ChangeTracker.Clear();
            var replay = await db.RevenueReceipts.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, cancellationToken);
            if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.RecordedByUserId, actorId, replay.RequestFingerprint, hash);
            // Concurrent requests for different contracts can race through the earlier check.
            if (await db.RevenueReceipts.AsNoTracking().AnyAsync(x => x.ReferenceCode == referenceCode, cancellationToken))
                throw ApiValidationException.For("reference_code", "Mã giao dịch ngân hàng đã được ghi nhận cho khoản thu khác. Vui lòng kiểm tra mã trên chứng từ.");
            throw new ApiConflictException("Không thể ghi nhận khoản thu do xung đột dữ liệu. Vui lòng tải lại hợp đồng và thử lại.");
        }
    }
}

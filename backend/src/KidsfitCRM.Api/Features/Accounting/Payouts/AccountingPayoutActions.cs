using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    public async Task<long> CreatePayout(CreatePayoutRequest request, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesPayoutCreate, ct);
        if (!access.CanManageOrganization(request.OrganizationId)) throw new KeyNotFoundException();
        var period = ChannelSalesValidation.Period(request.Period);
        // Accounting can create a payout from a specific contract without collecting
        // the beneficiary's unrelated contracts from the same period.
        if (request.ContractId.HasValue
            && !await access.Contracts(db).AnyAsync(c => c.Id == request.ContractId.Value
                && c.OwnerOrganizationId == request.OrganizationId, ct))
            throw new KeyNotFoundException();
        var beneficiaryRole = (request.BeneficiaryRole ?? "SALES").Trim().ToUpperInvariant();
        if (beneficiaryRole is not ("SALES" or "MANAGER"))
            throw ApiValidationException.For("beneficiary_role", "Loại người hưởng phải là Sales hoặc Quản lý.");
        var key = Validation.Required(request.IdempotencyKey, "idempotency_key", "Thiếu khóa yêu cầu.", 120);
        var hash = ChannelSalesValidation.Fingerprint(request);
        ChannelSalesValidation.WholeDong(request.WithholdingAmount, "withholding_amount", false);
        var reason = CleanOptional(request.WithholdingReason, 1000);
        if (request.WithholdingAmount > 0 && reason is null) throw ApiValidationException.For("withholding_reason", "Khoản khấu trừ cần có lý do.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        try
        {
            // Serialize payout assembly within an organization. Unique payout items are the final duplicate guard.
            await db.Organizations.FromSqlInterpolated($"SELECT * FROM organizations WHERE id = {request.OrganizationId} FOR UPDATE").SingleAsync(ct);
            var replay = await db.Payouts.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
            if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.CreatedByUserId, actorId, replay.RequestFingerprint, hash);
            var entries = await db.CommissionLedgerEntries.Where(x => x.BeneficiaryOrganizationId == request.OrganizationId
                && x.BeneficiaryUserId == request.BeneficiaryUserId && x.BeneficiaryRole == beneficiaryRole && x.Period == period
                && (!request.ContractId.HasValue || x.ContractId == request.ContractId.Value)
                && !db.PayoutItems.Any(item => item.CommissionLedgerEntryId == x.Id))
                .OrderBy(x => x.Id).ToListAsync(ct);
            if (entries.Count == 0) throw new ApiConflictException("Không có hoa hồng đủ điều kiện trong kỳ đã chọn. Kiểm tra bút toán hoa hồng, kỳ phát sinh và phiếu chi trước đó.");
            var gross = entries.Sum(x => x.Amount);
            if (gross <= 0) throw new ApiConflictException("Tổng hoa hồng còn lại trong kỳ phải dương để lập phiếu chi.");
            var baseAmount = entries.Where(x => x.EntryType == "ACCRUAL").Sum(x => x.CalculationBase);
            var suggestedRate = baseAmount > 0
                ? decimal.Round(gross * 100m / baseAmount, 4, MidpointRounding.AwayFromZero) : 0m;
            var requestedRate = request.RequestedRatePercent ?? suggestedRate;
            var requestedAmount = request.RequestedAmount ?? gross;
            ValidatePayoutAmounts(requestedRate, requestedAmount, request.WithholdingAmount);
            if (request.WithholdingAmount > requestedAmount)
                throw ApiValidationException.For("withholding_amount", "Khấu trừ không được vượt số tiền đề nghị.");
            var adjustment = CleanOptional(request.AdjustmentReason, 1000);
            var now = DateTime.UtcNow;
            var payout = new Payout
            {
                OrganizationId = request.OrganizationId,
                BeneficiaryUserId = request.BeneficiaryUserId,
                BeneficiaryRole = beneficiaryRole,
                Code = "PO-" + Guid.NewGuid().ToString("N").ToUpperInvariant(),
                Period = period,
                SuggestedRatePercent = suggestedRate,
                RequestedRatePercent = requestedRate,
                SuggestedAmount = gross,
                RequestedAmount = requestedAmount,
                AdjustmentReason = adjustment,
                GrossAmount = requestedAmount,
                WithholdingAmount = request.WithholdingAmount,
                NetAmount = requestedAmount - request.WithholdingAmount,
                WithholdingReason = reason,
                Status = "DRAFT",
                IdempotencyKey = key,
                RequestFingerprint = hash,
                CreatedByUserId = actorId,
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.Payouts.Add(payout);
            await db.SaveChangesAsync(ct);
            db.PayoutItems.AddRange(entries.Select(x => new PayoutItem { PayoutId = payout.Id, CommissionLedgerEntryId = x.Id, Amount = x.Amount, CreatedAt = now, UpdatedAt = now }));
            AddPayoutEvent(payout, actorId, "CREATED", reason, now);
            Audit.Add(db, actorId, "CREATE_PAYOUT", nameof(Payout), payout.Id, null, new { payout.OrganizationId, payout.BeneficiaryUserId, payout.Period, payout.GrossAmount, payout.WithholdingAmount, payout.NetAmount }, http);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return payout.Id;
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(ct);
            db.ChangeTracker.Clear();
            var replay = await db.Payouts.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
            if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.CreatedByUserId, actorId, replay.RequestFingerprint, hash);
            throw new ApiConflictException("Hoa hồng đã được đưa vào phiếu chi khác. Vui lòng tải lại.");
        }
    }

    private static void ValidatePayoutAmounts(decimal rate, decimal amount, decimal withholding)
    {
        if (rate < 0 || rate > 100 || decimal.Round(rate, 4) != rate)
            throw ApiValidationException.For("requested_rate_percent", "% hoa hồng phải từ 0 đến 100 và tối đa 4 chữ số thập phân.");
        ChannelSalesValidation.WholeDong(amount, "requested_amount");
        ChannelSalesValidation.WholeDong(withholding, "withholding_amount", false);
        if (withholding >= amount)
            throw ApiValidationException.For("withholding_amount", "Khấu trừ phải nhỏ hơn tiền đề nghị chi.");
    }

    public async Task UpdatePayoutDraft(long id, UpdatePayoutDraftRequest request, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesPayoutCreate, ct);
        ValidatePayoutAmounts(request.RequestedRatePercent, request.RequestedAmount, request.WithholdingAmount);
        var reason = CleanOptional(request.AdjustmentReason, 1000);
        var withholdingReason = CleanOptional(request.WithholdingReason, 1000);
        if (request.WithholdingAmount > 0 && withholdingReason is null)
            throw ApiValidationException.For("withholding_reason", "Khấu trừ cần có lý do.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var payout = await LockPayout(id, ct);
        if (!access.CanManageOrganization(payout.OrganizationId) || payout.CreatedByUserId != actorId)
            throw new KeyNotFoundException();
        if (payout.Status is not ("DRAFT" or "CHANGES_REQUESTED"))
            throw new ApiConflictException("Chỉ được sửa phiếu Nháp hoặc phiếu BGĐ yêu cầu bổ sung.");
        var before = new { payout.RequestedRatePercent, payout.RequestedAmount, payout.AdjustmentReason, payout.WithholdingAmount };
        payout.RequestedRatePercent = request.RequestedRatePercent;
        payout.RequestedAmount = request.RequestedAmount;
        payout.AdjustmentReason = reason;
        payout.GrossAmount = request.RequestedAmount;
        payout.WithholdingAmount = request.WithholdingAmount;
        payout.WithholdingReason = withholdingReason;
        payout.NetAmount = request.RequestedAmount - request.WithholdingAmount;
        payout.UpdatedAt = DateTime.UtcNow;
        AddPayoutEvent(payout, actorId, "EDITED", reason, payout.UpdatedAt);
        Audit.Add(db, actorId, "EDIT_PAYOUT_DRAFT", nameof(Payout), id, before,
            new { payout.RequestedRatePercent, payout.RequestedAmount, payout.AdjustmentReason, payout.WithholdingAmount }, http);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    public async Task SubmitPayout(long id, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesPayoutCreate, ct);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var payout = await LockPayout(id, ct);
        if (!access.CanManageOrganization(payout.OrganizationId) || payout.CreatedByUserId != actorId)
            throw new KeyNotFoundException();
        if (payout.Status is not ("DRAFT" or "CHANGES_REQUESTED"))
            throw new ApiConflictException("Phiếu không ở trạng thái được phép gửi BGĐ duyệt.");
        ValidatePayoutAmounts(payout.RequestedRatePercent, payout.RequestedAmount, payout.WithholdingAmount);
        if ((payout.SuggestedAmount != payout.RequestedAmount
                || payout.SuggestedRatePercent != payout.RequestedRatePercent)
            && string.IsNullOrWhiteSpace(payout.AdjustmentReason))
            throw ApiValidationException.For("adjustment_reason", "Bắt buộc nhập lý do khi điều chỉnh khác đề xuất của hệ thống.");
        var oldStatus = payout.Status;
        payout.Status = "PENDING_APPROVAL";
        payout.SubmittedAt = DateTime.UtcNow;
        payout.UpdatedAt = payout.SubmittedAt.Value;
        AddPayoutEvent(payout, actorId, "SUBMITTED", payout.AdjustmentReason, payout.UpdatedAt);
        Audit.Add(db, actorId, "SUBMIT_PAYOUT", nameof(Payout), id, new { status = oldStatus },
            new { payout.Status, payout.SuggestedAmount, payout.RequestedAmount, payout.AdjustmentReason }, http);
        var centralOrgId = await CrmNotificationWriter.CentralOrganization(db, ct);
        if (centralOrgId.HasValue)
        {
            var directors = await CrmNotificationWriter.CentralReviewers(db, Permissions.ChannelSalesPayoutApprove, ct);
            foreach (var director in directors.Where(u => u != actorId))
                CrmNotificationWriter.Add(db, centralOrgId.Value, director,
                    "PAYOUT_SUBMITTED", nameof(Payout), payout.Id, "Phiếu chi cần phê duyệt",
                    "Kế toán đã gửi phiếu chi, cần BGĐ phê duyệt hoặc yêu cầu bổ sung.",
                    "role-board-payouts", payout.SubmittedAt!.Value.Ticks);
        }
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    private async Task RequireIndependentPayoutApprover(long actorId, CancellationToken ct)
    {
        var allowed = await db.UserRoles.AsNoTracking().AnyAsync(ur =>
            ur.UserId == actorId && db.Roles.Any(r => r.Id == ur.RoleId
                && (r.Code == "DIRECTOR" || r.Code == "ADMIN")), ct);
        if (!allowed)
            throw new ApiConflictException("Chỉ BGĐ hoặc Admin được phê duyệt hoặc trả phiếu chi.");
    }

    public async Task ReturnPayout(long id, ReturnPayoutRequest request, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesPayoutApprove, ct);
        await RequireIndependentPayoutApprover(actorId, ct);
        var reason = Validation.Required(request.Reason, "reason", "BGĐ cần nêu lý do yêu cầu bổ sung.", 1000);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var payout = await LockPayout(id, ct);
        if (!access.CanManageOrganization(payout.OrganizationId)) throw new KeyNotFoundException();
        if (payout.CreatedByUserId == actorId)
            throw new ApiConflictException("Người lập không được tự xử lý duyệt phiếu của mình.");
        if (payout.Status != "PENDING_APPROVAL")
            throw new ApiConflictException("Chỉ được trả về phiếu đang chờ BGĐ duyệt.");
        payout.Status = "CHANGES_REQUESTED";
        payout.UpdatedAt = DateTime.UtcNow;
        AddPayoutEvent(payout, actorId, "CHANGES_REQUESTED", reason, payout.UpdatedAt);
        Audit.Add(db, actorId, "RETURN_PAYOUT", nameof(Payout), id,
            new { status = "PENDING_APPROVAL" }, new { payout.Status, reason }, http);
        await db.CrmNotifications.Where(x => x.EntityType == nameof(Payout)
            && x.EntityId == payout.Id && x.Kind == "PAYOUT_SUBMITTED" && x.Status == "OPEN")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "RESOLVED")
                .SetProperty(x => x.ResolvedAt, payout.UpdatedAt), ct);
        var returnOrgId = await CrmNotificationWriter.RecipientOrganization(db, payout.CreatedByUserId, payout.OrganizationId, ct);
        if (returnOrgId.HasValue)
            CrmNotificationWriter.Add(db, returnOrgId.Value, payout.CreatedByUserId,
                "PAYOUT_CHANGES_REQUESTED", nameof(Payout), payout.Id, "Phiếu chi cần bổ sung",
                "BGĐ đã yêu cầu chỉnh sửa phiếu chi; mở hồ sơ để xem lý do.", "role-accounting-revenue", payout.UpdatedAt.Ticks);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    public async Task ApprovePayout(long id, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesPayoutApprove, ct);
        await RequireIndependentPayoutApprover(actorId, ct);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var payout = await LockPayout(id, ct);
        if (!access.CanManageOrganization(payout.OrganizationId)) throw new KeyNotFoundException();
        if (payout.Status is "APPROVED" or "PAID") return;
        if (payout.Status != "PENDING_APPROVAL") throw new ApiConflictException("Kế toán cần gửi phiếu BGĐ duyệt trước.");
        if (payout.CreatedByUserId == actorId)
            throw new ApiConflictException("Người lập không được tự duyệt phiếu của mình.");
        if ((payout.SuggestedAmount != payout.RequestedAmount
                || payout.SuggestedRatePercent != payout.RequestedRatePercent)
            && string.IsNullOrWhiteSpace(payout.AdjustmentReason))
            throw new ApiConflictException("Phiếu điều chỉnh thiếu lý do, yêu cầu Kế toán bổ sung.");
        payout.Status = "APPROVED";
        payout.ApprovedAt = DateTime.UtcNow;
        payout.ApprovedByUserId = actorId;
        payout.UpdatedAt = DateTime.UtcNow;
        AddPayoutEvent(payout, actorId, "APPROVED", null, payout.UpdatedAt);
        Audit.Add(db, actorId, "APPROVE_PAYOUT", nameof(Payout), id, new { status = "PENDING_APPROVAL" }, new { payout.Status, payout.NetAmount }, http);
        await db.CrmNotifications.Where(x => x.EntityType == nameof(Payout)
            && x.EntityId == payout.Id && x.Kind == "PAYOUT_SUBMITTED" && x.Status == "OPEN")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "RESOLVED")
                .SetProperty(x => x.ResolvedAt, payout.UpdatedAt), ct);
        var accountingOrgId = await CrmNotificationWriter.RecipientOrganization(db, payout.CreatedByUserId, payout.OrganizationId, ct);
        if (accountingOrgId.HasValue)
            CrmNotificationWriter.Add(db, accountingOrgId.Value, payout.CreatedByUserId,
                "PAYOUT_APPROVED", nameof(Payout), payout.Id, "Phiếu chi được phê duyệt",
                "BGĐ đã phê duyệt phiếu chi. Kế toán có thể xử lý thanh toán theo quy trình.",
                "role-accounting-revenue");
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    public async Task CompletePayout(long id, CompletePayoutRequest request, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesPayoutComplete, ct);
        var reference = Validation.Required(request.PaymentReference, "payment_reference", "Cần mã giao dịch / phiếu chi thực tế.", 120);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var payout = await LockPayout(id, ct);
        if (!access.CanManageOrganization(payout.OrganizationId)) throw new KeyNotFoundException();
        if (payout.Status == "PAID")
        {
            if (payout.PaymentReference != reference) throw new ApiConflictException("Phiếu chi đã hoàn tất với mã giao dịch khác.");
            return;
        }
        if (payout.Status != "APPROVED") throw new ApiConflictException("Phải duyệt phiếu chi trước khi ghi nhận đã chi.");
        if (request.Amount.HasValue && request.Amount.Value != payout.NetAmount) throw ApiValidationException.For("amount", "Số tiền chuyển phải khớp phiếu chi đã duyệt.");
        if (request.EvidenceId.HasValue)
        {
            var proof = await db.FinancialEvidences
                .FromSqlInterpolated($"SELECT * FROM financial_evidences WHERE id = {request.EvidenceId.Value} FOR UPDATE")
                .SingleOrDefaultAsync(ct);
            if (proof is null || proof.Kind != "PAYOUT" || proof.PayoutId != id || proof.UploadedByUserId != actorId
                || proof.AttachedAt.HasValue) throw new KeyNotFoundException();
            proof.AttachedAt = DateTime.UtcNow;
            proof.UpdatedAt = proof.AttachedAt.Value;
        }
        payout.Status = "PAID";
        var paidAt = request.PaidAt?.ToUniversalTime() ?? DateTime.UtcNow;
        if (paidAt > DateTime.UtcNow.AddMinutes(1)) throw ApiValidationException.For("paid_at", "Ngày chuyển tiền không được ở tương lai.");
        payout.PaidAt = paidAt;
        payout.PaidByUserId = actorId;
        payout.PaymentReference = reference;
        payout.UpdatedAt = DateTime.UtcNow;
        AddPayoutEvent(payout, actorId, "PAID", CleanOptional(request.Reason, 1000), payout.UpdatedAt);
        Audit.Add(db, actorId, "COMPLETE_PAYOUT", nameof(Payout), id, new { status = "APPROVED" }, new { payout.Status, payout.NetAmount, payout.PaymentReference, payout.PaidAt }, http);
        if (payout.BeneficiaryUserId is long beneficiaryUserId)
        {
            var beneficiaryOrgId = await CrmNotificationWriter.RecipientOrganization(db, beneficiaryUserId, payout.OrganizationId, ct);
            if (beneficiaryOrgId.HasValue)
            {
            var beneficiaryManager = payout.BeneficiaryRole == "MANAGER";
            var beneficiaryCollaborator = !beneficiaryManager && await db.OrganizationMemberships.AsNoTracking().AnyAsync(m =>
                m.UserId == beneficiaryUserId && m.OrganizationId == beneficiaryOrgId.Value
                && m.Status == "ACTIVE" && (m.MembershipType == "COLLABORATOR" || m.MembershipType == "PARTNER_COLLABORATOR"), ct);
                CrmNotificationWriter.Add(db, beneficiaryOrgId.Value, beneficiaryUserId,
                    "PAYOUT_PAID", nameof(Payout), payout.Id, "Hoa hồng đã được thanh toán",
                    "Kế toán đã xác nhận chi trả hoa hồng theo phiếu đã duyệt.",
                    beneficiaryManager ? "manager-income" : beneficiaryCollaborator ? "role-collaborator-income" : "role-sales-staff-income");
            }
        }
        try
        {
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw new ApiConflictException("Mã giao dịch đã được dùng cho phiếu chi khác.");
        }
    }

    private async Task<Payout> LockPayout(long id, CancellationToken ct) => await db.Payouts.FromSqlInterpolated($"SELECT * FROM payouts WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();

    private void AddPayoutEvent(Payout payout, long actorId, string eventType, string? reason, DateTime now) => db.PayoutEvents.Add(new PayoutEvent
    {
        PayoutId = payout.Id,
        ActorUserId = actorId,
        EventType = eventType,
        Reason = reason,
        CreatedAt = now,
        UpdatedAt = now,
    });
}

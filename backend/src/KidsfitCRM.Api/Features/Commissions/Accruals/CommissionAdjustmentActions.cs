using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    public async Task<long> AdjustCommission(long entryId, AdjustCommissionRequest request, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesCommissionAdjust, ct);
        var key = Validation.Required(request.IdempotencyKey, "idempotency_key", "Thiếu khóa yêu cầu.", 120);
        var hash = ChannelSalesValidation.Fingerprint(request, entryId);
        var reason = Validation.Required(request.Reason, "reason", "Điều chỉnh cần có lý do / chứng từ.", 1000);
        ChannelSalesValidation.WholeDong(decimal.Abs(request.Amount), "amount");
        var period = ChannelSalesValidation.Period(request.Period);
        if (string.CompareOrdinal(period, ChannelSalesValidation.BusinessPeriod(DateTime.UtcNow)) < 0) throw ApiValidationException.For("period", "Điều chỉnh chỉ được ghi vào kỳ hiện tại hoặc kỳ sau.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var original = await db.CommissionLedgerEntries.FromSqlInterpolated($"SELECT * FROM commission_ledger_entries WHERE id = {entryId} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!await access.Commissions(db).AnyAsync(x => x.Id == original.Id, ct)) throw new KeyNotFoundException();
        if (original.EntryType != "ACCRUAL") throw new ApiConflictException("Chỉ điều chỉnh từ bút toán phát sinh gốc.");
        if (string.CompareOrdinal(period, original.Period) < 0) throw ApiValidationException.For("period", "Kỳ điều chỉnh không được trước kỳ phát sinh gốc.");
        var replay = await db.CommissionLedgerEntries.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.CreatedByUserId, actorId, replay.RequestFingerprint, hash);
        var adjusted = await db.CommissionLedgerEntries.Where(x => x.RelatedEntryId == original.Id).SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
        if (original.Amount + adjusted + request.Amount < 0) throw ApiValidationException.For("amount", "Tổng điều chỉnh giảm không được vượt hoa hồng của bút toán gốc.");
        var now = DateTime.UtcNow;
        var entry = new CommissionLedgerEntry
        {
            ContractId = original.ContractId,
            BoardPolicyVersionId = original.BoardPolicyVersionId,
            PolicySource = original.PolicySource, LegacyPolicyCode = original.LegacyPolicyCode,
            BeneficiaryRole = original.BeneficiaryRole,
            RelatedEntryId = original.Id,
            BeneficiaryUserId = original.BeneficiaryUserId,
            BeneficiaryOrganizationId = original.BeneficiaryOrganizationId,
            EntryType = request.Amount < 0 ? "REVERSAL" : "ADJUSTMENT",
            CalculationBase = 0,
            RatePercent = 0,
            Amount = request.Amount,
            Status = "ACCRUED",
            Period = period,
            OccurredAt = now,
            Reason = reason,
            IdempotencyKey = key,
            RequestFingerprint = hash,
            CreatedByUserId = actorId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.CommissionLedgerEntries.Add(entry);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) { throw new ApiConflictException("Khóa điều chỉnh đã được sử dụng."); }
        Audit.Add(db, actorId, "ADJUST_COMMISSION", nameof(CommissionLedgerEntry), entry.Id, null, new { entry.RelatedEntryId, entry.Amount, entry.Period, entry.Reason }, http);
        if (entry.BeneficiaryUserId > 0 && entry.BeneficiaryUserId != actorId)
        {
            var org = await CrmNotificationWriter.RecipientOrganization(db, entry.BeneficiaryUserId,
                entry.BeneficiaryOrganizationId, ct);
            if (org.HasValue)
            {
                var collaborator = await db.OrganizationMemberships.AsNoTracking().AnyAsync(m =>
                    m.UserId == entry.BeneficiaryUserId && m.OrganizationId == org.Value
                    && m.Status == "ACTIVE" && (m.MembershipType == "COLLABORATOR"
                        || m.MembershipType == "PARTNER_COLLABORATOR"), ct);
                CrmNotificationWriter.Add(db, org.Value, entry.BeneficiaryUserId,
                    "COMMISSION_ADJUSTED", nameof(CommissionLedgerEntry), entry.Id,
                    entry.Amount < 0 ? "Hoa hồng được điều chỉnh giảm" : "Hoa hồng được điều chỉnh",
                    "Kế toán đã ghi nhận điều chỉnh hoa hồng có lý do và chứng từ. Vui lòng xem thu nhập.",
                    entry.BeneficiaryRole == "MANAGER" ? "manager-income" :
                        collaborator ? "role-collaborator-income" : "role-sales-staff-income");
            }
        }
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return entry.Id;
    }
}

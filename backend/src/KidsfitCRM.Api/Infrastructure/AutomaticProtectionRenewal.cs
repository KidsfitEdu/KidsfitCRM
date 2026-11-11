using System.Data;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>
/// SL-02: a confirmed service renewal is the only business approval.
/// This method can run inside the Accounting transaction or from the hourly sweep.
/// Its customer/contract locks and unique case key prevent concurrent grants.
/// </summary>
public static class AutomaticProtectionRenewal
{
    public static async Task<bool> TryGrantAsync(KidsfitDbContext db, long contractId,
        DateTime now, long? accountingActorId, CancellationToken ct)
    {
        var ownsTransaction = db.Database.CurrentTransaction is null;
        await using var tx = ownsTransaction
            ? await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct)
            : null;
        var customerId = await db.SalesContracts.AsNoTracking()
            .Where(c => c.Id == contractId).Select(c => (long?)c.CustomerId)
            .SingleOrDefaultAsync(ct);
        if (customerId is null) return false;
        await db.ChannelCustomers.FromSqlInterpolated(
            $"SELECT * FROM channel_customers WHERE id = {customerId.Value} FOR UPDATE").SingleAsync(ct);
        var contract = await db.SalesContracts.FromSqlInterpolated(
            $"SELECT * FROM sales_contracts WHERE id = {contractId} FOR UPDATE")
            .SingleOrDefaultAsync(ct);
        if (contract is null || contract.CustomerId != customerId || !contract.RequiresSchoolVerification
            || contract.Status != "ACTIVE" || contract.VerifiedAt is null
            || await db.ContractCancellations.AnyAsync(c => c.ContractId == contractId, ct))
            return false;
        var previous = await db.CustomerProtections.AsNoTracking()
            .Where(p => p.ContractId == contractId && p.OwnerUserId == contract.OwnerUserId
                && p.OwnerOrganizationId == contract.OwnerOrganizationId
                && p.SourceType == "CONTRACT" && p.Status == "ACTIVE"
                && p.EffectiveFrom <= now)
            .OrderByDescending(p => p.EffectiveUntil).FirstOrDefaultAsync(ct);
        // Yearly renewals MUST NOT reset the five-year period.
        if (previous is null || now < previous.EffectiveUntil
            || now >= ProtectionRenewalPolicy.PriorityEnds(previous.EffectiveUntil))
            return false;
        if (!await db.Users.AnyAsync(u => u.Id == contract.OwnerUserId && u.Status == "ACTIVE", ct)
            || !await db.OrganizationMemberships.AnyAsync(m =>
                m.UserId == contract.OwnerUserId && m.OrganizationId == contract.OwnerOrganizationId
                && m.Status == "ACTIVE", ct))
            return false;
        if (!await ProtectionRenewalPolicy.HasConfirmedContinuationAsync(db, contract,
            previous.EffectiveUntil, now, ct)) return false;

        // Never restore rights released by GI-01 or override another owner.
        var snapshot = await ServiceInterruptionService.AssessAsync(db, customerId.Value,
            ContractExpiryAlertService.BusinessDate(now), now, ct);
        if (snapshot is null || snapshot.HasOpenDispute ||
            snapshot.Assessment.Status is
                (ServiceInterruptionPolicy.AssessmentStatus.ThresholdReached
                or ServiceInterruptionPolicy.AssessmentStatus.HistoricalThresholdRequiresReview
                or ServiceInterruptionPolicy.AssessmentStatus.MissingServiceTerm)
            || snapshot.Status == "RELEASED" || snapshot.Status == "EXCEPTION_OWNERSHIP")
            return false;
        if (await db.ServiceInterruptionEvents.AnyAsync(e =>
            e.ContractId == contractId && e.Status == "RELEASED", ct))
            return false;
        var from = now;
        var until = from.AddYears(5);
        if (await db.CustomerProtections.AnyAsync(p => p.CustomerId == customerId
            && p.Status == "ACTIVE" && p.EffectiveFrom < until && p.EffectiveUntil > from, ct))
            return false;

        var key = $"sl02:{contractId}:{previous.EffectiveUntil.Ticks}:{contract.OwnerUserId}";
        var item = await db.ProtectionRenewalCases
            .SingleOrDefaultAsync(c => c.DeduplicationKey == key, ct);
        if (item is null)
        {
            item = new ProtectionRenewalCase
            {
                ContractId = contractId, CustomerId = customerId.Value,
                OwnerUserId = contract.OwnerUserId,
                OwnerOrganizationId = contract.OwnerOrganizationId,
                PreviousProtectionUntil = previous.EffectiveUntil,
                PriorityUntil = ProtectionRenewalPolicy.PriorityEnds(previous.EffectiveUntil),
                DeduplicationKey = key, Source = "AUTO", CreatedAt = now
            };
            db.ProtectionRenewalCases.Add(item);
        }
        if (item.Status == "APPROVED") return false;
        db.CustomerProtections.Add(new CustomerProtection
        {
            CustomerId = customerId.Value, ContractId = contractId,
            OwnerUserId = contract.OwnerUserId, OwnerOrganizationId = contract.OwnerOrganizationId,
            SourceType = "CONTRACT", Status = "ACTIVE",
            EffectiveFrom = from, EffectiveUntil = until, CreatedAt = now, UpdatedAt = now
        });
        item.Status = "APPROVED";
        item.Source = "AUTO";
        item.NewProtectionFrom = from;
        item.NewProtectionUntil = until;
        item.ReviewedByUserId = accountingActorId;
        item.ReviewedAt = now;
        item.UpdatedAt = now;
        await db.SaveChangesAsync(ct);
        if (tx is not null) await tx.CommitAsync(ct);
        return true;
    }
}

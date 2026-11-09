using System.Data;
using System.Text.Json;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>GI-01 assessments are based on all verified, non-cancelled terms for a customer.</summary>
public static class ServiceInterruptionService
{
    public sealed record Snapshot(
        long CustomerId, long ContractId, long OwnerUserId, long OwnerOrganizationId,
        ServiceInterruptionPolicy.Assessment Assessment,
        bool HasPendingRenewal, bool HasOpenDispute, long? ProtectionId,
        DateTime? ProtectionUntil, string Status);

    public static async Task<Snapshot?> AssessAsync(KidsfitDbContext db, long customerId,
        DateOnly today, DateTime utcNow, CancellationToken ct, int accountingExceptionHours = 0)
    {
        var contracts = await db.SalesContracts.AsNoTracking()
            .Where(c => c.CustomerId == customerId && c.Status == "ACTIVE" && c.VerifiedAt != null
                && c.RequiresSchoolVerification
                && !db.ContractCancellations.Any(x => x.ContractId == c.Id))
            .OrderByDescending(c => c.VerifiedAt).ThenByDescending(c => c.Id).ToArrayAsync(ct);
        if (contracts.Length == 0) return null;
        var contractIds = contracts.Select(c => c.Id).ToArray();
        var renewals = await db.ContractRenewals.AsNoTracking()
            .Where(r => contractIds.Contains(r.ContractId) && r.Status == "CONFIRMED")
            .Select(r => new ServiceInterruptionPolicy.ServicePeriod(r.ServiceStartOn, r.ServiceEndOn))
            .ToArrayAsync(ct);
        var missing = contracts.Any(c => !c.ServiceStartOn.HasValue || !c.ServiceEndOn.HasValue);
        var periods = contracts.Where(c => c.ServiceStartOn.HasValue && c.ServiceEndOn.HasValue)
            .Select(c => new ServiceInterruptionPolicy.ServicePeriod(c.ServiceStartOn!.Value, c.ServiceEndOn!.Value))
            .Concat(renewals).OrderBy(x => x.StartOn).ToArray();
        var assessment = missing || periods.Length == 0
            ? new ServiceInterruptionPolicy.Assessment(
                ServiceInterruptionPolicy.AssessmentStatus.MissingServiceTerm, null, null, null)
            : ServiceInterruptionPolicy.Evaluate(today, periods[0].StartOn, periods[0].EndOn, periods.Skip(1));
        var pending = await db.ContractRenewals.AnyAsync(r => contractIds.Contains(r.ContractId)
            && (r.Status == "PENDING_ACCOUNTING" || r.Status == "NEEDS_INFO" || r.Status == "DRAFT"), ct);
        var dispute = await db.SchoolDisputes.AnyAsync(d => d.CustomerId == customerId
            && d.Status != "RESOLVED" && d.Status != "REJECTED" && d.Status != "CLOSED", ct);
        var activeProtections = await db.CustomerProtections.AsNoTracking()
            .Where(p => p.CustomerId == customerId
                && p.Status == "ACTIVE" && p.EffectiveFrom <= utcNow && p.EffectiveUntil > utcNow)
            .OrderByDescending(p => p.EffectiveUntil).ToArrayAsync(ct);
        var protection = activeProtections.FirstOrDefault();
        var status = assessment.Status.ToString().ToUpperInvariant();
        if (assessment.Status == ServiceInterruptionPolicy.AssessmentStatus.ThresholdReached)
        {
            if (pending)
            {
                if (accountingExceptionHours <= 0)
                    status = "EXCEPTION_CONFIG_REQUIRED";
                else
                {
                    var deadlineUtc = assessment.ThresholdOn!.Value
                        .ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).AddHours(-7)
                        .AddHours(accountingExceptionHours);
                    status = utcNow >= deadlineUtc ? "EXCEPTION_OVERDUE" : "EXCEPTION_ACCOUNTING";
                }
            }
            else if (dispute) status = "EXCEPTION_DISPUTE";
            else if (activeProtections.Length != 1 || protection!.SourceType != "CONTRACT")
                status = "EXCEPTION_OWNERSHIP";
            else if (!contractIds.Contains(protection.ContractId ?? -1)) status = "EXCEPTION_OWNERSHIP";
            else if (contracts.Any(c => c.OwnerUserId != protection.OwnerUserId ||
                c.OwnerOrganizationId != protection.OwnerOrganizationId)) status = "EXCEPTION_OWNERSHIP";
            else status = "THRESHOLD_REACHED";
        }
        if (assessment.Status == ServiceInterruptionPolicy.AssessmentStatus.ThresholdReached
            && activeProtections.Length == 0 && assessment.GapStartOn.HasValue
            && await db.ServiceInterruptionEvents.AnyAsync(e => e.CustomerId == customerId
                && e.GapStartOn == assessment.GapStartOn.Value && e.Status == "RELEASED", ct))
        {
            status = "RELEASED";
        }
        return new(customerId, contracts[0].Id, contracts[0].OwnerUserId,
            contracts[0].OwnerOrganizationId, assessment, pending, dispute,
            protection?.Id, protection?.EffectiveUntil, status);
    }

    /// <summary>
    /// The switch defaults OFF until migration, exception operations and MySQL tests are validated.
    /// No unchecked historical release. Registration locks the same customer row.
    /// </summary>
    public static async Task<int> SweepAsync(KidsfitDbContext db, DateTime now,
        bool enableRelease, CancellationToken ct = default, int accountingExceptionHours = 0)
    {
        var today = ContractExpiryAlertService.BusinessDate(now);
        var candidates = await db.CustomerProtections.AsNoTracking()
            .Where(p => p.SourceType == "CONTRACT" && p.Status == "ACTIVE"
                && p.EffectiveFrom <= now && p.EffectiveUntil > now)
            .Select(p => p.CustomerId).Distinct().ToArrayAsync(ct);
        var released = 0;
        foreach (var customerId in candidates)
        {
            ct.ThrowIfCancellationRequested();
            await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
            // Same lock order as the approach-registration endpoint.
            await db.ChannelCustomers.FromSqlInterpolated(
                $"SELECT * FROM channel_customers WHERE id = {customerId} FOR UPDATE")
                .SingleAsync(ct);
            var snapshot = await AssessAsync(db, customerId, today, now, ct,
                accountingExceptionHours);
            if (snapshot is null || snapshot.Assessment.ThresholdOn is null ||
                snapshot.Assessment.GapStartOn is null)
            {
                await tx.CommitAsync(ct);
                continue;
            }
            var status = snapshot.Status;
            if (status == "THRESHOLD_REACHED" && enableRelease &&
                snapshot.ProtectionId.HasValue)
            {
                // Take an additional row lock before updating the current contract right.
                var protection = await db.CustomerProtections.FromSqlInterpolated(
                    $"SELECT * FROM customer_protections WHERE id = {snapshot.ProtectionId.Value} FOR UPDATE")
                    .SingleAsync(ct);
                if (protection.Status == "ACTIVE" && protection.EffectiveUntil > now
                    && protection.OwnerUserId == snapshot.OwnerUserId
                    && protection.OwnerOrganizationId == snapshot.OwnerOrganizationId)
                {
                    protection.Status = "RELEASED";
                    protection.UpdatedAt = now;
                    status = "RELEASED";
                    released++;
                }
            }
            if (status == "THRESHOLD_REACHED") status = "REVIEW_REQUIRED";
            if (status.StartsWith("EXCEPTION_", StringComparison.Ordinal)
                || status == "RELEASED" || status == "REVIEW_REQUIRED"
                || status == "HISTORICALTHRESHOLDREQUIRESREVIEW")
            {
                var key = $"gi01:{customerId}:{snapshot.Assessment.GapStartOn:yyyyMMdd}:{status}";
                // Unique key also makes concurrent hourly sweeps safe.
                var sourceSnapshot = JsonSerializer.Serialize(new {
                    source_contract_id = snapshot.ContractId,
                    protection_id = snapshot.ProtectionId,
                    owner_user_id = snapshot.OwnerUserId,
                    owner_organization_id = snapshot.OwnerOrganizationId,
                    pending_accounting = snapshot.HasPendingRenewal,
                    open_dispute = snapshot.HasOpenDispute,
                    next_service_start_on = snapshot.Assessment.NextServiceStartOn
                });
                await db.Database.ExecuteSqlInterpolatedAsync($@"
                    INSERT IGNORE INTO service_interruption_events
                    (customer_id, contract_id, protection_id, gap_start_on,
                     threshold_on, status, reason, source_snapshot, deduplication_key, processed_at,
                     created_at, updated_at)
                    VALUES ({customerId}, {snapshot.ContractId}, {snapshot.ProtectionId},
                     {snapshot.Assessment.GapStartOn.Value}, {snapshot.Assessment.ThresholdOn.Value},
                     {status}, {"GI-01 service interruption assessment"}, {sourceSnapshot}, {key}, {now}, {now}, {now})", ct);
            }
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        return released;
    }
}

public sealed class ServiceInterruptionWorker(
    IServiceScopeFactory scopes, IConfiguration configuration, ILogger<ServiceInterruptionWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        await RunAsync(ct);
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(ct)) await RunAsync(ct);
    }

    private async Task RunAsync(CancellationToken ct)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<KidsfitDbContext>();
            var enable = configuration.GetValue<bool>("GI01:EnableAutomaticRelease");
            var accountingExceptionHours = configuration.GetValue<int>("GI01:AccountingExceptionHours");
            var released = await ServiceInterruptionService.SweepAsync(db, DateTime.UtcNow,
                enable, ct, accountingExceptionHours);
            if (released != 0) logger.LogInformation("GI-01 released {Count} customer rights.", released);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { }
        catch (Exception ex) { logger.LogError(ex, "GI-01 sweep failed; retry on next interval."); }
    }
}

using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>Remove expired, unlinked temporary evidence from the database and private storage.</summary>
public sealed class EvidenceCleanupWorker(IServiceScopeFactory scopes, IFileStorageService storage,
    ILogger<EvidenceCleanupWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Retention = TimeSpan.FromHours(48);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Do not run during host startup; perform small periodic cleanup batches.
        using var timer = new PeriodicTimer(TimeSpan.FromHours(6));
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try { await RemoveExpiredAsync(stoppingToken); }
                catch (Exception error) when (!stoppingToken.IsCancellationRequested)
                {
                    logger.LogError(error, "Evidence cleanup failed; will retry at the next interval.");
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }

    private async Task RemoveExpiredAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<KidsfitDbContext>();
        var cutoff = DateTime.UtcNow - Retention;
        // Repeat in bounded batches, never touch evidence linked to business records.
        for (var batch = 0; batch < 10; batch++)
        {
            var candidates = await db.FinancialEvidences.AsNoTracking()
                .Where(x => x.CreatedAt < cutoff && x.AttachedAt == null && x.RevenueReceiptId == null
                    && x.ContractRenewalId == null
                    && (x.Kind == "RECEIPT" || x.ContractId == null)
                    && (x.Kind == "PAYOUT" || x.PayoutId == null))
                .OrderBy(x => x.Id)
                .Select(x => new { x.Id, x.StorageKey })
                .Take(100)
                .ToArrayAsync(ct);
            if (candidates.Length == 0) return;
            foreach (var evidence in candidates)
            {
                var removed = await db.FinancialEvidences
                    .Where(x => x.Id == evidence.Id && x.CreatedAt < cutoff
                        && x.AttachedAt == null && x.RevenueReceiptId == null
                        && x.ContractRenewalId == null
                        && (x.Kind == "RECEIPT" || x.ContractId == null)
                        && (x.Kind == "PAYOUT" || x.PayoutId == null))
                    .ExecuteDeleteAsync(ct);
                if (removed != 1) continue;
                try { storage.Delete(evidence.StorageKey); }
                catch (IOException error) { logger.LogError(error, "Unable to delete expired private evidence file."); }
            }
            if (candidates.Length < 100) return;
        }
    }
}

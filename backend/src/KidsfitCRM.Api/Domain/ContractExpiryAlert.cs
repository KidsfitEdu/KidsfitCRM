namespace KidsfitCRM.Api.Domain;

/// <summary>NT-01 durable, per-recipient milestone alert for a verified school contract.</summary>
public sealed class ContractExpiryAlert : EntityBase
{
    public long ContractId { get; set; }
    public long RecipientUserId { get; set; }
    public string Kind { get; set; } = "";
    public string DeduplicationKey { get; set; } = "";
    public string Status { get; set; } = "OPEN";
    public DateOnly DueOn { get; set; }
    public DateOnly MilestoneOn { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}

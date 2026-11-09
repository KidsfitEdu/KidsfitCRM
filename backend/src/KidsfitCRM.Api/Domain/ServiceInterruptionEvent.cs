namespace KidsfitCRM.Api.Domain;

/// <summary>Immutable GI-01 decision or exception event. Never rewrites financial history.</summary>
public sealed class ServiceInterruptionEvent : EntityBase
{
    public long CustomerId { get; set; }
    public long ContractId { get; set; }
    public long? ProtectionId { get; set; }
    public DateOnly GapStartOn { get; set; }
    public DateOnly ThresholdOn { get; set; }
    public string Status { get; set; } = "REVIEW_REQUIRED";
    public string Reason { get; set; } = "";
    public string SourceSnapshot { get; set; } = "{}";
    public string DeduplicationKey { get; set; } = "";
    public DateTime ProcessedAt { get; set; }
}

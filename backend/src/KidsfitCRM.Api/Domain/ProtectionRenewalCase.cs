namespace KidsfitCRM.Api.Domain;

/// <summary>A review request does not itself confer or extend customer protection.</summary>
public sealed class ProtectionRenewalCase : EntityBase
{
    public long ContractId { get; set; }
    public long CustomerId { get; set; }
    public long OwnerUserId { get; set; }
    public long OwnerOrganizationId { get; set; }
    public DateTime PreviousProtectionUntil { get; set; }
    public DateTime PriorityUntil { get; set; }
    public string Status { get; set; } = "PENDING_MANAGER";
    public string Source { get; set; } = "AUTO";
    public string? Note { get; set; }
    public string? DecisionReason { get; set; }
    public long? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime? NewProtectionFrom { get; set; }
    public DateTime? NewProtectionUntil { get; set; }
    public string DeduplicationKey { get; set; } = "";
}

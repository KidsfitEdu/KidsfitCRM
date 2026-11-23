namespace KidsfitCRM.Api.Domain;

/// <summary>Durable per-recipient CRM workflow notice. Read state never mutates the business record.</summary>
public sealed class CrmNotification : EntityBase
{
    public long OrganizationId { get; set; }
    public long RecipientUserId { get; set; }
    public string Kind { get; set; } = "";
    public string EntityType { get; set; } = "";
    public long EntityId { get; set; }
    public string Title { get; set; } = "";
    public string Message { get; set; } = "";
    public string TargetView { get; set; } = "";
    public string DeduplicationKey { get; set; } = "";
    public string Status { get; set; } = "OPEN";
    public DateTime? DueAt { get; set; }
    public DateOnly? DueOn { get; set; }
    public DateOnly? MilestoneOn { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}

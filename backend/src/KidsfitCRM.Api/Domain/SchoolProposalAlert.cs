namespace KidsfitCRM.Api.Domain;

/// <summary>A persisted, recipient-scoped Admin/Director alert for an overdue school proposal.</summary>
public sealed class SchoolProposalAlert : EntityBase
{
    public long SchoolProposalId { get; set; }
    public long RecipientUserId { get; set; }
    public string Kind { get; set; } = ""; // ADMIN_OVERDUE / DIRECTOR_ESCALATION
    public string Status { get; set; } = "OPEN"; // OPEN / RESOLVED
    public string DeduplicationKey { get; set; } = "";
    public DateTime DueAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}

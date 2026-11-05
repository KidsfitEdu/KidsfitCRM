namespace KidsfitCRM.Api.Domain;

/// <summary>An independently verified, annual software-service period; not a 5-year ownership grant.</summary>
public sealed class ContractServiceTerm : EntityBase
{
    public long ContractId { get; set; }
    public long CustomerId { get; set; }
    public int TermNumber { get; set; }
    public DateOnly StartOn { get; set; }
    public DateOnly EndOn { get; set; }
    public string BillingCycle { get; set; } = "YEARLY";
    public string Status { get; set; } = "PENDING_CHECKEE";
    public string EvidenceReference { get; set; } = "";
    public long SubmittedByUserId { get; set; }
    public long? VerifiedByUserId { get; set; }
    public DateTime? VerifiedAt { get; set; }
}
/// <summary>Durable recipient-scoped in-app notification; unique key suppresses retries.</summary>
public sealed class ContractLifecycleAlert : EntityBase
{
    public long? ServiceTermId { get; set; }
    public long CustomerId { get; set; }
    public long RecipientUserId { get; set; }
    public string Kind { get; set; } = "";
    public DateOnly DeadlineOn { get; set; }
    public string DeduplicationKey { get; set; } = "";
    public DateTime? ReadAt { get; set; }
}
/// <summary>Append-only service and protection decision history; preserved across owners.</summary>
public sealed class ContractServiceEvent : EntityBase
{
    public long? ServiceTermId { get; set; }
    public long CustomerId { get; set; }
    public long? ActorUserId { get; set; }
    public string Kind { get; set; } = "";
    public string Reason { get; set; } = "";
}

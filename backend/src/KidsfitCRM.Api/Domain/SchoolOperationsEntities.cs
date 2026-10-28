namespace KidsfitCRM.Api.Domain;

public sealed class SchoolWorkflowPolicyVersion : EntityBase
{
    public long OrganizationId { get; set; }
    public int Version { get; set; }
    public string Status { get; set; } = "DRAFT";
    public int ManagerReviewHours { get; set; }
    public int AdminReviewHours { get; set; }
    public int InvitationHours { get; set; }
    public int MaxExtensionDays { get; set; }
    public int MaxExtensionCount { get; set; }
    public int MaxTotalExtensionDays { get; set; }
    public string DecisionReference { get; set; } = "";
    public long CreatedByUserId { get; set; }
    public string RequestFingerprint { get; set; } = "";
}

public sealed class SchoolProposal : EntityBase
{
    public long OrganizationId { get; set; }
    public long SubmittedByUserId { get; set; }
    public long ManagerUserId { get; set; }
    public string SchoolCode { get; set; } = "";
    public string Name { get; set; } = "";
    public string Province { get; set; } = "";
    public string Ward { get; set; } = "";
    public string? Address { get; set; }
    public string? ContactName { get; set; }
    public string? ContactPosition { get; set; }
    public string? ContactPhone { get; set; }
    public string? Email { get; set; }
    public string Reason { get; set; } = "";
    public int Version { get; set; } = 1;
    public string Status { get; set; } = "PENDING_MANAGER";
    public DateTime ReviewDueAt { get; set; }
    public DateTime? ManagerReviewedAt { get; set; }
    public long? ReviewedByUserId { get; set; }
    public string? DecisionReason { get; set; }
    public long? DirectorySchoolId { get; set; }
    public string IdempotencyKey { get; set; } = "";
    public string RequestFingerprint { get; set; } = "";
}

public sealed class SchoolProposalRevision : EntityBase
{
    public long SchoolProposalId { get; set; }
    public long ActorUserId { get; set; }
    public int Version { get; set; }
    public string Reason { get; set; } = "";
    // Private snapshots: never expose through general audit or unrelated organizations.
    public string BeforeValues { get; set; } = "{}";
    public string AfterValues { get; set; } = "{}";
}

public sealed class SchoolInvitation : EntityBase
{
    public long DirectorySchoolId { get; set; }
    public long OrganizationId { get; set; }
    public long AssignedByUserId { get; set; }
    public long AssigneeUserId { get; set; }
    public string Status { get; set; } = "PENDING";
    public DateTime RespondBy { get; set; }
    public DateTime? RespondedAt { get; set; }
    public string Reason { get; set; } = "";
    public string? ResponseReason { get; set; }
    public long? ApproachRegistrationId { get; set; }
    public string IdempotencyKey { get; set; } = "";
    public string RequestFingerprint { get; set; } = "";
}

public sealed class SchoolExtensionRequest : EntityBase
{
    public long ApproachRegistrationId { get; set; }
    public long OrganizationId { get; set; }
    public long RequestedByUserId { get; set; }
    public long ManagerUserId { get; set; }
    public DateTime RequestedUntil { get; set; }
    public DateTime OriginalProtectedUntil { get; set; }
    public DateTime ReviewDueAt { get; set; }
    public DateTime NextAppointmentAt { get; set; }
    public string Progress { get; set; } = "";
    public string EvidenceReference { get; set; } = "";
    public string Status { get; set; } = "PENDING";
    public DateTime? ApprovedUntil { get; set; }
    public DateTime? NextReviewAt { get; set; }
    public long? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? DecisionReason { get; set; }
    public long? PolicyVersionId { get; set; }
    public string IdempotencyKey { get; set; } = "";
    public string RequestFingerprint { get; set; } = "";
}

public sealed class SchoolDispute : EntityBase
{
    public long CustomerId { get; set; }
    public long OrganizationId { get; set; }
    public long OpenedByUserId { get; set; }
    public string Reason { get; set; } = "";
    public string EvidenceReference { get; set; } = "";
    public string Status { get; set; } = "OPEN";
    public string? Decision { get; set; }
    public string? DecisionReason { get; set; }
    public long? ResolvedByUserId { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string IdempotencyKey { get; set; } = "";
    public string RequestFingerprint { get; set; } = "";
}

public sealed class SchoolDeferral : EntityBase
{
    public long DirectorySchoolId { get; set; }
    public long OrganizationId { get; set; }
    public long ManagerUserId { get; set; }
    public string Reason { get; set; } = "";
    public DateTime ReviewAt { get; set; }
    public string Status { get; set; } = "OPEN";
    public string IdempotencyKey { get; set; } = "";
    public string RequestFingerprint { get; set; } = "";
}

public sealed class SchoolHandover : EntityBase
{
    public long MembershipId { get; set; }
    public long OrganizationId { get; set; }
    public long UserId { get; set; }
    public long CompletedByUserId { get; set; }
    public string Reason { get; set; } = "";
    public string Summary { get; set; } = "";
    public int RevokedRegistrations { get; set; }
    public bool AccountSuspended { get; set; }
    public string IdempotencyKey { get; set; } = "";
    public string RequestFingerprint { get; set; } = "";
}

public sealed class SchoolUnitRevision : EntityBase
{
    public long SchoolUnitId { get; set; }
    public long ActorUserId { get; set; }
    public int Version { get; set; }
    public string Reason { get; set; } = "";
    // Private business snapshots; never copy into public fixtures or general audit payloads.
    public string BeforeValues { get; set; } = "{}";
    public string AfterValues { get; set; } = "{}";
}

public sealed class ContractCareHandover : EntityBase
{
    public long ContractId { get; set; }
    public long? PreviousUserId { get; set; }
    public long AssignedUserId { get; set; }
    public long CareOrganizationId { get; set; }
    public long ActorUserId { get; set; }
    public string Reason { get; set; } = "";
    public string IdempotencyKey { get; set; } = "";
    public string RequestFingerprint { get; set; } = "";
}

public sealed class CustomerSupportCase : EntityBase
{
    public long ContractId { get; set; }
    public long CustomerId { get; set; }
    public long OrganizationId { get; set; }
    public long AssignedUserId { get; set; }
    public long CreatedByUserId { get; set; }
    public string Subject { get; set; } = "";
    public string Description { get; set; } = "";
    public string Status { get; set; } = "OPEN";
    public string? Outcome { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public string IdempotencyKey { get; set; } = "";
    public string RequestFingerprint { get; set; } = "";
}

public sealed class ContractCancellation : EntityBase
{
    public long ContractId { get; set; }
    public long ActorUserId { get; set; }
    public string Reason { get; set; } = "";
    public string DecisionReference { get; set; } = "";
    public string PreviousStatus { get; set; } = "";
    public string IdempotencyKey { get; set; } = "";
    public string RequestFingerprint { get; set; } = "";
}

public sealed class RevenueRefund : EntityBase
{
    public long RevenueReceiptId { get; set; }
    public long ContractId { get; set; }
    public long RecordedByUserId { get; set; }
    public decimal Amount { get; set; }
    public DateTime RefundedAt { get; set; }
    public string ReferenceCode { get; set; } = "";
    public string Reason { get; set; } = "";
    public string DecisionReference { get; set; } = "";
    public string IdempotencyKey { get; set; } = "";
    public string RequestFingerprint { get; set; } = "";
}

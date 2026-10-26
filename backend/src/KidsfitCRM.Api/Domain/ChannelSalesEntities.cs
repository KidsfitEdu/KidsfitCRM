namespace KidsfitCRM.Api.Domain;

public sealed class Organization : EntityBase
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string OrganizationType { get; set; } = "PARTNER";
    public string Status { get; set; } = "ACTIVE";
    public decimal CommissionRateCeiling { get; set; }
}

public sealed class OrganizationMembership : EntityBase
{
    public int SchoolApproachLimit { get; set; } = 10;
    public long OrganizationId { get; set; }
    public long UserId { get; set; }
    public long? ManagerUserId { get; set; }
    public string MembershipType { get; set; } = "MEMBER";
    public string Status { get; set; } = "ACTIVE";
    public bool IsPrimary { get; set; }
}

public sealed class ChannelCustomer : EntityBase
{
    public string Code { get; set; } = "";
    public string CustomerType { get; set; } = "ORGANIZATION";
    public string DisplayName { get; set; } = "";
    public string? LegalName { get; set; }
    public string? TaxCode { get; set; }
    public string? Phone { get; set; }
    public string? PhoneNormalized { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }
    public string? CheckeeCustomerCode { get; set; }
    public string? Province { get; set; }
    public string? District { get; set; }
    public string? Address { get; set; }
    public string? ContactName { get; set; }
    public string? ContactPosition { get; set; }
    public string? Source { get; set; }
    public string? Note { get; set; }
    public string LifecycleStatus { get; set; } = "PROSPECT";
    public string VerificationStatus { get; set; } = "PROVISIONAL";
    public long CreatedByUserId { get; set; }
    public long OrganizationId { get; set; }
}

public sealed class CustomerIdentifier : EntityBase
{
    public long CustomerId { get; set; }
    public string IdentifierType { get; set; } = "PHONE";
    public string NormalizedValue { get; set; } = "";
    public string DisplayValue { get; set; } = "";
    public bool IsVerified { get; set; }
}

public sealed class ApproachRegistration : EntityBase
{
    public long CustomerId { get; set; }
    public long OwnerUserId { get; set; }
    public long OwnerOrganizationId { get; set; }
    public long CreatedByUserId { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public DateTime RegisteredAt { get; set; }
    public DateTime ProtectedUntil { get; set; }
    public DateTime? ExpiredAt { get; set; }
    public string? Source { get; set; }
    public string? Note { get; set; }
    public string IdempotencyKey { get; set; } = "";
    public string? RequestFingerprint { get; set; }
}

public sealed class CustomerActivity : EntityBase
{
    public long? SupportCaseId { get; set; }
    public DateTime? OccurredAt { get; set; }
    public string? ContactName { get; set; }
    public string? ContactPosition { get; set; }
    public string? Feedback { get; set; }
    public string? Commitment { get; set; }
    public long CustomerId { get; set; }
    public long? ApproachRegistrationId { get; set; }
    public long UserId { get; set; }
    public string ActivityType { get; set; } = "NOTE";
    public string Content { get; set; } = "";
    public DateTime? NextFollowUpAt { get; set; }
}

public sealed class CheckeeProductPackage : EntityBase
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public decimal ListPrice { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public sealed class SalesContract : EntityBase
{
    public string? OwnerPersonnelType { get; set; }
    public long? CareUserId { get; set; }
    public long? CareOrganizationId { get; set; }
    public bool RequiresSchoolVerification { get; set; }
    public DateTime? ManagerReviewedAt { get; set; }
    public long? ManagerReviewedByUserId { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public long CustomerId { get; set; }
    public long ApproachRegistrationId { get; set; }
    public long OwnerUserId { get; set; }
    public long OwnerOrganizationId { get; set; }
    public long ReportedByUserId { get; set; }
    public string ContractCode { get; set; } = "";
    public DateOnly SignedOn { get; set; }
    public DateOnly? EffectiveOn { get; set; }
    public decimal TotalValue { get; set; }
    public string Currency { get; set; } = "VND";
    public string Status { get; set; } = "ACTIVE";
    public DateTime ProtectionStartsAt { get; set; }
    public DateTime ProtectionUntil { get; set; }
    public string? EvidenceReference { get; set; }
    public string IdempotencyKey { get; set; } = "";
    public string? RequestFingerprint { get; set; }
}

public sealed class SalesContractItem : EntityBase
{
    public long ContractId { get; set; }
    public long ProductPackageId { get; set; }
    public string Description { get; set; } = "";
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
}

public sealed class CustomerProtection : EntityBase
{
    public long CustomerId { get; set; }
    public long OwnerUserId { get; set; }
    public long OwnerOrganizationId { get; set; }
    public long? ApproachRegistrationId { get; set; }
    public long? ContractId { get; set; }
    public string SourceType { get; set; } = "APPROACH";
    public string Status { get; set; } = "ACTIVE";
    public DateTime EffectiveFrom { get; set; }
    public DateTime EffectiveUntil { get; set; }
}

public sealed class RevenueSchedule : EntityBase
{
    public long ContractId { get; set; }
    public decimal AmountDue { get; set; }
    public decimal AmountReceived { get; set; }
    public DateOnly DueOn { get; set; }
    public string Status { get; set; } = "PENDING";
}

public sealed class RevenueReceipt : EntityBase
{
    public long ContractId { get; set; }
    public long? RevenueScheduleId { get; set; }
    public decimal Amount { get; set; }
    public DateTime ReceivedAt { get; set; }
    public string ReferenceCode { get; set; } = "";
    public string PaymentMethod { get; set; } = "BANK_TRANSFER";
    public string Status { get; set; } = "COMPLETED";
    public string IdempotencyKey { get; set; } = "";
    public string? RequestFingerprint { get; set; }
    public long RecordedByUserId { get; set; }
}

public sealed class CommissionPolicyVersion : EntityBase
{
    public string? PersonnelType { get; set; }
    public long? OrganizationId { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public decimal RatePercent { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveUntil { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public long CreatedByUserId { get; set; }
}

public sealed class CommissionLedgerEntry : EntityBase
{
    public long ContractId { get; set; }
    public long? RevenueReceiptId { get; set; }
    public long PolicyVersionId { get; set; }
    public long BeneficiaryUserId { get; set; }
    public long BeneficiaryOrganizationId { get; set; }
    public string EntryType { get; set; } = "ACCRUAL";
    public decimal CalculationBase { get; set; }
    public decimal RatePercent { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = "ACCRUED";
    public string Period { get; set; } = "";
    public DateTime OccurredAt { get; set; }
    public long CreatedByUserId { get; set; }
    public long? RelatedEntryId { get; set; }
    public string? Reason { get; set; }
    public string? IdempotencyKey { get; set; }
    public string? RequestFingerprint { get; set; }
}

public sealed class Payout : EntityBase
{
    public long OrganizationId { get; set; }
    public long? BeneficiaryUserId { get; set; }
    public string Code { get; set; } = "";
    public string Period { get; set; } = "";
    public decimal GrossAmount { get; set; }
    public decimal WithholdingAmount { get; set; }
    public decimal NetAmount { get; set; }
    public string Status { get; set; } = "DRAFT";
    public DateTime? PaidAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public long? ApprovedByUserId { get; set; }
    public long? PaidByUserId { get; set; }
    public string? PaymentReference { get; set; }
    public string? WithholdingReason { get; set; }
    public string? IdempotencyKey { get; set; }
    public string? RequestFingerprint { get; set; }
    public long CreatedByUserId { get; set; }
}

public sealed class PayoutEvent : EntityBase
{
    public long PayoutId { get; set; }
    public long ActorUserId { get; set; }
    public string EventType { get; set; } = "CREATED";
    public string? Reason { get; set; }
}

public sealed class PayoutItem : EntityBase
{
    public long PayoutId { get; set; }
    public long CommissionLedgerEntryId { get; set; }
    public decimal Amount { get; set; }
}

public sealed class ReconciliationCase : EntityBase
{
    public long CustomerId { get; set; }
    public long ContractId { get; set; }
    public long CheckeeOrganizationId { get; set; }
    public string Status { get; set; } = "PENDING";
    public string? DisputeReason { get; set; }
    public DateTime OpenedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
}

public sealed class ReconciliationEvent : EntityBase
{
    public long ReconciliationCaseId { get; set; }
    public long ActorUserId { get; set; }
    public string EventType { get; set; } = "OPENED";
    public string? Reason { get; set; }
}

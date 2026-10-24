namespace KidsfitCRM.Api.Features;

public sealed record RegisterApproachRequest(
    string? IdempotencyKey,
    long? CustomerId,
    string? CustomerType,
    string? DisplayName,
    string? LegalName,
    string? TaxCode,
    string? Phone,
    string? Email,
    string? Website,
    string? Province,
    string? District,
    string? Address,
    string? ContactName,
    string? ContactPosition,
    string? Source,
    string? Note);

public sealed record AddCustomerActivityRequest(string? ActivityType, string? Content, DateTime? NextFollowUpAt);

public sealed record ReportSalesContractRequest(
    string? IdempotencyKey,
    string? ContractCode,
    DateOnly? SignedOn,
    DateOnly? EffectiveOn,
    long ProductPackageId,
    decimal TotalValue,
    DateOnly? FirstPaymentDueOn,
    string? EvidenceReference);

public sealed record RecordRevenueReceiptRequest(
    string? IdempotencyKey,
    long? RevenueScheduleId,
    decimal Amount,
    DateTime? ReceivedAt,
    string? ReferenceCode,
    string? PaymentMethod);

public sealed record ReconcileContractRequest(string? Reason);
public sealed record CreatePayoutRequest(string? IdempotencyKey, long OrganizationId, long BeneficiaryUserId, string? Period, decimal WithholdingAmount, string? WithholdingReason);
public sealed record CompletePayoutRequest(string? PaymentReference, string? Reason);
public sealed record CreateCommissionPolicyRequest(long OrganizationId, string? Code, string? Name, decimal RatePercent, DateOnly EffectiveFrom, DateOnly? EffectiveUntil);
public sealed record CreateSalesAccountRequest(long OrganizationId, string? Name, string? Email, string? Password, string? RoleCode);
public sealed record ChangeMembershipStatusRequest(string? Status);
public sealed record AdjustCommissionRequest(string? IdempotencyKey, decimal Amount, string? Period, string? Reason);

public static class ChannelCustomerStatusPolicy
{
    public static string Calculate(bool hasContractProtection, bool hasApproachProtection) =>
        hasContractProtection ? "CONTRACTED" : hasApproachProtection ? "APPROACHING" : "AVAILABLE";
}

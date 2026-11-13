using KidsfitCRM.Api.Common;

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

public sealed record AddCustomerActivityRequest(string? ActivityType, string? Content, DateTime? NextFollowUpAt,
    DateTime? OccurredAt = null, string? ContactName = null, string? ContactPosition = null, string? Feedback = null, string? Commitment = null, string? Outcome = null, string? EvidenceReference = null);

public sealed record ReportSalesContractRequest(
    string? IdempotencyKey,
    string? ContractCode,
    DateOnly? SignedOn,
    DateOnly? EffectiveOn,
    decimal TotalValue,
    DateOnly? FirstPaymentDueOn,
    string? EvidenceReference,
    long? EvidenceId = null,
    ContractPaymentInstallment[]? Installments = null,
    string? ServicePlan = null,
    int? StudentCount = null,
    long[]? SchoolUnitIds = null,
    decimal? MaintenanceFee = null,
    decimal? SetupFee = null,
    string? ContractNote = null,
    int? BranchCount = null,
    DateOnly? ServiceStartOn = null,
    DateOnly? ServiceEndOn = null,
    string? PaymentCycle = null);

public sealed record ContractPaymentInstallment(DateOnly DueOn, decimal Amount);

public sealed record RecordRevenueReceiptRequest(
    string? IdempotencyKey,
    long? RevenueScheduleId,
    decimal Amount,
    DateTime? ReceivedAt,
    string? ReferenceCode,
    string? PaymentMethod,
    long? EvidenceId = null);

public sealed record ReconcileContractRequest(string? Reason);
/// <summary>Explicit, individually approved financial reconciliation for a legacy receipt.</summary>
public sealed record ConfirmReceiptCommissionBackfillRequest(bool Confirm, string? Reason, bool ManagerVerified = false);
public sealed record CreatePayoutRequest(string? IdempotencyKey, long OrganizationId, long BeneficiaryUserId, string? Period, decimal WithholdingAmount, string? WithholdingReason, long? ContractId = null, string? BeneficiaryRole = "SALES",
    decimal? RequestedRatePercent = null, decimal? RequestedAmount = null, string? AdjustmentReason = null);
public sealed record UpdatePayoutDraftRequest(decimal RequestedRatePercent, decimal RequestedAmount,
    string? AdjustmentReason, decimal WithholdingAmount = 0, string? WithholdingReason = null);
public sealed record ReturnPayoutRequest(string? Reason);
public sealed record CompletePayoutRequest(string? PaymentReference, string? Reason, long? EvidenceId = null, DateTime? PaidAt = null, decimal? Amount = null);
public sealed record CreateSalesAccountRequest(long OrganizationId, string? Name, string? Email, string? Password, string? RoleCode, long? ManagerUserId = null);
public sealed record ChangeMembershipStatusRequest(string? Status, string? Reason = null, string? Summary = null, string? IdempotencyKey = null);
public sealed record AdjustCommissionRequest(string? IdempotencyKey, decimal Amount, string? Period, string? Reason);

public static class ChannelCustomerStatusPolicy
{
    public static string Calculate(bool hasContractProtection, bool hasApproachProtection) =>
        hasContractProtection ? "CONTRACTED" : hasApproachProtection ? "APPROACHING" : "AVAILABLE";
}

public static class CommissionPersonnelTypes
{
    public static readonly string[] Specific = ["SALES", "COLLABORATOR", "SALES_MANAGER", "PARTNER_ADMIN"];
    public static string? Normalize(string? value) => value?.Trim().ToUpperInvariant() switch
    {
        null or "" => null,
        "CHANNEL_SALES" => "SALES",
        "PARTNER_COLLABORATOR" => "COLLABORATOR",
        var code => code,
    };
}

public static class ContractServicePlanPolicy
{
    public static string PaymentCycleFor(string servicePlan) => servicePlan switch
    {
        "SCHOOL_YEAR" => "YEARLY",
        "MONTHLY_9" => "MONTHLY",
        _ => throw ApiValidationException.For("service_plan", "Gói dịch vụ không hợp lệ."),
    };

    public static void RequireMatchingCycle(string servicePlan, string paymentCycle)
    {
        if (PaymentCycleFor(servicePlan) != paymentCycle)
            throw ApiValidationException.For("payment_cycle",
                "Chu kỳ thanh toán không khớp gói dịch vụ đã chọn.");
    }
}

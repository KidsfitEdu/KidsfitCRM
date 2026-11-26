namespace KidsfitCRM.Api.Features;

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

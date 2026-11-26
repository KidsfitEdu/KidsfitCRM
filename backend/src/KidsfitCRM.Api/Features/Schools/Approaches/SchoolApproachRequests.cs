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

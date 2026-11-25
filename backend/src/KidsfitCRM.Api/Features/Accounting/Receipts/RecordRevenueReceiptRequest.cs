namespace KidsfitCRM.Api.Features;

public sealed record RecordRevenueReceiptRequest(
    string? IdempotencyKey,
    long? RevenueScheduleId,
    decimal Amount,
    DateTime? ReceivedAt,
    string? ReferenceCode,
    string? PaymentMethod,
    long? EvidenceId = null);

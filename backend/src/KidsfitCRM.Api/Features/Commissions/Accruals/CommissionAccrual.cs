using KidsfitCRM.Api.Domain;

namespace KidsfitCRM.Api.Features;

internal static class CommissionAccrual
{
    internal static CommissionLedgerEntry Create(
        SalesContract contract, RevenueReceipt receipt, long actorId,
        DateTime receivedAt, DateTime now, decimal amount, string role,
        long beneficiaryId, decimal rate, string source, long? versionId) => new()
    {
        ContractId = contract.Id, RevenueReceiptId = receipt.Id,
        BoardPolicyVersionId = versionId, PolicySource = source,
        BeneficiaryRole = role, BeneficiaryUserId = beneficiaryId,
        BeneficiaryOrganizationId = contract.OwnerOrganizationId, EntryType = "ACCRUAL",
        CalculationBase = amount, RatePercent = rate,
        Amount = decimal.Round(amount * rate / 100m, 0, MidpointRounding.AwayFromZero),
        Status = "ACCRUED", Period = ChannelSalesValidation.BusinessPeriod(receivedAt),
        OccurredAt = receivedAt, CreatedByUserId = actorId, CreatedAt = now, UpdatedAt = now
    };
}

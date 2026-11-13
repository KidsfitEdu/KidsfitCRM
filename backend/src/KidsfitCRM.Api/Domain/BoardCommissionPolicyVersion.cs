namespace KidsfitCRM.Api.Domain;

/// <summary>
/// BGĐ-only configuration. This is deliberately separate from financial
/// CommissionPolicyVersion and never triggers ledger or payout writes.
/// </summary>
public sealed class BoardCommissionPolicyVersion : EntityBase
{
    public string Scope { get; set; } = "SYSTEM";
    public long? OrganizationId { get; set; }
    public long? ManagerUserId { get; set; }
    public long? SalesUserId { get; set; }
    public decimal SalesPercent { get; set; }
    public decimal ManagerPercent { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public long CreatedByUserId { get; set; }
}

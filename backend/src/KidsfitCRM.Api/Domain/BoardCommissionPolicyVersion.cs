namespace KidsfitCRM.Api.Domain;

/// <summary>
/// Versioned BGĐ policy, the sole source for new financial commission accruals.
/// Existing ledger entries retain their immutable policy and rate snapshots.
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

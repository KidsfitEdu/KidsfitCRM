namespace KidsfitCRM.Api.Domain;

/// <summary>
/// Versioned configuration, separate from approved financial commission policies and ledger.
/// DIRECTOR policies set a ceiling/default; MANAGER rows split within that ceiling.
/// ACTIVE means configuration-effective, not payout-approved.
/// </summary>
public sealed class CommissionAllocationVersion : EntityBase
{
    public long OrganizationId { get; set; }
    public long? ManagerUserId { get; set; }
    public long? SalesUserId { get; set; }
    public string Scope { get; set; } = "ORGANIZATION";
    public string ConfiguredBy { get; set; } = "DIRECTOR";
    public decimal SalesPercent { get; set; }
    public decimal ManagerPercent { get; set; }
    public decimal CeilingPercent { get; set; }
    public decimal? ManagerCeilingPercent { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public string Status { get; set; } = "ACTIVE";
    public string Reason { get; set; } = "";
    public long CreatedByUserId { get; set; }
}

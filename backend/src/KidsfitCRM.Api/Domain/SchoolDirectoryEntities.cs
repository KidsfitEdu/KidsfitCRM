namespace KidsfitCRM.Api.Domain;

public sealed class DirectorySchool : EntityBase
{
    public string SchoolCode { get; set; } = "";
    public long CustomerId { get; set; }
}

public sealed class SchoolUnit : EntityBase
{
    public long DirectorySchoolId { get; set; }
    public string ContentHash { get; set; } = "";
    public string UnitType { get; set; } = "MAIN";
    public string Name { get; set; } = "";
    public string Province { get; set; } = "";
    public string Ward { get; set; } = "";
    public string? Address { get; set; }
    public string? ContactName { get; set; }
    public string? ContactPosition { get; set; }
    public string? ContactPhone { get; set; }
    public string? Email { get; set; }
    public string? SchoolPhone { get; set; }
    public string? Note { get; set; }
    public int SourceRow { get; set; }
}

public sealed class SchoolImportBatch : EntityBase
{
    public string IdempotencyKey { get; set; } = "";
    public string FileHash { get; set; } = "";
    public long ActorUserId { get; set; }
    public long OrganizationId { get; set; }
    public int SchoolsCreated { get; set; }
    public int UnitsCreated { get; set; }
}

public sealed class SchoolCapacityChange : EntityBase
{
    public long MembershipId { get; set; }
    public long ActorUserId { get; set; }
    public int PreviousLimit { get; set; }
    public int NewLimit { get; set; }
    public string Reason { get; set; } = "";
}

namespace KidsfitCRM.Api.Domain;

public abstract class EntityBase
{
    public long Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class User : EntityBase
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public DateTime? EmailVerifiedAt { get; set; }
    public string Password { get; set; } = "";
    public string Status { get; set; } = "ACTIVE";
    public DateTime? LastLoginAt { get; set; }
}

public sealed class Role : EntityBase { public string Code { get; set; } = ""; public string Name { get; set; } = ""; }
public sealed class Permission : EntityBase { public string Code { get; set; } = ""; public string Name { get; set; } = ""; public string Group { get; set; } = ""; }
public sealed class UserRole { public long UserId { get; set; } public long RoleId { get; set; } }
public sealed class PermissionRole { public long PermissionId { get; set; } public long RoleId { get; set; } }

public sealed class AuditLog
{
    public long Id { get; set; }
    public long? UserId { get; set; }
    public string Action { get; set; } = "";
    public string EntityType { get; set; } = "";
    public long EntityId { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; }
}


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

public sealed class LeadSource : EntityBase
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string Color { get; set; } = "";
    public bool IsActive { get; set; } = true;
}

public sealed class LeadStatus : EntityBase
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string Color { get; set; } = "";
    public int SortOrder { get; set; }
    public bool IsTerminal { get; set; }
}

public sealed class Course : EntityBase
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public int NumberOfSessions { get; set; }
    public decimal TuitionFee { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public sealed class ClassRoom : EntityBase
{
    public long CourseId { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public long? TeacherId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public int Capacity { get; set; }
    public string Status { get; set; } = "PLANNED";
}

public sealed class ClassSchedule : EntityBase
{
    public long ClassId { get; set; }
    public int DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string? Room { get; set; }
    public long? TeacherId { get; set; }
}

public sealed class Parent : EntityBase
{
    public string Code { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string PhoneNormalized { get; set; } = "";
    public string? Email { get; set; }
    public string? Address { get; set; }
}

public sealed class Student : EntityBase
{
    public string Code { get; set; } = "";
    public string FullName { get; set; } = "";
    public DateOnly? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? SchoolName { get; set; }
    public string? SchoolGrade { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public sealed class ParentStudent : EntityBase
{
    public long ParentId { get; set; }
    public long StudentId { get; set; }
    public string Relationship { get; set; } = "GUARDIAN";
    public bool IsPrimaryContact { get; set; }
}

public sealed class Lead : EntityBase
{
    public string Code { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string PhoneNormalized { get; set; } = "";
    public string? Email { get; set; }
    public long SourceId { get; set; }
    public long StatusId { get; set; }
    public long? InterestedCourseId { get; set; }
    public long? AssignedUserId { get; set; }
    public long? ConvertedParentId { get; set; }
    public string? Note { get; set; }
    public DateTime? NextFollowUpAt { get; set; }
}

public sealed class LeadAssignment : EntityBase
{
    public long LeadId { get; set; }
    public long AssignedTo { get; set; }
    public long AssignedBy { get; set; }
    public DateTime AssignedAt { get; set; }
}

public sealed class LeadNote : EntityBase { public long LeadId { get; set; } public long UserId { get; set; } public string Content { get; set; } = ""; }

public sealed class LeadActivity : EntityBase
{
    public long LeadId { get; set; }
    public long? UserId { get; set; }
    public string ActivityType { get; set; } = "NOTE";
    public string Content { get; set; } = "";
    public string? Metadata { get; set; }
}

public sealed class TrialSession : EntityBase
{
    public long LeadId { get; set; }
    public long? StudentId { get; set; }
    public long CourseId { get; set; }
    public long? ClassId { get; set; }
    public DateTime ScheduledAt { get; set; }
    public string AttendanceStatus { get; set; } = "SCHEDULED";
    public string? Result { get; set; }
    public string? Note { get; set; }
    public long StaffId { get; set; }
}

public sealed class Enrollment : EntityBase
{
    public long StudentId { get; set; }
    public long ClassId { get; set; }
    public long RegisteredBy { get; set; }
    public DateOnly RegistrationDate { get; set; }
    public decimal OriginalFee { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal FinalFee { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public sealed class Invoice : EntityBase
{
    public long ParentId { get; set; }
    public long StudentId { get; set; }
    public long EnrollmentId { get; set; }
    public string InvoiceCode { get; set; } = "";
    public decimal TotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal FinalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public string Status { get; set; } = "UNPAID";
    public DateTime IssuedAt { get; set; }
    public DateTime? DueAt { get; set; }
}

public sealed class InvoiceItem : EntityBase
{
    public long InvoiceId { get; set; }
    public string ItemType { get; set; } = "COURSE_FEE";
    public long? ItemId { get; set; }
    public string Description { get; set; } = "";
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
}

public sealed class Payment : EntityBase
{
    public long InvoiceId { get; set; }
    public long ParentId { get; set; }
    public long StudentId { get; set; }
    public string PaymentMethod { get; set; } = "CASH";
    public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    public string ReferenceCode { get; set; } = "";
    public string? IdempotencyKey { get; set; }
    public string Status { get; set; } = "COMPLETED";
    public long CreatedBy { get; set; }
}

public sealed class WorkTask : EntityBase
{
    public string RelatedType { get; set; } = "";
    public long RelatedId { get; set; }
    public long AssignedTo { get; set; }
    public string Title { get; set; } = "";
    public DateTime DueAt { get; set; }
    public string Status { get; set; } = "OPEN";
    public string Priority { get; set; } = "MEDIUM";
}

public sealed class Notification : EntityBase
{
    public long UserId { get; set; }
    public string Type { get; set; } = "";
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public string? Data { get; set; }
    public DateTime? ReadAt { get; set; }
}

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

public sealed class LeadConversion : EntityBase
{
    public long LeadId { get; set; }
    public string IdempotencyKey { get; set; } = "";
    public long ParentId { get; set; }
    public long StudentId { get; set; }
    public long EnrollmentId { get; set; }
    public long InvoiceId { get; set; }
    public long ConvertedBy { get; set; }
    public DateTime ConvertedAt { get; set; }
}

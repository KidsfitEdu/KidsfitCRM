namespace KidsfitCRM.Api.Features;

public sealed record LoginRequest(string? Email, string? Password, string? DeviceName);
public sealed record CreateLeadRequest(string? FullName, string? Phone, string? Email, long SourceId, long? InterestedCourseId, long? AssignedUserId, string? Note, DateTime? NextFollowUpAt);
public sealed record TransitionLeadRequest(string? Status, string? Reason);
public sealed record BookTrialRequest(long CourseId, long? ClassId, long? StudentId, DateTime ScheduledAt, string? Note);
public sealed record CompleteTrialRequest(string? Result, string? Note);
public sealed record ConvertParentRequest(string? FullName, string? Phone, string? Email, string? Address);
public sealed record ConvertStudentRequest(string? FullName, DateOnly? DateOfBirth, string? Gender, string? SchoolName, string? SchoolGrade);
public sealed record ConvertLeadRequest(string? IdempotencyKey, ConvertParentRequest? Parent, ConvertStudentRequest? Student, string? Relationship, long ClassId, decimal DiscountAmount);
public sealed record RecordPaymentRequest(string? IdempotencyKey, decimal Amount, string? PaymentMethod, DateTime? PaymentDate);

public static class LeadTransitionPolicy
{
    private static readonly IReadOnlyDictionary<string, string[]> Allowed = new Dictionary<string, string[]>(StringComparer.Ordinal)
    {
        ["NEW"] = ["CONTACTED", "LOST"],
        ["CONTACTED"] = ["QUALIFIED", "LOST"],
        ["QUALIFIED"] = ["LOST"],
        ["TRIAL_BOOKED"] = ["LOST"],
        ["TRIAL_COMPLETED"] = ["CONSIDERING", "LOST"],
        ["CONSIDERING"] = ["LOST"],
        ["LOST"] = ["NEW"],
        ["WON"] = [],
    };

    public static bool Allows(string from, string to) => Allowed.TryGetValue(from, out var targets) && targets.Contains(to, StringComparer.Ordinal);
}

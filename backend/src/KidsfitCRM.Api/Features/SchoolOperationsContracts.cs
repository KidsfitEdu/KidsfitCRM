namespace KidsfitCRM.Api.Features;

public sealed record CreateSchoolProposalRequest(string? IdempotencyKey, string? SchoolCode, string? Name,
    string? Province, string? Ward, string? Address, string? ContactName, string? ContactPosition,
    string? ContactPhone, string? Email, string? Reason, DateTime? ReviewDueAt);
public sealed record ReviewSchoolProposalRequest(bool Approve, string? Reason, DateTime? ReviewDueAt, bool DuplicateReviewed = false);
public sealed record CreateSchoolInvitationRequest(string? IdempotencyKey, long SchoolId, long OrganizationId,
    long AssigneeUserId, string? Reason, DateTime? RespondBy);
public sealed record RespondSchoolInvitationRequest(bool Accept, string? Reason);
public sealed record RequestSchoolExtensionRequest(string? IdempotencyKey, DateTime? RequestedUntil,
    DateTime? ReviewDueAt, DateTime? NextAppointmentAt, string? Progress, string? EvidenceReference);
public sealed record ReviewSchoolExtensionRequest(bool Approve, DateTime? ApprovedUntil, DateTime? NextReviewAt, string? Reason);
public sealed record CreateSchoolDisputeRequest(string? IdempotencyKey, long CustomerId, string? Reason, string? EvidenceReference);
public sealed record ResolveSchoolDisputeRequest(string? Decision, string? Reason);
public sealed record DeferSchoolRequest(string? IdempotencyKey, long SchoolId, long OrganizationId, string? Reason, DateTime? ReviewAt);
public sealed record CompleteSchoolHandoverRequest(string? IdempotencyKey, string? Reason, string? Summary, bool SuspendAccount);
public sealed record ReactivateSchoolMembershipRequest(string? Reason, bool ReactivateAccount = false);
public sealed record UpdateSchoolUnitRequest(int ExpectedVersion, string? Name, string? Province, string? Ward,
    string? Address, string? ContactName, string? ContactPosition, string? ContactPhone, string? Email,
    string? SchoolPhone, string? Note, string? Reason);
public sealed record CreateSchoolWorkflowPolicyRequest(long OrganizationId, int ManagerReviewHours, int AdminReviewHours,
    int InvitationHours, int MaxExtensionDays, int MaxExtensionCount, int MaxTotalExtensionDays, bool Activate, string? DecisionReference);
public sealed record AssignContractCareRequest(string? IdempotencyKey, long UserId, long CareOrganizationId, string? Reason);
public sealed record CreateCustomerSupportCaseRequest(string? IdempotencyKey, long ContractId, string? Subject, string? Description);
public sealed record UpdateCustomerSupportCaseRequest(string? Status, string? Content, DateTime? NextFollowUpAt);
public sealed record CancelSalesContractRequest(string? IdempotencyKey, string? Reason, string? DecisionReference);
public sealed record RecordRevenueRefundRequest(string? IdempotencyKey, decimal Amount, DateTime? RefundedAt,
    string? ReferenceCode, string? Reason, string? DecisionReference);

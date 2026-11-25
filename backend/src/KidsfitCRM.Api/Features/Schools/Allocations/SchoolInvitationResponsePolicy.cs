using KidsfitCRM.Api.Common;

namespace KidsfitCRM.Api.Features.Schools.Allocations;

/// <summary>
/// Stateless guards for accepting or declining an allocated school invitation.
/// Caller remains responsible for scope checks, row locks, idempotent replay,
/// capacity, customer availability, audit and notifications in the transaction.
/// </summary>
public static class SchoolInvitationResponsePolicy
{
    public static void EnsurePending(string status, DateTime respondBy, DateTime now, bool accept, string? reason)
    {
        if (status != "PENDING" || respondBy <= now)
            throw new ApiConflictException("Lời mời đã kết thúc hoặc hết hạn.");

        if (!accept && reason is null)
            throw ApiValidationException.For("reason", "Cần lý do từ chối như ở xa hoặc quá tải.");
    }
}

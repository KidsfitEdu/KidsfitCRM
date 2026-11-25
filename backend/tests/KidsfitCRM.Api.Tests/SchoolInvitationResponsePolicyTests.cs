using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Features.Schools.Allocations;

namespace KidsfitCRM.Api.Tests;

public sealed class SchoolInvitationResponsePolicyTests
{
    private static readonly DateTime Now = new(2026, 11, 25, 9, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Pending_unexpired_invitation_accepts_valid_response(bool accept)
    {
        SchoolInvitationResponsePolicy.EnsurePending(
            "PENDING", Now.AddMinutes(1), Now, accept, accept ? null : "Không thể nhận trường.");
    }

    [Theory]
    [InlineData("ACCEPTED")]
    [InlineData("DECLINED")]
    [InlineData("CANCELLED")]
    [InlineData("EXPIRED")]
    public void Completed_invitation_cannot_be_responded_to(string status)
    {
        var ex = Assert.Throws<ApiConflictException>(() =>
            SchoolInvitationResponsePolicy.EnsurePending(status, Now.AddMinutes(1), Now, true, null));
        Assert.Equal("Lời mời đã kết thúc hoặc hết hạn.", ex.Message);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Expired_invitation_is_rejected_including_exact_deadline(int seconds)
    {
        Assert.Throws<ApiConflictException>(() =>
            SchoolInvitationResponsePolicy.EnsurePending("PENDING", Now.AddSeconds(seconds), Now, true, null));
    }

    [Fact]
    public void Declining_without_reason_preserves_original_validation()
    {
        var ex = Assert.Throws<ApiValidationException>(() =>
            SchoolInvitationResponsePolicy.EnsurePending("PENDING", Now.AddMinutes(1), Now, false, null));
        Assert.Contains("reason", ex.Errors.Keys);
        Assert.Contains("Cần lý do từ chối như ở xa hoặc quá tải.", ex.Errors["reason"]);
    }

    [Fact]
    public void Acceptance_does_not_require_reason()
    {
        SchoolInvitationResponsePolicy.EnsurePending("PENDING", Now.AddMinutes(1), Now, true, null);
    }

    [Fact]
    public void Ended_invitation_takes_precedence_over_missing_reason()
    {
        Assert.Throws<ApiConflictException>(() =>
            SchoolInvitationResponsePolicy.EnsurePending("CANCELLED", Now.AddMinutes(1), Now, false, null));
    }
}

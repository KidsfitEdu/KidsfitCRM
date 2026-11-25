using KidsfitCRM.Api.Common;

namespace KidsfitCRM.Api.Features.Schools.Extensions;

/// <summary>
/// Stateless date/limit rules for approach-protection extensions.
/// Authorization, active-policy lookup, idempotency and locking stay with the
/// existing transactional workflow in ChannelSalesActions.
/// </summary>
public static class SchoolExtensionLimitPolicy
{
    public static DateTime MaximumUntil(
        DateTime registeredAt, DateTime protectedUntil, int maxExtensionDays, int maxTotalExtensionDays)
    {
        var maxPerRequest = protectedUntil.AddDays(maxExtensionDays);
        var maxCumulative = registeredAt.AddHours(120).AddDays(maxTotalExtensionDays);
        return maxPerRequest < maxCumulative ? maxPerRequest : maxCumulative;
    }

    public static void EnsureRequestWindow(DateTime protectedUntil, DateTime maximumUntil)
    {
        if (maximumUntil <= protectedUntil)
            throw new ApiConflictException("Đã hết thời gian gia hạn theo chính sách.");
    }

    public static void EnsureRequestedUntil(DateTime requestedUntil, DateTime maximumUntil)
    {
        if (requestedUntil > maximumUntil)
            throw ApiValidationException.For("requested_until", "Thời gian xin gia hạn vượt giới hạn chính sách.");
    }

    public static void EnsureApprovedWithinLimits(
        DateTime requestedUntil, DateTime protectedUntil, DateTime registeredAt,
        DateTime approvedUntil, DateTime nextReview, int maxExtensionDays,
        int maxTotalExtensionDays, int approvedCount, int maxExtensionCount)
    {
        var maximumUntil = MaximumUntil(registeredAt, protectedUntil, maxExtensionDays, maxTotalExtensionDays);
        if (approvedUntil > requestedUntil || approvedUntil > maximumUntil || approvedCount >= maxExtensionCount)
            throw ApiValidationException.For("approved_until", "Gia hạn vượt thời gian xin hoặc giới hạn của chính sách đang áp dụng.");
        if (nextReview > approvedUntil)
            throw ApiValidationException.For("next_review_at", "Ngày rà soát phải nằm trong hạn mới.");
    }
}

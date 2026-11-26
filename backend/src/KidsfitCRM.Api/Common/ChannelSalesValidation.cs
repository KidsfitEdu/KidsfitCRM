using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using KidsfitCRM.Api.Common;

namespace KidsfitCRM.Api.Features;

public static class ChannelSalesValidation
{
    public static string Fingerprint<T>(T request, long? resourceId = null) =>
        Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(new { resourceId, request })));

    public static long Replay(long id, long originalActor, long actor, string? storedHash, string hash)
    {
        if (originalActor != actor) throw new KeyNotFoundException();
        if (storedHash is null || storedHash != hash) throw new ApiConflictException("Khóa yêu cầu đã dùng cho nội dung khác. Vui lòng tạo yêu cầu mới.");
        return id;
    }

    public static string Period(string? period)
    {
        var value = period?.Trim();
        if (value is null || !DateOnly.TryParseExact(value + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            throw ApiValidationException.For("period", "Kỳ phải có định dạng YYYY-MM hợp lệ.");
        return value;
    }

    public static void WholeDong(decimal amount, string field, bool positive = true)
    {
        if ((positive && amount <= 0) || (!positive && amount < 0) || decimal.Truncate(amount) != amount || amount > 999_999_999_999_999m)
            throw ApiValidationException.For(field, "Số tiền phải là số nguyên đồng hợp lệ.");
    }

    public static DateOnly BusinessDate(DateTime utc) => DateOnly.FromDateTime(DateTime.SpecifyKind(utc, DateTimeKind.Utc).AddHours(7));
    public static string BusinessPeriod(DateTime utc) => BusinessDate(utc).ToString("yyyy-MM", CultureInfo.InvariantCulture);
}

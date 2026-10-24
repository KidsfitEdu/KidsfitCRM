using System.Security.Claims;
using System.Text.Json;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;

namespace KidsfitCRM.Api.Common;

public sealed class ApiValidationException(IReadOnlyDictionary<string, string[]> errors) : Exception("Dữ liệu chưa hợp lệ.")
{
    public IReadOnlyDictionary<string, string[]> Errors { get; } = errors;
    public static ApiValidationException For(string field, string message) => new(new Dictionary<string, string[]> { [field] = [message] });
}

public sealed class ApiConflictException(string message) : Exception(message);

public static class HttpContextExtensions
{
    public static long UserId(this HttpContext context)
    {
        var value = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.TryParse(value, out var id) ? id : throw new UnauthorizedAccessException();
    }

    public static (string? IpAddress, string? UserAgent) RequestTrace(this HttpContext context) =>
        (context.Connection.RemoteIpAddress?.ToString(), context.Request.Headers.UserAgent.ToString());
}

public static class Audit
{
    public static void Add(KidsfitDbContext db, long? actorId, string action, string entityType, long entityId, object? oldValues, object? newValues, HttpContext http)
    {
        var trace = http.RequestTrace();
        db.AuditLogs.Add(new AuditLog
        {
            UserId = actorId, Action = action, EntityType = entityType, EntityId = entityId,
            OldValues = oldValues is null ? null : JsonSerializer.Serialize(oldValues),
            NewValues = newValues is null ? null : JsonSerializer.Serialize(newValues),
            IpAddress = trace.IpAddress, UserAgent = trace.UserAgent, CreatedAt = DateTime.UtcNow,
        });
    }
}

public static class Validation
{
    public static string Required(string? value, string field, string message, int maxLength = 255)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized)) throw ApiValidationException.For(field, message);
        if (normalized.Length > maxLength) throw ApiValidationException.For(field, $"{message} Tối đa {maxLength} ký tự.");
        return normalized;
    }

    public static string Digits(string value) => string.Concat(value.Where(char.IsDigit));
}

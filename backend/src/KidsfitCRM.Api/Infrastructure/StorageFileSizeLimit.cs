using System.Globalization;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>One validated upload size setting for the endpoint, disk writer and multipart parser.</summary>
public static class StorageFileSizeLimit
{
    public const int DefaultMB = 5;
    public const int MaximumMB = 100;
    public const long MultipartOverheadBytes = 1024 * 1024;

    public static int ReadMB(IConfiguration configuration)
    {
        var raw = configuration["Storage:MaxFileSizeMB"];
        if (string.IsNullOrWhiteSpace(raw)) return DefaultMB;
        if (!int.TryParse(raw, NumberStyles.None, CultureInfo.InvariantCulture, out var value)
            || value < 1 || value > MaximumMB)
            throw new InvalidOperationException(
                $"Storage:MaxFileSizeMB must be between 1 and {MaximumMB}.");
        return value;
    }

    public static long ReadBytes(IConfiguration configuration) =>
        ReadMB(configuration) * 1024L * 1024L;
}

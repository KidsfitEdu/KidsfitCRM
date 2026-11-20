using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>
/// Authenticated private user-avatar endpoint. Never accepts a user ID or storage key from the client.
/// The local storage root must be a persistent, private mounted volume in production.
/// </summary>
public static class UserAvatarFeatures
{
    private const long MaxAvatarBytes = 2L * 1024 * 1024;

    public static async Task<IResult> Download(HttpContext http, KidsfitDbContext db,
        IFileStorageService storage, CancellationToken ct)
    {
        var key = await db.Users.AsNoTracking().Where(x => x.Id == http.UserId())
            .Select(x => x.AvatarStorageKey).SingleOrDefaultAsync(ct);
        http.Response.Headers["Cache-Control"] = "private, no-store";
        http.Response.Headers["X-Content-Type-Options"] = "nosniff";
        if (string.IsNullOrEmpty(key)) return Results.NoContent();
        var mime = Path.GetExtension(key) switch
        {
            ".jpg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => throw new InvalidOperationException("Unsupported stored avatar type."),
        };
        return Results.File(storage.OpenRead(key), contentType: mime);
    }

    public static async Task<IResult> Upload(HttpContext http, KidsfitDbContext db,
        IFileStorageService storage, ILoggerFactory loggerFactory, CancellationToken ct)
    {
        if (!http.Request.HasFormContentType)
            throw ApiValidationException.For("file", "Vui lòng chọn một ảnh đại diện.");
        var sizeFeature = http.Features.Get<IHttpMaxRequestBodySizeFeature>();
        if (sizeFeature is { IsReadOnly: false })
            sizeFeature.MaxRequestBodySize = MaxAvatarBytes + StorageFileSizeLimit.MultipartOverheadBytes;

        var form = await http.Request.ReadFormAsync(ct);
        var file = form.Files.GetFile("file")
            ?? throw ApiValidationException.For("file", "Vui lòng chọn một ảnh đại diện.");
        if (file.Length == 0 || file.Length > MaxAvatarBytes)
            throw ApiValidationException.For("file", "Ảnh phải nhỏ hơn hoặc bằng 2 MB.");
        if (form.Files.Count != 1)
            throw ApiValidationException.For("file", "Chỉ được tải lên một ảnh đại diện.");

        await using var input = file.OpenReadStream();
        // SaveAsync verifies the content signature, uses a random key and refuses SVG/PDF/HTML.
        var stored = await storage.SaveAsync(input, "AVATAR", ct);
        var logger = loggerFactory.CreateLogger("UserAvatar");
        string? previous = null;
        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            var userId = http.UserId();
            var user = await db.Users.FromSqlInterpolated(
                $"SELECT * FROM users WHERE id = {userId} FOR UPDATE").SingleAsync(ct);
            previous = user.AvatarStorageKey;
            user.AvatarStorageKey = stored.StorageKey;
            user.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        catch
        {
            // If commit result is uncertain, preserve the image rather than removing one
            // that may already be referenced by a committed user profile.
            try
            {
                var linked = await db.Users.AsNoTracking()
                    .AnyAsync(x => x.AvatarStorageKey == stored.StorageKey, CancellationToken.None);
                if (!linked) storage.Delete(stored.StorageKey);
            }
            catch { logger.LogWarning("Avatar upload failed; deferred orphan cleanup required."); }
            throw;
        }

        if (!string.IsNullOrEmpty(previous) && previous != stored.StorageKey)
        {
            try { storage.Delete(previous); }
            catch { logger.LogWarning("Replaced avatar's previous file needs deferred cleanup."); }
        }
        return Results.Ok(new { message = "Đã cập nhật ảnh đại diện." });
    }

    public static async Task<IResult> Remove(HttpContext http, KidsfitDbContext db,
        IFileStorageService storage, ILoggerFactory loggerFactory, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var userId = http.UserId();
        var user = await db.Users.FromSqlInterpolated(
            $"SELECT * FROM users WHERE id = {userId} FOR UPDATE").SingleAsync(ct);
        var previous = user.AvatarStorageKey;
        user.AvatarStorageKey = null;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        if (!string.IsNullOrEmpty(previous))
        {
            try { storage.Delete(previous); }
            catch { loggerFactory.CreateLogger("UserAvatar").LogWarning("Removed avatar file needs deferred cleanup."); }
        }
        return Results.NoContent();
    }
}

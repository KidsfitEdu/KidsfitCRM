using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed record ForgotPasswordRequest(string? Email);
public sealed record VerifyPasswordOtpRequest(string? Email, string? Otp);
public sealed record ResetPasswordRequest(string? Email, string? ResetToken, string? NewPassword, string? ConfirmPassword);

public interface IPasswordResetMailSender
{
    Task SendOtpAsync(string destination, string code, CancellationToken ct);
}

// SMTP is server-side only. Gmail requires 2-step verification and an App Password.
public sealed class GmailPasswordResetMailSender(IConfiguration configuration) : IPasswordResetMailSender
{
    public async Task SendOtpAsync(string destination, string code, CancellationToken ct)
    {
        var user = configuration["Smtp:Username"];
        var secret = configuration["Smtp:AppPassword"];
        if (string.IsNullOrWhiteSpace(user) || string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException("SMTP credentials are not configured.");
        var from = configuration["Smtp:From"] ?? user;
        var logo = configuration["Smtp:LogoUrl"];
        var logoHtml = Uri.TryCreate(logo, UriKind.Absolute, out var url) && url.Scheme == Uri.UriSchemeHttps
            ? $"""<img src="{HtmlEncoder.Default.Encode(logo!)}" width="62" height="62" alt="KIDSFIT" style="display:block;margin:0 auto 10px;object-fit:contain">"""
            : "";
        var html = $"""
            <!doctype html><html lang="vi"><head><meta charset="UTF-8"></head>
            <body style="margin:0;background:#f3f7f3;font-family:Arial,Helvetica,sans-serif;color:#243b2b">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f3f7f3;padding:32px 12px">
              <tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:540px;background:white;border:1px solid #e0e9df;border-radius:18px">
                <tr><td align="center" style="background:#1b5e20;color:white;padding:25px;border-radius:18px 18px 0 0">
                  {logoHtml}<strong style="font-size:22px">KIDSFIT CRM</strong><div style="font-size:12px;color:#deefdf;margin-top:6px">Tư duy mở tương lai</div>
                </td></tr>
                <tr><td style="padding:32px 28px"><h1 style="font-size:22px;margin:0 0 18px;text-align:center">Xác thực đặt lại mật khẩu</h1>
                  <p style="font-size:15px;line-height:1.7">Chúng tôi nhận được yêu cầu đặt lại mật khẩu tài khoản KIDSFIT CRM của bạn.</p>
                  <div style="background:#eef7ee;border-radius:12px;padding:24px;text-align:center;margin:22px 0">
                    <div style="font-size:12px;color:#526c56;letter-spacing:1px">MÃ XÁC THỰC OTP</div>
                    <div style="font-size:34px;font-weight:700;letter-spacing:9px;color:#1b5e20;margin:12px 0">{code}</div>
                    <div style="font-size:13px;color:#526c56">Mã có hiệu lực trong 5 phút</div>
                  </div><p style="font-size:14px;line-height:1.7">Không chia sẻ mã này với bất kỳ ai. Nếu bạn không thực hiện yêu cầu, hãy bỏ qua email.</p>
                  <hr style="border:0;border-top:1px solid #e1e9e1;margin:26px 0">
                  <p style="font-size:12px;text-align:center;color:#718275">Email bảo mật được gửi tự động từ KIDSFIT CRM.</p>
                </td></tr></table></td></tr></table>
            </body></html>
            """;
        using var message = new MailMessage
        {
            From = new MailAddress(from, "KIDSFIT CRM"),
            Subject = "KIDSFIT CRM - Ma xac thuc dat lai mat khau",
            Body = html,
            IsBodyHtml = true,
        };
        message.To.Add(destination);
        message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(
            "Ma xac thuc KIDSFIT CRM: " + code + ". Ma het han sau 5 phut. Khong chia se ma nay.",
            Encoding.UTF8, "text/plain"));
        using var client = new SmtpClient(configuration["Smtp:Host"] ?? "smtp.gmail.com",
            int.TryParse(configuration["Smtp:Port"], out var port) ? port : 587)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(user, secret),
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Timeout = 15000,
        };
        await client.SendMailAsync(message, ct);
    }
}

public static class PasswordResetFeatures
{
    private const string GenericMessage = "Nếu email thuộc tài khoản hợp lệ, mã xác thực sẽ được gửi đến hộp thư.";
    private static readonly TimeSpan OtpLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan ResendDelay = TimeSpan.FromSeconds(60);
    private static readonly TimeSpan TicketLifetime = TimeSpan.FromMinutes(5);

    internal static string NormalizeEmail(string? email) => (email ?? "").Trim().ToLowerInvariant();
    internal static bool IsEmailValid(string email) => email.Length <= 190 && email.Length > 3 &&
        email.Contains('@') && email.IndexOf('@') > 0 && email.LastIndexOf('.') > email.IndexOf('@') + 1 &&
        !email.Any(char.IsWhiteSpace);
    internal static string NewOtp() => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
    internal static string NewToken() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    internal static string HashToken(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    internal static string HashOtp(string secret, string challengeId, string otp)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(challengeId + ":" + otp)));
    }
    internal static bool EqualHex(string? expected, string actual) =>
        expected is { Length: 64 } && CryptographicOperations.FixedTimeEquals(
            Convert.FromHexString(expected), Convert.FromHexString(actual));
    private static string Secret(IConfiguration configuration)
    {
        var value = configuration["PasswordReset:HmacKey"];
        if (string.IsNullOrEmpty(value) || Encoding.UTF8.GetByteCount(value) < 32)
            throw new InvalidOperationException("PasswordReset:HmacKey must contain at least 32 UTF-8 bytes.");
        return value;
    }

    // Always give the same public response, including unknown/suspended users and transient SMTP errors.
    public static async Task<IResult> Forgot(
        ForgotPasswordRequest request, KidsfitDbContext db, IConfiguration configuration,
        IPasswordResetMailSender mail, ILoggerFactory loggerFactory, CancellationToken ct)
    {
        var email = NormalizeEmail(request.Email);
        if (!IsEmailValid(email)) return Results.Ok(new { message = GenericMessage });
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Email == email && x.Status == "ACTIVE", ct);
        if (user is null || !await AuthFeatures.HasActiveMembership(db, user.Id))
            return Results.Ok(new { message = GenericMessage });
        var now = DateTime.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // Lock the user row to serialize resend requests from concurrent browser tabs.
        await db.Users.FromSqlInterpolated($"SELECT * FROM users WHERE id = {user.Id} FOR UPDATE").SingleAsync(ct);
        var recent = await db.PasswordResetChallenges.Where(x => x.UserId == user.Id && x.CreatedAt > now.AddMinutes(-15))
            .OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync(ct);
        if (recent is not null && (recent.CreatedAt > now - ResendDelay ||
            await db.PasswordResetChallenges.CountAsync(x => x.UserId == user.Id && x.CreatedAt > now.AddMinutes(-15), ct) >= 5))
            return Results.Ok(new { message = GenericMessage });
        var otp = NewOtp();
        var challenge = new PasswordResetChallenge
        {
            UserId = user.Id, PublicId = Guid.NewGuid().ToString("N"),
            CreatedAt = now, UpdatedAt = now, ExpiresAt = now + OtpLifetime
        };
        challenge.OtpDigest = HashOtp(Secret(configuration), challenge.PublicId, otp);
        var old = await db.PasswordResetChallenges.Where(x => x.UserId == user.Id && x.ConsumedAt == null).ToListAsync(ct);
        foreach (var item in old) item.ConsumedAt = now;
        db.PasswordResetChallenges.Add(challenge);
        await db.SaveChangesAsync(ct);
        try
        {
            await mail.SendOtpAsync(email, otp, ct);
            await transaction.CommitAsync(ct);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            loggerFactory.CreateLogger("PasswordReset").LogWarning("Password-reset email delivery failed for an eligible account.");
            await transaction.RollbackAsync(ct);
        }
        return Results.Ok(new { message = GenericMessage });
    }

    public static async Task<IResult> Verify(
        VerifyPasswordOtpRequest request, KidsfitDbContext db, IConfiguration configuration, CancellationToken ct)
    {
        var email = NormalizeEmail(request.Email);
        if (!IsEmailValid(email) || request.Otp is not { Length: 6 } otp || !otp.All(char.IsAsciiDigit))
            return Results.BadRequest(new { message = "Mã xác thực không hợp lệ hoặc đã hết hạn." });
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Email == email && x.Status == "ACTIVE", ct);
        if (user is null) return Results.BadRequest(new { message = "Mã xác thực không hợp lệ hoặc đã hết hạn." });
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // Lock the user first to synchronize with resend and concurrent verification/reset.
        await db.Users.FromSqlInterpolated($"SELECT * FROM users WHERE id = {user.Id} FOR UPDATE").SingleAsync(ct);
        var now = DateTime.UtcNow;
        var challenge = await db.PasswordResetChallenges.Where(x => x.UserId == user.Id && x.ConsumedAt == null)
            .OrderByDescending(x => x.CreatedAt).FirstOrDefaultAsync(ct);
        if (challenge is null || challenge.ExpiresAt <= now || challenge.Attempts >= 5 || challenge.VerifiedAt != null)
            return Results.BadRequest(new { message = "Mã xác thực không hợp lệ hoặc đã hết hạn." });
        challenge.Attempts++;
        var valid = EqualHex(challenge.OtpDigest, HashOtp(Secret(configuration), challenge.PublicId, otp));
        if (!valid)
        {
            if (challenge.Attempts >= 5) challenge.ConsumedAt = now;
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return Results.BadRequest(new { message = "Mã OTP không đúng hoặc đã hết hạn." });
        }
        var ticket = NewToken();
        challenge.VerifiedAt = now;
        challenge.TicketDigest = HashToken(ticket);
        challenge.TicketExpiresAt = now + TicketLifetime;
        challenge.UpdatedAt = now;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Results.Ok(new { reset_token = ticket, message = "Xác thực thành công." });
    }

    public static async Task<IResult> Reset(
        ResetPasswordRequest request, KidsfitDbContext db, IPasswordHasher<User> hasher, CancellationToken ct)
    {
        var email = NormalizeEmail(request.Email);
        if (!IsEmailValid(email) || request.ResetToken is not { Length: 64 } ticket || !ticket.All(Uri.IsHexDigit))
            return Results.BadRequest(new { message = "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." });
        if (request.NewPassword is not { Length: >= 12 and <= 200 } password ||
            password != request.ConfirmPassword)
            return Results.BadRequest(new { message = "Mật khẩu phải có ít nhất 12 ký tự và hai ô nhập phải khớp." });
        var userId = await db.Users.Where(x => x.Email == email && x.Status == "ACTIVE")
            .Select(x => (long?)x.Id).FirstOrDefaultAsync(ct);
        if (userId is null) return Results.BadRequest(new { message = "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." });
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var user = await db.Users.FromSqlInterpolated($"SELECT * FROM users WHERE id = {userId.Value} FOR UPDATE").SingleAsync(ct);
        var digest = HashToken(ticket);
        var now = DateTime.UtcNow;
        var challenge = await db.PasswordResetChallenges.FirstOrDefaultAsync(x => x.UserId == user.Id &&
            x.TicketDigest == digest && x.VerifiedAt != null && x.ConsumedAt == null && x.TicketExpiresAt > now, ct);
        if (challenge is null) return Results.BadRequest(new { message = "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." });
        user.Password = hasher.HashPassword(user, password);
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.UpdatedAt = now;
        var outstanding = await db.PasswordResetChallenges.Where(x => x.UserId == user.Id && x.ConsumedAt == null).ToListAsync(ct);
        foreach (var item in outstanding) { item.ConsumedAt = now; item.UpdatedAt = now; }
        db.AuditLogs.Add(new AuditLog
        {
            UserId = user.Id, Action = "AUTH_PASSWORD_RESET", EntityType = "User",
            EntityId = user.Id, CreatedAt = now
        });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Results.Ok(new { message = "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." });
    }
}

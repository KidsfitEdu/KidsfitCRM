using System.Net.Mail;
using System.Text;
using System.Text.Encodings.Web;

namespace KidsfitCRM.Api.Features;

/// <summary>Builds a branded multipart/alternative OTP message, independently testable without SMTP.</summary>
public static class PasswordResetEmailTemplate
{
    public static MailMessage Create(string from, string recipient, string otp, string? logoUrl)
    {
        var brandImage = Uri.TryCreate(logoUrl, UriKind.Absolute, out var url) &&
                         url.Scheme == Uri.UriSchemeHttps
            ? $"""<img src="{HtmlEncoder.Default.Encode(logoUrl!)}" width="46" height="46" alt="KIDSFIT" style="display:block;width:46px;height:46px;object-fit:contain;border:0">"""
            : """<span style="display:inline-block;font-size:14px;font-weight:700;color:#1b5e20">KF</span>""";

        var html = $$"""
            <!doctype html>
            <html lang="vi">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f4f7f4;font-family:Arial,Helvetica,sans-serif;color:#25352b">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;background:#f4f7f4">
                <tr><td align="center" style="padding:28px 12px">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;max-width:520px;background:#ffffff;border:1px solid #e2e9e2;border-radius:14px">
                    <tr><td style="padding:24px 26px 18px;border-bottom:1px solid #e8eee8">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                        <td style="vertical-align:middle;padding-right:12px">{{brandImage}}</td>
                        <td style="vertical-align:middle">
                          <div style="font-size:17px;font-weight:700;color:#1b5e20">KIDSFIT CRM</div>
                          <div style="font-size:12px;color:#687a6b;padding-top:4px">Tư duy mở tương lai</div>
                        </td>
                      </tr></table>
                    </td></tr>
                    <tr><td style="padding:28px 26px 24px">
                      <h1 style="margin:0 0 15px;font-size:21px;line-height:1.4;color:#223b29">Mã xác thực đặt lại mật khẩu</h1>
                      <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#4e6152">Xin chào,</p>
                      <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#4e6152">Sử dụng mã sau để xác thực yêu cầu đặt lại mật khẩu KIDSFIT CRM:</p>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#eef7ee;border-radius:10px">
                        <tr><td align="center" style="padding:22px 12px">
                          <div style="font-size:12px;letter-spacing:1px;font-weight:700;color:#526d56">MÃ XÁC THỰC</div>
                          <div style="font-size:32px;line-height:1.5;font-weight:700;letter-spacing:5px;color:#1b5e20">{{otp[..3]}} {{otp[3..]}}</div>
                          <div style="font-size:13px;color:#526d56">Có hiệu lực trong 5 phút</div>
                        </td></tr>
                      </table>
                      <p style="margin:21px 0 0;font-size:13px;line-height:1.7;color:#5a6b5e">Không chia sẻ mã này với bất kỳ ai. Nếu bạn không thực hiện yêu cầu, vui lòng bỏ qua email.</p>
                    </td></tr>
                    <tr><td align="center" style="padding:17px 24px;border-top:1px solid #e8eee8;font-size:12px;color:#7a887d">
                      Email được gửi tự động từ KIDSFIT CRM.
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;

        var text = "KIDSFIT CRM\nMã xác thực đặt lại mật khẩu: " + otp +
                   "\nMã có hiệu lực trong 5 phút. Không chia sẻ mã này với bất kỳ ai. " +
                   "Nếu không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email.";

        var message = new MailMessage
        {
            From = new MailAddress(from, "KIDSFIT CRM"),
            Subject = "KIDSFIT CRM | Mã xác thực đặt lại mật khẩu",
            SubjectEncoding = Encoding.UTF8,
            BodyEncoding = Encoding.UTF8,
            IsBodyHtml = false,
            Body = text,
        };
        message.To.Add(recipient);
        // Add both alternatives: plain text first, HTML second (preferred by HTML-capable clients).
        message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(text, Encoding.UTF8, "text/plain"));
        message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(html, Encoding.UTF8, "text/html"));
        return message;
    }
}

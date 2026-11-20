using System.Net.Mail;
using System.Text;
using KidsfitCRM.Api.Features;

namespace KidsfitCRM.Api.Tests;

public sealed class PasswordResetEmailTemplateTests
{
    [Fact]
    public void CreatesUtf8MultipartAlternativeWithPreferredHtml()
    {
        using var message = PasswordResetEmailTemplate.Create(
            "kidsfit.education@gmail.com", "recipient@example.com", "012345",
            "https://example.org/branding/kidsfit-logo.png");

        Assert.Equal("KIDSFIT CRM", message.From!.DisplayName);
        Assert.Contains("Mã xác thực đặt lại mật khẩu", message.Subject);
        Assert.Equal(Encoding.UTF8.WebName, message.SubjectEncoding.WebName);
        Assert.Equal(2, message.AlternateViews.Count);
        Assert.Equal("text/plain", message.AlternateViews[0].ContentType.MediaType);
        Assert.Equal("text/html", message.AlternateViews[1].ContentType.MediaType);
        Assert.All(message.AlternateViews.Cast<AlternateView>(), view =>
            Assert.Equal("utf-8", view.ContentType.CharSet, ignoreCase: true));

        var plain = Read(message.AlternateViews[0]);
        var html = Read(message.AlternateViews[1]);
        Assert.Contains("012345", plain);
        Assert.Contains("012 345", html);
        Assert.Contains("https://example.org/branding/kidsfit-logo.png", html);
        Assert.Contains("background:#eef7ee", html);
        Assert.Contains("Tư duy mở tương lai", html);
        Assert.DoesNotContain("012345", message.Subject);
    }

    [Fact]
    public void InvalidOrNonHttpsLogoIsOmittedAndTextRemainsUsable()
    {
        foreach (var logo in new string?[] { null, "", "http://example.org/logo.png", "javascript:alert(1)" })
        {
            using var message = PasswordResetEmailTemplate.Create(
                "kidsfit.education@gmail.com", "recipient@example.com", "999888", logo);
            var html = Read(message.AlternateViews[1]);
            Assert.DoesNotContain("<img", html);
            Assert.Contains("KIDSFIT CRM", html);
            Assert.Contains("999888", Read(message.AlternateViews[0]));
        }
    }


    [Fact]
    public void CurrentTemplateDoesNotEmitLegacyPlainOnlyEmail()
    {
        using var message = PasswordResetEmailTemplate.Create(
            "kidsfit.education@gmail.com", "recipient@example.com", "000123", null);
        Assert.Equal("KIDSFIT CRM | Mã xác thực đặt lại mật khẩu", message.Subject);
        Assert.DoesNotContain("Ma xac thuc dat lai mat khau", message.Subject);
        Assert.Collection(message.AlternateViews.Cast<AlternateView>(),
            plain => Assert.Equal("text/plain", plain.ContentType.MediaType),
            html => Assert.Equal("text/html", html.ContentType.MediaType));

        var htmlBody = Read(message.AlternateViews[1]);
        Assert.Contains("<html lang=\"vi\">", htmlBody);
        Assert.Contains("Mã xác thực đặt lại mật khẩu", htmlBody);
        Assert.Contains("000 123", htmlBody);
        Assert.Contains("KIDSFIT CRM", htmlBody);
        Assert.DoesNotContain("Ma xac thuc KIDSFIT CRM:", htmlBody);
    }

    private static string Read(AlternateView view)
    {
        view.ContentStream.Position = 0;
        using var reader = new StreamReader(view.ContentStream, Encoding.UTF8, leaveOpen: true);
        return reader.ReadToEnd();
    }
}

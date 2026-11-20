# KIDSFIT CRM — Gmail SMTP password recovery

## Scope
- Three public API endpoints: POST /api/auth/password/forgot, /verify-otp, /reset.
- 6-digit OTP, HMAC digest at rest, five-minute expiry, five attempts, one-use short-lived reset ticket.
- PasswordHasher<User> reuse and old JWT revocation via per-user security stamp.
- Gmail SMTP HTML with CSS inline, text alternative, and optional HTTPS logo.
- Branded Light Mode recovery UI accessible from login.

## Gmail SMTP setup
1. Enable Google 2-Step Verification on the company Gmail account.
2. Generate an App Password if the account supports it; never use the actual Gmail login password.
3. Set production SERVER secrets:
   - Smtp__Host=smtp.gmail.com
   - Smtp__Port=587
   - Smtp__Username=kidsfit.education@gmail.com
   - Smtp__From=kidsfit.education@gmail.com
   - Smtp__AppPassword=<store securely in server secrets>
   - PasswordReset__HmacKey=<random secret of at least 32 UTF-8 bytes; distinct from JWT key>
4. Configure Smtp__LogoUrl to a public HTTPS PNG logo URL for broad email-client compatibility. The company logo must be tested in Gmail and Outlook.
5. Ensure the server permits outbound TCP 587 to Gmail with STARTTLS.
6. Test with an authorized disposable test mailbox and isolated database.

## Security and operational requirements
- Never commit real SMTP secrets or expose them in frontend NEXT_PUBLIC_ variables, logs, or HTML.
- Generic response to /forgot is intentional; it never reveals whether an email exists.
- Password reset invalidates earlier JWT sessions by changing security_stamp.
- Only active CRM users with active organization membership may request OTP.
- Limit by source IP, by user resend cooldown and by OTP verification attempts.
- Gmail personal account sending limits/anti-abuse restrictions apply. 0 USD/month does not mean guaranteed delivery.
- A missing App Password or blocked SMTP port prevents real OTP delivery. Do not enable live recovery until end-to-end verification.
- A public response is not proof of delivery: monitor SMTP logs, error metrics and mail inbox.
- Run EF migrations only after isolated verification and a production change/backup plan. Do not modify production DB or merge until approval.
- Sending SMTP during the user DB lock simplifies per-user concurrency but is not optimal for a high-volume mail provider.

## Local and CI checks
- dotnet test backend/tests/KidsfitCRM.Api.Tests/KidsfitCRM.Api.Tests.csproj
- cd frontend && npm ci && npm run test:unit && npm run lint && npx tsc --noEmit && npm run build
- Manually verify valid/unknown/suspended accounts, wrong/expired OTP, five failed attempts, resend, replay, concurrent requests, short passwords, old JWT invalidation, Gmail failure, screen-reader labels, mobile layout and HTML email.

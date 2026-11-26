using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    public Task<long> RegisterCustomerApproach(RegisterApproachRequest request, long actorId, HttpContext http, CancellationToken cancellationToken) =>
        RetryContestedWrite(() => RegisterCustomerApproachCore(request, actorId, http, cancellationToken), cancellationToken);

    private async Task<long> RegisterCustomerApproachCore(RegisterApproachRequest request, long actorId, HttpContext http, CancellationToken cancellationToken)
    {
        var idempotencyKey = Validation.Required(request.IdempotencyKey, "idempotency_key", "Thiếu khóa chống gửi trùng.", 120);
        var hash = ChannelSalesValidation.Fingerprint(request);
        var access = await RequirePermission(actorId, Permissions.ChannelSalesRegister, cancellationToken);
        var existing = await db.ApproachRegistrations.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, cancellationToken);
        if (existing is not null) return ChannelSalesValidation.Replay(existing.Id, existing.CreatedByUserId, actorId, existing.RequestFingerprint, hash);

        var organizationId = await PrimaryOrganizationId(actorId, cancellationToken);
        var now = DateTime.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        try
        {
            if (request.CustomerId.HasValue && await db.DirectorySchools.AnyAsync(
                x => x.CustomerId == request.CustomerId.Value && x.IsDeleted, cancellationToken))
                throw new ApiConflictException("Trường đã ngừng sử dụng và không thể đăng ký tiếp cận.");
            if (request.CustomerId.HasValue && await db.DirectorySchools.AnyAsync(
                x => x.CustomerId == request.CustomerId.Value, cancellationToken))
            {
                await db.OrganizationMemberships.FromSqlInterpolated($"SELECT * FROM organization_memberships WHERE user_id = {actorId} AND organization_id = {organizationId} FOR UPDATE").SingleAsync(cancellationToken);
                var schoolReplay = await db.ApproachRegistrations.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, cancellationToken);
                if (schoolReplay is not null) return ChannelSalesValidation.Replay(schoolReplay.Id, schoolReplay.CreatedByUserId, actorId, schoolReplay.RequestFingerprint, hash);
                await CheckSchoolCapacity(actorId, organizationId, cancellationToken);
            }
            var customer = request.CustomerId.HasValue
                ? await LockCustomer(request.CustomerId.Value, cancellationToken)
                : await ResolveOrCreateCustomer(request, actorId, organizationId, now, cancellationToken);

            if (customer is null) throw new KeyNotFoundException();
            if (request.CustomerId.HasValue && !await access.Customers(db).AnyAsync(x => x.Id == customer.Id, cancellationToken)
                && !await db.DirectorySchools.AnyAsync(x => x.CustomerId == customer.Id && !x.IsDeleted, cancellationToken)) throw new KeyNotFoundException();
            var replayAfterLock = await db.ApproachRegistrations.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, cancellationToken);
            if (replayAfterLock is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ChannelSalesValidation.Replay(replayAfterLock.Id, replayAfterLock.CreatedByUserId, actorId, replayAfterLock.RequestFingerprint, hash);
            }
            await ExpireElapsedApproach(customer.Id, now, cancellationToken);
            // SL-02: the old owner retains a 15-day opportunity when service and
            // five-year protection both expire. This is not a new five-year grant.
            if (await ProtectionRenewalPolicy.HasPriorityForOtherSalesAsync(
                db, customer.Id, actorId, now, cancellationToken))
                throw new ApiConflictException("Trường đang trong 15 ngày ưu tiên tái ký của Sales phụ trách cũ.");


            var blockingProtection = await db.CustomerProtections.AsNoTracking()
                .Where(x => x.CustomerId == customer.Id && x.Status == "ACTIVE" && x.EffectiveUntil > now)
                .OrderByDescending(x => x.EffectiveUntil)
                .FirstOrDefaultAsync(cancellationToken);
            if (blockingProtection is not null)
                throw new ApiConflictException(blockingProtection.SourceType == "CONTRACT"
                    ? "Khách hàng đang được bảo vệ bởi hợp đồng còn hiệu lực."
                    : "Khách hàng đã được nhân sự khác đăng ký tiếp cận trong thời hạn bảo vệ.");

            var registration = new ApproachRegistration
            {
                CustomerId = customer.Id,
                OwnerUserId = actorId,
                OwnerOrganizationId = organizationId,
                CreatedByUserId = actorId,
                Status = "ACTIVE",
                RegisteredAt = now,
                ProtectedUntil = now.AddHours(120),
                Source = CleanOptional(request.Source, 80),
                Note = CleanOptional(request.Note, 4000),
                IdempotencyKey = idempotencyKey,
                RequestFingerprint = hash,
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.ApproachRegistrations.Add(registration);
            await db.SaveChangesAsync(cancellationToken);

            db.CustomerProtections.Add(new CustomerProtection
            {
                CustomerId = customer.Id,
                OwnerUserId = actorId,
                OwnerOrganizationId = organizationId,
                ApproachRegistrationId = registration.Id,
                SourceType = "APPROACH",
                Status = "ACTIVE",
                EffectiveFrom = now,
                EffectiveUntil = registration.ProtectedUntil,
                CreatedAt = now,
                UpdatedAt = now,
            });
            db.CustomerActivities.Add(new CustomerActivity
            {
                CustomerId = customer.Id,
                ApproachRegistrationId = registration.Id,
                UserId = actorId,
                ActivityType = "APPROACH_REGISTERED",
                Content = registration.Note ?? "Đăng ký tiếp cận khách hàng.",
                CreatedAt = now,
                UpdatedAt = now,
            });
            Audit.Add(db, actorId, "REGISTER_CUSTOMER_APPROACH", nameof(ApproachRegistration), registration.Id, null,
                new { registration.CustomerId, registration.OwnerOrganizationId, registration.RegisteredAt, registration.ProtectedUntil }, http);
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return registration.Id;
        }
        catch (DbUpdateException exception) when (!IsTransientLock(exception))
        {
            await transaction.RollbackAsync(cancellationToken);
            db.ChangeTracker.Clear();
            var replay = await db.ApproachRegistrations.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, cancellationToken);
            if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.CreatedByUserId, actorId, replay.RequestFingerprint, hash);
            throw new ApiConflictException("Khách hàng vừa được đăng ký bởi một yêu cầu khác. Vui lòng tải lại danh sách.");
        }
    }

    public async Task<long> AddActivity(long registrationId, AddCustomerActivityRequest request, long actorId, HttpContext http, CancellationToken cancellationToken)
    {
        await RequirePermission(actorId, Permissions.ChannelSalesActivity, cancellationToken);
        var content = Validation.Required(request.Content, "content", "Vui lòng nhập nội dung hoạt động.", 4000);
        var activityType = Validation.Required(request.ActivityType ?? "NOTE", "activity_type", "Loại hoạt động không hợp lệ.", 32).ToUpperInvariant();
        if (!new[] { "NOTE", "CALL", "MEETING", "PROPOSAL", "ZALO", "DEMO" }.Contains(activityType)) throw ApiValidationException.For("activity_type", "Loại hoạt động không được hỗ trợ.");
        var outcome = CleanOptional(request.Outcome, 40)?.ToUpperInvariant();
        if (outcome is not null && outcome is not ("INTERESTED" or "NEEDS_INFO" or "DEMO_SCHEDULED"
            or "WAITING" or "DECLINED" or "UNREACHABLE"))
            throw ApiValidationException.For("outcome", "Kết quả tư vấn không hợp lệ.");
        var evidenceReference = CleanOptional(request.EvidenceReference, 500);
        var now = DateTime.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        var registration = await db.ApproachRegistrations
            .FromSqlInterpolated($"SELECT * FROM approach_registrations WHERE id = {registrationId} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken) ?? throw new KeyNotFoundException();
        await EnsureOwnerOrManager(registration.OwnerUserId, registration.OwnerOrganizationId, actorId, cancellationToken);
        if (registration.Status == "ACTIVE" && registration.ProtectedUntil <= now)
        {
            await MarkRegistrationExpired(registration, now, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            throw new ApiConflictException("Quyền tiếp cận đã hết hạn. Hãy đăng ký lại trước khi cập nhật hoạt động.");
        }
        if (registration.Status != "ACTIVE") throw new ApiConflictException("Chỉ có thể cập nhật lượt tiếp cận đang hoạt động.");

        var occurredAt = request.OccurredAt?.ToUniversalTime() ?? now;
        if (occurredAt > now) throw ApiValidationException.For("occurred_at", "Thời gian hoạt động không được ở tương lai.");
        if (request.NextFollowUpAt?.ToUniversalTime() < occurredAt) throw ApiValidationException.For("next_follow_up_at", "Lịch theo dõi không được trước hoạt động.");

        var activity = new CustomerActivity
        {
            CustomerId = registration.CustomerId,
            ApproachRegistrationId = registration.Id,
            UserId = actorId,
            ActivityType = activityType,
            Content = content,
            NextFollowUpAt = request.NextFollowUpAt?.ToUniversalTime(),
            OccurredAt = occurredAt,
            ContactName = CleanOptional(request.ContactName, 500),
            ContactPosition = CleanOptional(request.ContactPosition, 120),
            Feedback = CleanOptional(request.Feedback, 2000),
            Outcome = outcome,
            EvidenceReference = evidenceReference,
            Commitment = CleanOptional(request.Commitment, 2000),
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.CustomerActivities.Add(activity);
        await db.SaveChangesAsync(cancellationToken);
        Audit.Add(db, actorId, "ADD_CUSTOMER_ACTIVITY", nameof(CustomerActivity), activity.Id, null,
            new { activity.CustomerId, activity.ApproachRegistrationId, activity.ActivityType, activity.NextFollowUpAt }, http);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return activity.Id;
    }

    private async Task<ChannelCustomer?> ResolveOrCreateCustomer(RegisterApproachRequest request, long actorId, long organizationId, DateTime now, CancellationToken cancellationToken)
    {
        var customerType = Validation.Required(request.CustomerType ?? "ORGANIZATION", "customer_type", "Loại khách hàng không hợp lệ.", 24).ToUpperInvariant();
        if (customerType is not ("ORGANIZATION" or "INDIVIDUAL")) throw ApiValidationException.For("customer_type", "Loại khách hàng phải là tổ chức hoặc cá nhân.");
        var displayName = Validation.Required(request.DisplayName, "display_name", "Vui lòng nhập tên khách hàng.", 190);
        var taxCode = NormalizeTaxCode(request.TaxCode);
        var phone = CleanOptional(request.Phone, 40);
        var normalizedPhone = phone is null ? null : Validation.Digits(phone);
        if (normalizedPhone?.StartsWith("84", StringComparison.Ordinal) == true && normalizedPhone.Length == 11) normalizedPhone = "0" + normalizedPhone[2..];
        if (normalizedPhone is not null && (normalizedPhone.Length < 9 || normalizedPhone.Length > 15)) throw ApiValidationException.For("phone", "Số điện thoại cần từ 9 đến 15 chữ số.");
        if (customerType == "ORGANIZATION" && string.IsNullOrWhiteSpace(taxCode) && string.IsNullOrWhiteSpace(normalizedPhone))
            throw ApiValidationException.For("tax_code", "Khách hàng tổ chức cần mã số thuế hoặc số điện thoại để chống trùng.");
        if (customerType == "INDIVIDUAL" && string.IsNullOrWhiteSpace(normalizedPhone))
            throw ApiValidationException.For("phone", "Khách hàng cá nhân cần số điện thoại để chống trùng.");

        var identifiers = new List<(string Type, string Normalized, string Display)>();
        if (!string.IsNullOrWhiteSpace(taxCode)) identifiers.Add(("TAX_CODE", taxCode, request.TaxCode!.Trim()));
        if (!string.IsNullOrWhiteSpace(normalizedPhone)) identifiers.Add(("PHONE", normalizedPhone, phone!));
        var existingCustomerIds = await db.CustomerIdentifiers
            .Where(x => (taxCode != null && x.IdentifierType == "TAX_CODE" && x.NormalizedValue == taxCode)
                || (normalizedPhone != null && x.IdentifierType == "PHONE" && x.NormalizedValue == normalizedPhone))
            .Select(x => x.CustomerId).Distinct()
            .ToArrayAsync(cancellationToken);
        if (existingCustomerIds.Length > 1) throw new ApiConflictException("Mã số thuế và số điện thoại thuộc hai hồ sơ khác nhau. Cần quản lý xác minh trước khi đăng ký.");
        if (existingCustomerIds.Length == 1)
        {
            var match = await LockCustomer(existingCustomerIds[0], cancellationToken);
            if (match?.TaxCode is not null && taxCode is not null && match.TaxCode != taxCode)
                throw new ApiConflictException("Số điện thoại đang thuộc hồ sơ có mã số thuế khác. Cần xác minh danh tính khách hàng.");
            return match;
        }

        var customer = new ChannelCustomer
        {
            Code = $"CUS-{now:yyyyMMdd}-{Guid.NewGuid():N}"[..25].ToUpperInvariant(),
            CustomerType = customerType,
            DisplayName = displayName,
            LegalName = CleanOptional(request.LegalName, 190),
            TaxCode = taxCode,
            Phone = phone,
            PhoneNormalized = normalizedPhone,
            Email = NormalizeEmail(request.Email),
            Website = CleanOptional(request.Website, 190),
            Province = CleanOptional(request.Province, 100),
            District = CleanOptional(request.District, 100),
            Address = CleanOptional(request.Address, 500),
            ContactName = CleanOptional(request.ContactName, 190),
            ContactPosition = CleanOptional(request.ContactPosition, 120),
            Source = CleanOptional(request.Source, 80),
            Note = CleanOptional(request.Note, 4000),
            LifecycleStatus = "PROSPECT",
            VerificationStatus = "PROVISIONAL",
            CreatedByUserId = actorId,
            OrganizationId = organizationId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.ChannelCustomers.Add(customer);
        await db.SaveChangesAsync(cancellationToken);
        db.CustomerIdentifiers.AddRange(identifiers.Select(identifier => new CustomerIdentifier
        {
            CustomerId = customer.Id,
            IdentifierType = identifier.Type,
            NormalizedValue = identifier.Normalized,
            DisplayValue = identifier.Display,
            IsVerified = false,
            CreatedAt = now,
            UpdatedAt = now,
        }));
        await db.SaveChangesAsync(cancellationToken);
        return customer;
    }

    private static string? NormalizeTaxCode(string? value)
    {
        var clean = CleanOptional(value, 32);
        return clean is null ? null : new string(clean.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
    }
}

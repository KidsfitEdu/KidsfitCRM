using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using MySql.Data.MySqlClient;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions(KidsfitDbContext db)
{
    public Task<long> RegisterCustomerApproach(RegisterApproachRequest request, long actorId, HttpContext http, CancellationToken cancellationToken) =>
        RetryContestedWrite(() => RegisterCustomerApproachCore(request, actorId, http, cancellationToken), cancellationToken);

    public Task<long> ReportSignedContract(long registrationId, ReportSalesContractRequest request, long actorId, HttpContext http, CancellationToken cancellationToken) =>
        RetryContestedWrite(() => ReportSignedContractCore(registrationId, request, actorId, http, cancellationToken), cancellationToken);

    public Task<long> RecordRevenueReceipt(long contractId, RecordRevenueReceiptRequest request, long actorId, HttpContext http, CancellationToken cancellationToken) =>
        RetryContestedWrite(() => RecordRevenueReceiptCore(contractId, request, actorId, http, cancellationToken), cancellationToken);

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

    private async Task<long> ReportSignedContractCore(long registrationId, ReportSalesContractRequest request, long actorId, HttpContext http, CancellationToken cancellationToken)
    {
        var idempotencyKey = Validation.Required(request.IdempotencyKey, "idempotency_key", "Thiếu khóa chống gửi trùng.", 120);
        var hash = ChannelSalesValidation.Fingerprint(request, registrationId);
        await RequirePermission(actorId, Permissions.ChannelSalesReportContract, cancellationToken);
        var existing = await db.SalesContracts.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, cancellationToken);
        if (existing is not null) return ChannelSalesValidation.Replay(existing.Id, existing.ReportedByUserId, actorId, existing.RequestFingerprint, hash);
        // For new Sales reports, the server allocates a unique internal reference.
        // Legacy callers that still supply a code retain backwards compatibility.
        var contractCode = string.IsNullOrWhiteSpace(request.ContractCode)
            ? $"HD-{DateTime.UtcNow:yyyy}-{Guid.NewGuid():N}".ToUpperInvariant()
            : Validation.Required(request.ContractCode, "contract_code", "Mã hợp đồng không hợp lệ.", 64).ToUpperInvariant();
        var signedOn = request.SignedOn ?? throw ApiValidationException.For("signed_on", "Vui lòng chọn ngày ký hợp đồng.");
        if (signedOn > ChannelSalesValidation.BusinessDate(DateTime.UtcNow)) throw ApiValidationException.For("signed_on", "Ngày ký không được ở tương lai.");
        // New school contracts must carry the signed service term from Sales.
        // Legacy non-school integrations may still omit these fields.
        var hasServiceTerm = request.ServiceStartOn.HasValue || request.ServiceEndOn.HasValue
            || request.PaymentCycle is not null;
        var cycle = (request.PaymentCycle ?? "").Trim().ToUpperInvariant();
        if (hasServiceTerm)
        {
            if (!request.ServiceStartOn.HasValue)
                throw ApiValidationException.For("service_start_on", "Vui lòng nhập ngày bắt đầu dịch vụ.");
            if (!request.ServiceEndOn.HasValue)
                throw ApiValidationException.For("service_end_on", "Vui lòng nhập ngày kết thúc dịch vụ.");
            if (request.ServiceEndOn < request.ServiceStartOn)
                throw ApiValidationException.For("service_end_on", "Ngày kết thúc phải từ ngày bắt đầu trở đi.");
            if (cycle is not ("MONTHLY" or "YEARLY"))
                throw ApiValidationException.For("payment_cycle", "Chu kỳ thanh toán phải là theo tháng hoặc theo năm.");
        }
        ChannelSalesValidation.WholeDong(request.TotalValue, "total_value");
        // The simplified Sales form submits contract fees, never an arbitrary total.
        // Existing integrations that do not supply fee components retain legacy behavior.
        var hasContractFees = request.MaintenanceFee.HasValue || request.SetupFee.HasValue;
        decimal? calculatedTotal = null;
        if (hasContractFees)
        {
            if (!request.MaintenanceFee.HasValue || !request.SetupFee.HasValue)
                throw ApiValidationException.For("maintenance_fee", "Cần nhập cả phí duy trì và phí khởi tạo.");
            if (request.ServicePlan is not ("SCHOOL_YEAR" or "MONTHLY_9"))
                throw ApiValidationException.For("service_plan", "Cần chọn gói năm học hoặc gói hàng tháng.");
            // Only fee-based KC-01 submissions enforce the new mapping; legacy contracts remain untouched.
            ContractServicePlanPolicy.RequireMatchingCycle(request.ServicePlan, cycle);
            ChannelSalesValidation.WholeDong(request.MaintenanceFee.Value, "maintenance_fee", positive: false);
            ChannelSalesValidation.WholeDong(request.SetupFee.Value, "setup_fee", positive: false);
            try
            {
                calculatedTotal = checked(request.MaintenanceFee.Value *
                    (request.ServicePlan == "MONTHLY_9" ? 9 : 1) + request.SetupFee.Value);
            }
            catch (OverflowException)
            {
                throw ApiValidationException.For("total_value", "Giá trị hợp đồng vượt giới hạn.");
            }
            if (calculatedTotal <= 0 || calculatedTotal != request.TotalValue)
                throw ApiValidationException.For("total_value", "Tổng giá trị hợp đồng không khớp phí duy trì và phí khởi tạo.");
            // Payment schedules are created by Accounting when agreed in the signed contract.
            if (request.Installments is { Length: > 0 })
                throw ApiValidationException.For("installments", "Form báo cáo đơn giản không nhập lịch thanh toán từng đợt.");
        }
        if (request.Installments is { Length: > 0 })
        {
            if (request.Installments.Length > 60) throw ApiValidationException.For("installments", "Tối đa 60 đợt thanh toán trong một hợp đồng.");
            if (request.Installments.Any(x => x.DueOn < request.SignedOn))
                throw ApiValidationException.For("installments", "Hạn thanh toán không được trước ngày ký.");
            foreach (var item in request.Installments) ChannelSalesValidation.WholeDong(item.Amount, "installments");
            if (request.Installments.Sum(x => x.Amount) != request.TotalValue)
                throw ApiValidationException.For("installments", "Tổng các đợt phải bằng giá trị hợp đồng.");
        }

        var now = DateTime.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        try
        {
            var customerId = await db.ApproachRegistrations.Where(x => x.Id == registrationId).Select(x => (long?)x.CustomerId).SingleOrDefaultAsync(cancellationToken) ?? throw new KeyNotFoundException();
            var customer = await LockCustomer(customerId, cancellationToken) ?? throw new KeyNotFoundException();
            var registration = await db.ApproachRegistrations
                .FromSqlInterpolated($"SELECT * FROM approach_registrations WHERE id = {registrationId} FOR UPDATE")
                .SingleOrDefaultAsync(cancellationToken) ?? throw new KeyNotFoundException();
            var replayAfterLock = await db.SalesContracts.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, cancellationToken);
            if (replayAfterLock is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ChannelSalesValidation.Replay(replayAfterLock.Id, replayAfterLock.ReportedByUserId, actorId, replayAfterLock.RequestFingerprint, hash);
            }
            await EnsureOwnerOrManager(registration.OwnerUserId, registration.OwnerOrganizationId, actorId, cancellationToken);
            if (registration.Status != "ACTIVE" || registration.ProtectedUntil <= now)
                throw new ApiConflictException("Quyền tiếp cận không còn hiệu lực; không thể báo cáo hợp đồng từ lượt này.");

            if (signedOn < ChannelSalesValidation.BusinessDate(registration.RegisteredAt))
                throw ApiValidationException.For("signed_on", "Ngày ký không được trước ngày đăng ký tiếp cận.");
            var package = await db.CheckeeProductPackages.SingleOrDefaultAsync(x => x.Id == request.ProductPackageId && x.Status == "ACTIVE", cancellationToken)
                ?? throw ApiValidationException.For("product_package_id", "Gói CHECKEE không tồn tại hoặc đã ngừng áp dụng.");

            var schoolContract = await db.DirectorySchools.AnyAsync(x => x.CustomerId == customer.Id, cancellationToken);
            if (request.StudentCount is <= 0 or > 100000) throw ApiValidationException.For("student_count", "Quy mô học sinh không hợp lệ.");
            var servicePlan = request.ServicePlan?.Trim().ToUpperInvariant();
            if (servicePlan is not null && servicePlan is not ("SCHOOL_YEAR" or "MONTHLY_9"))
                throw ApiValidationException.For("service_plan", "Chọn gói năm học hoặc gói thanh toán tháng.");
            var unitIds = request.SchoolUnitIds ?? [];
            // A school may report branches covered by the signed contract before
            // all corresponding directory units have been entered in CRM.
            var branchCount = request.BranchCount ?? unitIds.Length;
            if (branchCount < 0 || branchCount > 100000 || branchCount < unitIds.Length)
                throw ApiValidationException.For("branch_count", "Số phân hiệu phải từ 0 đến 100.000 và không nhỏ hơn số phân hiệu đã chọn.");
            if (unitIds.Length != unitIds.Distinct().Count())
                throw ApiValidationException.For("school_unit_ids", "Trường điểm bị chọn trùng.");
            if (unitIds.Length > 0)
            {
                var directory = await db.DirectorySchools.Where(x => x.CustomerId == customer.Id)
                    .Select(x => (long?)x.Id).SingleOrDefaultAsync(cancellationToken);
                if (!directory.HasValue || await db.SchoolUnits.CountAsync(x => x.DirectorySchoolId == directory.Value
                    && x.UnitType == "BRANCH" && unitIds.Contains(x.Id), cancellationToken) != unitIds.Length)
                    throw ApiValidationException.For("school_unit_ids", "Danh sách trường điểm không thuộc trường chính.");
            }
            FinancialEvidence? contractProof = null;
            if (request.EvidenceId.HasValue)
            {
                contractProof = await db.FinancialEvidences
                    .FromSqlInterpolated($"SELECT * FROM financial_evidences WHERE id = {request.EvidenceId.Value} FOR UPDATE")
                    .SingleOrDefaultAsync(cancellationToken);
                if (contractProof is null || contractProof.Kind != "CONTRACT" || contractProof.UploadedByUserId != actorId
                    || contractProof.ContractId.HasValue || contractProof.AttachedAt.HasValue) throw new KeyNotFoundException();
            }
            if (schoolContract)
            {
                // Require terms in the new fee-based Sales workflow; preserve historic API callers
                // that have not yet migrated their signed-term data.
                if (hasContractFees && !hasServiceTerm) throw ApiValidationException.For("service_start_on",
                    "Hợp đồng trường học phải có thời hạn dịch vụ do Sales nhập theo hợp đồng đã ký.");
                if (contractProof is null) Validation.Required(request.EvidenceReference, "evidence_reference", "Hợp đồng trường học cần bằng chứng xác minh.", 500);
                if (await db.SalesContracts.AnyAsync(x => x.ApproachRegistrationId == registration.Id, cancellationToken)) throw new ApiConflictException("Lượt tiếp cận đã báo cáo hợp đồng. Hãy theo dõi hồ sơ xác minh.");
            }

            var protectionStart = DateTime.SpecifyKind(signedOn.ToDateTime(TimeOnly.MinValue).AddHours(-7), DateTimeKind.Utc);
            var contract = new SalesContract
            {
                CustomerId = customer.Id,
                ApproachRegistrationId = registration.Id,
                OwnerUserId = registration.OwnerUserId,
                OwnerOrganizationId = registration.OwnerOrganizationId,
                OwnerPersonnelType = CommissionPersonnelTypes.Normalize(await db.OrganizationMemberships.Where(x => x.UserId == registration.OwnerUserId && x.OrganizationId == registration.OwnerOrganizationId).Select(x => x.MembershipType).SingleOrDefaultAsync(cancellationToken)),
                ReportedByUserId = actorId,
                ContractCode = contractCode,
                SignedOn = signedOn,
                EffectiveOn = request.EffectiveOn,
                ServiceStartOn = request.ServiceStartOn,
                ServiceEndOn = request.ServiceEndOn,
                PaymentCycle = hasServiceTerm ? cycle : null,
                TotalValue = decimal.Round(request.TotalValue, 0),
                ServicePlan = servicePlan,
                ContractNote = CleanOptional(request.ContractNote, 4000),
                StudentCount = request.StudentCount,
                BranchCount = branchCount,
                SchoolUnitIdsJson = System.Text.Json.JsonSerializer.Serialize(unitIds),
                Status = schoolContract ? "PENDING_REVIEW" : "ACTIVE",
                RequiresSchoolVerification = schoolContract,
                ProtectionStartsAt = protectionStart,
                ProtectionUntil = schoolContract ? now : protectionStart.AddYears(5),
                EvidenceReference = CleanOptional(request.EvidenceReference, 500),
                IdempotencyKey = idempotencyKey,
                RequestFingerprint = hash,
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.SalesContracts.Add(contract);
            await db.SaveChangesAsync(cancellationToken);
            if (contractProof is not null) { contractProof.ContractId = contract.Id; contractProof.AttachedAt = now; contractProof.UpdatedAt = now; }

            registration.Status = schoolContract ? "ACTIVE" : "CONVERTED";
            registration.UpdatedAt = now;
            customer.LifecycleStatus = schoolContract ? "PROSPECT" : "CONTRACTED";
            customer.UpdatedAt = now;
            if (!schoolContract) await db.CustomerProtections
                .Where(x => x.ApproachRegistrationId == registration.Id && x.Status == "ACTIVE")
                .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.Status, "CONVERTED").SetProperty(x => x.UpdatedAt, now), cancellationToken);
            if (hasContractFees)
            {
                var maintenance = request.MaintenanceFee!.Value;
                var setup = request.SetupFee!.Value;
                var quantity = servicePlan == "MONTHLY_9" ? 9 : 1;
                db.SalesContractItems.Add(new SalesContractItem {
                    ContractId = contract.Id, ProductPackageId = package.Id,
                    Description = servicePlan == "MONTHLY_9" ? "Phí duy trì mỗi tháng (9 tháng)" : "Phí duy trì năm học (9 tháng)",
                    Quantity = quantity, UnitPrice = maintenance, Amount = maintenance * quantity,
                    CreatedAt = now, UpdatedAt = now
                });
                if (setup > 0) db.SalesContractItems.Add(new SalesContractItem {
                    ContractId = contract.Id, ProductPackageId = package.Id,
                    Description = "Phí khởi tạo (một lần)", Quantity = 1, UnitPrice = setup, Amount = setup,
                    CreatedAt = now, UpdatedAt = now
                });
            }
            else
            {
                db.SalesContractItems.Add(new SalesContractItem {
                    ContractId = contract.Id, ProductPackageId = package.Id,
                    Description = package.Name, Quantity = 1, UnitPrice = contract.TotalValue,
                    Amount = contract.TotalValue, CreatedAt = now, UpdatedAt = now
                });
            }
            if (!schoolContract) db.CustomerProtections.Add(new CustomerProtection
            {
                CustomerId = customer.Id,
                OwnerUserId = registration.OwnerUserId,
                OwnerOrganizationId = registration.OwnerOrganizationId,
                ContractId = contract.Id,
                SourceType = "CONTRACT",
                Status = "ACTIVE",
                EffectiveFrom = contract.ProtectionStartsAt,
                EffectiveUntil = contract.ProtectionUntil,
                CreatedAt = now,
                UpdatedAt = now,
            });
            var planned = request.Installments is { Length: > 0 }
                ? request.Installments
                : [new ContractPaymentInstallment(request.FirstPaymentDueOn ?? signedOn.AddDays(30), contract.TotalValue)];
            db.RevenueSchedules.AddRange(planned.Select(installment => new RevenueSchedule
            {
                ContractId = contract.Id,
                AmountDue = installment.Amount,
                AmountReceived = 0,
                DueOn = installment.DueOn,
                Status = "PENDING",
                CreatedAt = now,
                UpdatedAt = now,
            }));
            var checkeeOrganizationId = await db.Organizations.Where(x => x.Code == "CHECKEE").Select(x => x.Id).SingleAsync(cancellationToken);
            var reconciliation = new ReconciliationCase
            {
                CustomerId = customer.Id,
                ContractId = contract.Id,
                CheckeeOrganizationId = checkeeOrganizationId,
                Status = schoolContract ? "AWAITING_MANAGER" : "PENDING",
                OpenedAt = now,
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.ReconciliationCases.Add(reconciliation);
            db.CustomerActivities.Add(new CustomerActivity
            {
                CustomerId = customer.Id,
                ApproachRegistrationId = registration.Id,
                UserId = actorId,
                ActivityType = "CONTRACT_REPORTED",
                Content = $"Đã báo cáo hợp đồng {contract.ContractCode}.",
                CreatedAt = now,
                UpdatedAt = now,
            });
            Audit.Add(db, actorId, "REPORT_SIGNED_CONTRACT", nameof(SalesContract), contract.Id, null,
                new { contract.CustomerId, contract.ContractCode, contract.SignedOn, contract.TotalValue, contract.ProtectionUntil }, http);
            await db.SaveChangesAsync(cancellationToken);
            db.ReconciliationEvents.Add(new ReconciliationEvent
            {
                ReconciliationCaseId = reconciliation.Id,
                ActorUserId = actorId,
                EventType = "OPENED",
                CreatedAt = now,
                UpdatedAt = now,
            });
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return contract.Id;
        }
        catch (DbUpdateException exception) when (!IsTransientLock(exception))
        {
            await transaction.RollbackAsync(cancellationToken);
            db.ChangeTracker.Clear();
            var replay = await db.SalesContracts.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, cancellationToken);
            if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.ReportedByUserId, actorId, replay.RequestFingerprint, hash);
            throw new ApiConflictException("Mã hợp đồng hoặc yêu cầu này đã được ghi nhận.");
        }
    }

    private async Task<long> RecordRevenueReceiptCore(long contractId, RecordRevenueReceiptRequest request, long actorId, HttpContext http, CancellationToken cancellationToken)
    {
        var idempotencyKey = Validation.Required(request.IdempotencyKey, "idempotency_key", "Thiếu khóa chống gửi trùng.", 120);
        var hash = ChannelSalesValidation.Fingerprint(request, contractId);
        await RequirePermission(actorId, Permissions.ChannelSalesRecordRevenue, cancellationToken);
        var existing = await db.RevenueReceipts.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, cancellationToken);
        if (existing is not null) return ChannelSalesValidation.Replay(existing.Id, existing.RecordedByUserId, actorId, existing.RequestFingerprint, hash);
        ChannelSalesValidation.WholeDong(request.Amount, "amount");
        var referenceCode = Validation.Required(request.ReferenceCode, "reference_code", "Vui lòng nhập mã phiếu thu.", 64).ToUpperInvariant();
        var paymentMethod = Validation.Required(request.PaymentMethod ?? "BANK_TRANSFER", "payment_method", "Phương thức thu không hợp lệ.", 32).ToUpperInvariant();
        if (!new[] { "BANK_TRANSFER", "CASH", "CARD", "OTHER" }.Contains(paymentMethod)) throw ApiValidationException.For("payment_method", "Phương thức thu không được hỗ trợ.");
        var now = DateTime.UtcNow;

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        try
        {
            var contract = await db.SalesContracts
                .FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {contractId} FOR UPDATE")
                .SingleOrDefaultAsync(cancellationToken) ?? throw new KeyNotFoundException();
            var replayAfterLock = await db.RevenueReceipts.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, cancellationToken);
            if (replayAfterLock is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ChannelSalesValidation.Replay(replayAfterLock.Id, replayAfterLock.RecordedByUserId, actorId, replayAfterLock.RequestFingerprint, hash);
            }
            await EnsureOrganizationScope(contract.OwnerOrganizationId, actorId, cancellationToken);
            if (contract.Status != "ACTIVE") throw new ApiConflictException("Chỉ có thể ghi nhận thu cho hợp đồng đang hoạt động.");
            if (contract.OwnerPersonnelType is null)
            {
                // Legacy contracts acquire a group snapshot at their first subsequent receipt.
                // Existing commission entries and their policy versions remain unchanged.
                contract.OwnerPersonnelType = CommissionPersonnelTypes.Normalize(await db.OrganizationMemberships
                    .Where(x => x.UserId == contract.OwnerUserId && x.OrganizationId == contract.OwnerOrganizationId)
                    .Select(x => x.MembershipType).SingleOrDefaultAsync(cancellationToken));
                contract.UpdatedAt = now;
            }
            var collected = await db.RevenueReceipts.Where(x => x.ContractId == contract.Id && x.Status == "COMPLETED").SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0;
            collected -= await db.RevenueRefunds.Where(x => x.ContractId == contract.Id).SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0;
            var amount = decimal.Round(request.Amount, 0);
            if (collected + amount > contract.TotalValue) throw ApiValidationException.For("amount", "Khoản thu vượt giá trị còn phải thu của hợp đồng.");

            var schedule = request.RevenueScheduleId.HasValue
                ? await db.RevenueSchedules.SingleOrDefaultAsync(x => x.Id == request.RevenueScheduleId && x.ContractId == contract.Id, cancellationToken)
                : await db.RevenueSchedules.Where(x => x.ContractId == contract.Id && x.Status != "PAID").OrderBy(x => x.DueOn).FirstOrDefaultAsync(cancellationToken);
            if (schedule is null) throw ApiValidationException.For("revenue_schedule_id", "Không tìm thấy kỳ phải thu phù hợp.");
            if (schedule.AmountReceived + amount > schedule.AmountDue) throw ApiValidationException.For("amount", "Khoản thu vượt số tiền còn lại của kỳ phải thu.");

            var receivedAt = request.ReceivedAt?.ToUniversalTime() ?? now;
            if (receivedAt > now.AddMinutes(1) || ChannelSalesValidation.BusinessDate(receivedAt) < contract.SignedOn)
                throw ApiValidationException.For("received_at", "Thời điểm thu phải từ ngày ký đến hiện tại.");
            FinancialEvidence? receiptProof = null;
            if (request.EvidenceId.HasValue)
            {
                receiptProof = await db.FinancialEvidences
                    .FromSqlInterpolated($"SELECT * FROM financial_evidences WHERE id = {request.EvidenceId.Value} FOR UPDATE")
                    .SingleOrDefaultAsync(cancellationToken);
                if (receiptProof is null || receiptProof.Kind != "RECEIPT" || receiptProof.ContractId != contract.Id
                    || receiptProof.UploadedByUserId != actorId || receiptProof.AttachedAt.HasValue) throw new KeyNotFoundException();
            }
            var receipt = new RevenueReceipt
            {
                ContractId = contract.Id,
                RevenueScheduleId = schedule.Id,
                Amount = amount,
                ReceivedAt = receivedAt,
                ReferenceCode = referenceCode,
                PaymentMethod = paymentMethod,
                Status = "COMPLETED",
                IdempotencyKey = idempotencyKey,
                RequestFingerprint = hash,
                RecordedByUserId = actorId,
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.RevenueReceipts.Add(receipt);
            schedule.AmountReceived += amount;
            schedule.Status = schedule.AmountReceived == schedule.AmountDue ? "PAID" : "PARTIAL";
            schedule.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            if (receiptProof is not null)
            {
                receiptProof.RevenueReceiptId = receipt.Id;
                receiptProof.AttachedAt = now;
                receiptProof.UpdatedAt = now;
            }

            var receiptDate = ChannelSalesValidation.BusinessDate(receivedAt);
            var policy = await db.CommissionPolicyVersions
                .Where(x => x.Status == "ACTIVE" && (x.OrganizationId == contract.OwnerOrganizationId || x.OrganizationId == null)
                    && x.EffectiveFrom <= receiptDate && (x.PersonnelType == null || x.PersonnelType == contract.OwnerPersonnelType))
                .OrderByDescending(x => x.OrganizationId == contract.OwnerOrganizationId)
                .ThenByDescending(x => x.PersonnelType != null)
                .ThenByDescending(x => x.EffectiveFrom)
                .ThenByDescending(x => x.Id)
                .FirstOrDefaultAsync(cancellationToken);
            // Recording verified money must not fail when no approved commission policy is effective.
            if (policy is not null && (policy.EffectiveUntil is null || policy.EffectiveUntil >= receiptDate))
            {
                db.CommissionLedgerEntries.Add(new CommissionLedgerEntry
                {
                    ContractId = contract.Id,
                    RevenueReceiptId = receipt.Id,
                    PolicyVersionId = policy.Id,
                    BeneficiaryUserId = contract.OwnerUserId,
                    BeneficiaryOrganizationId = contract.OwnerOrganizationId,
                    EntryType = "ACCRUAL",
                    CalculationBase = amount,
                    RatePercent = policy.RatePercent,
                    Amount = decimal.Round(amount * policy.RatePercent / 100m, 0, MidpointRounding.AwayFromZero),
                    Status = "ACCRUED",
                    Period = ChannelSalesValidation.BusinessPeriod(receivedAt),
                    OccurredAt = receivedAt,
                    CreatedByUserId = actorId,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }
            Audit.Add(db, actorId, "RECORD_CHANNEL_REVENUE", nameof(RevenueReceipt), receipt.Id, null,
                new { receipt.ContractId, receipt.Amount, receipt.ReferenceCode, receipt.ReceivedAt }, http);
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return receipt.Id;
        }
        catch (DbUpdateException exception) when (!IsTransientLock(exception))
        {
            await transaction.RollbackAsync(cancellationToken);
            db.ChangeTracker.Clear();
            var replay = await db.RevenueReceipts.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, cancellationToken);
            if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.RecordedByUserId, actorId, replay.RequestFingerprint, hash);
            throw new ApiConflictException("Mã phiếu thu hoặc yêu cầu này đã được ghi nhận.");
        }
    }

    public async Task Reconcile(long caseId, bool confirm, ReconcileContractRequest request, long actorId, HttpContext http, CancellationToken cancellationToken)
    {
        await RequirePermission(actorId, Permissions.ChannelSalesReconcile, cancellationToken);
        var contractId = await db.ReconciliationCases.Where(x => x.Id == caseId).Select(x => (long?)x.ContractId).SingleOrDefaultAsync(cancellationToken) ?? throw new KeyNotFoundException();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
        var now = DateTime.UtcNow;
        // Lock customer before contract to serialize protection transitions with Sales and KIDSFIT legacy workflows.
        var customerId = await db.SalesContracts.Where(x => x.Id == contractId)
            .Select(x => x.CustomerId).SingleAsync(cancellationToken);
        var customer = await LockCustomer(customerId, cancellationToken) ?? throw new KeyNotFoundException();
        var schoolContract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {contractId} FOR UPDATE").SingleAsync(cancellationToken);
        var reconciliation = await db.ReconciliationCases.FromSqlInterpolated($"SELECT * FROM reconciliation_cases WHERE id = {caseId} FOR UPDATE").SingleOrDefaultAsync(cancellationToken) ?? throw new KeyNotFoundException();
        await EnsureOrganizationScope(reconciliation.CheckeeOrganizationId, actorId, cancellationToken);
        var reason = CleanOptional(request.Reason, 2000);
        if (!confirm && string.IsNullOrWhiteSpace(reason)) throw ApiValidationException.For("reason", "Vui lòng nhập lý do tranh chấp.");
        if ((confirm && reconciliation.Status == "CONFIRMED") || (!confirm && reconciliation.Status == "DISPUTED" && reconciliation.DisputeReason == reason))
        {
            await transaction.CommitAsync(cancellationToken);
            return;
        }
        if (reconciliation.Status is "CONFIRMED" or "RESOLVED") throw new ApiConflictException("Hồ sơ đối soát đã kết thúc.");
        if (reconciliation.Status == "AWAITING_MANAGER") throw new ApiConflictException("Hồ sơ chưa được Quản lý chuyển CHECKEE.");
        var previous = reconciliation.Status;
        if (schoolContract.RequiresSchoolVerification && schoolContract.Status != "CANCELLED")
        {
            if (schoolContract.ManagerReviewedAt is null || schoolContract.Status is "NEEDS_REVISION" or "PENDING_REVIEW")
                throw new ApiConflictException("Cần quản lý kiểm tra và chuyển hồ sơ trước khi CHECKEE xác minh.");
            if (confirm && schoolContract.VerifiedAt is null)
            {
                // CHECKEE verification and five-year protection activate atomically.
                // Never override an unrelated owner's active protection.
                if (await db.CustomerProtections.AnyAsync(x => x.CustomerId == customerId
                    && x.Status == "ACTIVE" && x.EffectiveUntil > now
                    && x.ApproachRegistrationId != schoolContract.ApproachRegistrationId, cancellationToken))
                    throw new ApiConflictException("Trường hiện có quyền bảo vệ khác. Cần giải quyết tranh chấp, không ghi đè quyền.");

                var registration = await db.ApproachRegistrations.FromSqlInterpolated(
                    $"SELECT * FROM approach_registrations WHERE id = {schoolContract.ApproachRegistrationId} FOR UPDATE")
                    .SingleAsync(cancellationToken);
                if (registration.Status is "CANCELLED" or "EXPIRED")
                    throw new ApiConflictException("Quyền tiếp cận của hợp đồng không còn hợp lệ; cần kiểm tra trước khi xác minh.");

                schoolContract.VerifiedAt = now;
                schoolContract.ProtectionStartsAt = now;
                schoolContract.ProtectionUntil = now.AddYears(5);
                schoolContract.Status = "ACTIVE";
                schoolContract.UpdatedAt = now;
                customer.LifecycleStatus = "CONTRACTED";
                customer.UpdatedAt = now;
                registration.Status = "CONVERTED";
                registration.UpdatedAt = now;
                await db.CustomerProtections.Where(x => x.ApproachRegistrationId == registration.Id
                    && x.SourceType == "APPROACH" && x.Status == "ACTIVE")
                    .ExecuteUpdateAsync(x => x.SetProperty(p => p.Status, "CONVERTED")
                        .SetProperty(p => p.UpdatedAt, now), cancellationToken);
                db.CustomerProtections.Add(new CustomerProtection {
                    CustomerId = customerId, OwnerUserId = schoolContract.OwnerUserId,
                    OwnerOrganizationId = schoolContract.OwnerOrganizationId,
                    ContractId = schoolContract.Id, SourceType = "CONTRACT",
                    EffectiveFrom = now, EffectiveUntil = now.AddYears(5),
                    CreatedAt = now, UpdatedAt = now
                });
                Audit.Add(db, actorId, "AUTO_GRANT_VERIFIED_SCHOOL_PROTECTION", nameof(SalesContract),
                    schoolContract.Id, null, new { schoolContract.VerifiedAt, schoolContract.ProtectionUntil }, http);
            }
        }
        reconciliation.Status = confirm ? "CONFIRMED" : "DISPUTED";
        reconciliation.DisputeReason = confirm ? null : reason;
        reconciliation.ResolvedAt = confirm ? now : null;
        reconciliation.UpdatedAt = now;
        db.ReconciliationEvents.Add(new ReconciliationEvent
        {
            ReconciliationCaseId = reconciliation.Id,
            ActorUserId = actorId,
            EventType = confirm ? "CONFIRMED" : "DISPUTED",
            Reason = reason,
            CreatedAt = now,
            UpdatedAt = now,
        });
        Audit.Add(db, actorId, confirm ? "CONFIRM_RECONCILIATION" : "DISPUTE_RECONCILIATION", nameof(ReconciliationCase), reconciliation.Id,
            new { status = previous }, new { reconciliation.Status, reconciliation.DisputeReason }, http);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
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

    private async Task<ChannelCustomer?> LockCustomer(long customerId, CancellationToken cancellationToken) =>
        await db.ChannelCustomers.FromSqlInterpolated($"SELECT * FROM channel_customers WHERE id = {customerId} FOR UPDATE").SingleOrDefaultAsync(cancellationToken);

    private async Task ExpireElapsedApproach(long customerId, DateTime now, CancellationToken cancellationToken)
    {
        var expired = await db.ApproachRegistrations.Where(x => x.CustomerId == customerId && x.Status == "ACTIVE" && x.ProtectedUntil <= now).ToListAsync(cancellationToken);
        foreach (var registration in expired) await MarkRegistrationExpired(registration, now, cancellationToken);
    }

    private async Task MarkRegistrationExpired(ApproachRegistration registration, DateTime now, CancellationToken cancellationToken)
    {
        registration.Status = "EXPIRED";
        registration.ExpiredAt = now;
        registration.UpdatedAt = now;
        await db.CustomerProtections.Where(x => x.ApproachRegistrationId == registration.Id && x.Status == "ACTIVE")
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.Status, "EXPIRED").SetProperty(x => x.UpdatedAt, now), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<long> PrimaryOrganizationId(long userId, CancellationToken cancellationToken) =>
        await db.OrganizationMemberships.Where(x => x.UserId == userId && x.Status == "ACTIVE" && db.Organizations.Any(o => o.Id == x.OrganizationId && o.Status == "ACTIVE"))
            .OrderByDescending(x => x.IsPrimary).ThenBy(x => x.Id).Select(x => (long?)x.OrganizationId).FirstOrDefaultAsync(cancellationToken)
        ?? throw ApiValidationException.For("organization", "Tài khoản chưa được gán vào tổ chức bán hàng.");

    private async Task EnsureOwnerOrManager(long ownerUserId, long organizationId, long actorId, CancellationToken cancellationToken)
    {
        var access = await ChannelSalesAccess.Load(db, actorId, cancellationToken);
        if (!access.CanManage(ownerUserId, organizationId)) throw new KeyNotFoundException();
    }

    private async Task EnsureOrganizationScope(long organizationId, long actorId, CancellationToken cancellationToken)
    {
        var access = await ChannelSalesAccess.Load(db, actorId, cancellationToken);
        if (!access.CanManageOrganization(organizationId)) throw new KeyNotFoundException();
    }

    private async Task<ChannelSalesAccess> RequirePermission(long userId, string permission, CancellationToken cancellationToken)
    {
        var access = await ChannelSalesAccess.Load(db, userId, cancellationToken);
        if (!access.Has(permission) || access.OrganizationIds.Length == 0) throw new KeyNotFoundException();
        return access;
    }

    private static string? CleanOptional(string? value, int maxLength)
    {
        var clean = value?.Trim();
        if (string.IsNullOrWhiteSpace(clean)) return null;
        if (clean.Length > maxLength) throw ApiValidationException.For("value", $"Dữ liệu vượt quá {maxLength} ký tự.");
        return clean;
    }

    private static string? NormalizeTaxCode(string? value)
    {
        var clean = CleanOptional(value, 32);
        return clean is null ? null : new string(clean.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
    }

    private static string? NormalizeEmail(string? value) => CleanOptional(value, 190)?.ToLowerInvariant();

    private static bool IsTransientLock(Exception exception) => exception.GetBaseException() is MySqlException { Number: 1205 or 1213 };

    private async Task<T> RetryContestedWrite<T>(Func<Task<T>> operation, CancellationToken ct)
    {
        for (var attempt = 0; ; attempt++)
        {
            try { return await operation(); }
            catch (Exception exception) when (IsTransientLock(exception))
            {
                db.ChangeTracker.Clear();
                if (attempt == 2) throw new ApiConflictException("Dữ liệu đang được xử lý bởi yêu cầu khác. Vui lòng thử lại với cùng khóa yêu cầu.");
                await Task.Delay(TimeSpan.FromMilliseconds(40 * (attempt + 1)), ct);
            }
        }
    }
}

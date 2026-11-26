using System.Data;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    public Task<long> ReportSignedContract(long registrationId, ReportSalesContractRequest request, long actorId, HttpContext http, CancellationToken cancellationToken) =>
        RetryContestedWrite(() => ReportSignedContractCore(registrationId, request, actorId, http, cancellationToken), cancellationToken);

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
            if (hasServiceTerm)
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
            if (!hasContractFees)
                throw ApiValidationException.For("maintenance_fee", "Cần nhập chi tiết phí duy trì và phí khởi tạo theo hợp đồng.");

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
                    ContractId = contract.Id,
                    Description = servicePlan == "MONTHLY_9" ? "Phí duy trì mỗi tháng (9 tháng)" : "Phí duy trì năm học (9 tháng)",
                    Quantity = quantity, UnitPrice = maintenance, Amount = maintenance * quantity,
                    CreatedAt = now, UpdatedAt = now
                });
                if (setup > 0) db.SalesContractItems.Add(new SalesContractItem {
                    ContractId = contract.Id,
                    Description = "Phí khởi tạo (một lần)", Quantity = 1, UnitPrice = setup, Amount = setup,
                    CreatedAt = now, UpdatedAt = now
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
            if (contract.RequiresSchoolVerification)
            {
                var managerId = await db.OrganizationMemberships.AsNoTracking()
                    .Where(m => m.UserId == contract.OwnerUserId && m.OrganizationId == contract.OwnerOrganizationId
                        && m.Status == "ACTIVE")
                    .Select(m => m.ManagerUserId).FirstOrDefaultAsync(cancellationToken);
                if (managerId.HasValue)
                    CrmNotificationWriter.Add(db, contract.OwnerOrganizationId, managerId.Value,
                        "SCHOOL_CONTRACT_REPORTED", nameof(SalesContract), contract.Id,
                        "Hợp đồng cần Quản lý kiểm tra", "Sales đã gửi hồ sơ hợp đồng, cần Quản lý kiểm tra và chuyển CHECKEE.",
                        "manager-contracts");
            }
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
}

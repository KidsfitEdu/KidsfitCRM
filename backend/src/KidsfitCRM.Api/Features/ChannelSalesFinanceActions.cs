using System.Data;
using System.Net.Mail;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    public async Task<long> CreatePayout(CreatePayoutRequest request, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesPayoutCreate, ct);
        if (!access.CanManageOrganization(request.OrganizationId)) throw new KeyNotFoundException();
        var period = ChannelSalesValidation.Period(request.Period);
        var key = Validation.Required(request.IdempotencyKey, "idempotency_key", "Thiếu khóa yêu cầu.", 120);
        var hash = ChannelSalesValidation.Fingerprint(request);
        ChannelSalesValidation.WholeDong(request.WithholdingAmount, "withholding_amount", false);
        var reason = CleanOptional(request.WithholdingReason, 1000);
        if (request.WithholdingAmount > 0 && reason is null) throw ApiValidationException.For("withholding_reason", "Khoản khấu trừ cần có lý do.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        try
        {
            // Serialize payout assembly within an organization. Unique payout items are the final duplicate guard.
            await db.Organizations.FromSqlInterpolated($"SELECT * FROM organizations WHERE id = {request.OrganizationId} FOR UPDATE").SingleAsync(ct);
            var replay = await db.Payouts.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
            if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.CreatedByUserId, actorId, replay.RequestFingerprint, hash);
            var entries = await db.CommissionLedgerEntries.Where(x => x.BeneficiaryOrganizationId == request.OrganizationId
                && x.BeneficiaryUserId == request.BeneficiaryUserId && x.Period == period
                && !db.PayoutItems.Any(item => item.CommissionLedgerEntryId == x.Id)
                && db.ReconciliationCases.Any(r => r.ContractId == x.ContractId && r.Status == "CONFIRMED"))
                .OrderBy(x => x.Id).ToListAsync(ct);
            if (entries.Count == 0) throw new ApiConflictException("Không có hoa hồng đã đối soát, chưa lập phiếu chi trong kỳ này.");
            var gross = entries.Sum(x => x.Amount);
            if (gross <= 0) throw new ApiConflictException("Tổng hoa hồng còn lại trong kỳ phải dương để lập phiếu chi.");
            if (request.WithholdingAmount > gross) throw ApiValidationException.For("withholding_amount", "Khấu trừ không được vượt tổng hoa hồng.");
            var now = DateTime.UtcNow;
            var payout = new Payout
            {
                OrganizationId = request.OrganizationId,
                BeneficiaryUserId = request.BeneficiaryUserId,
                Code = "PO-" + Guid.NewGuid().ToString("N").ToUpperInvariant(),
                Period = period,
                GrossAmount = gross,
                WithholdingAmount = request.WithholdingAmount,
                NetAmount = gross - request.WithholdingAmount,
                WithholdingReason = reason,
                Status = "DRAFT",
                IdempotencyKey = key,
                RequestFingerprint = hash,
                CreatedByUserId = actorId,
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.Payouts.Add(payout);
            await db.SaveChangesAsync(ct);
            db.PayoutItems.AddRange(entries.Select(x => new PayoutItem { PayoutId = payout.Id, CommissionLedgerEntryId = x.Id, Amount = x.Amount, CreatedAt = now, UpdatedAt = now }));
            AddPayoutEvent(payout, actorId, "CREATED", reason, now);
            Audit.Add(db, actorId, "CREATE_PAYOUT", nameof(Payout), payout.Id, null, new { payout.OrganizationId, payout.BeneficiaryUserId, payout.Period, payout.GrossAmount, payout.WithholdingAmount, payout.NetAmount }, http);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return payout.Id;
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(ct);
            db.ChangeTracker.Clear();
            var replay = await db.Payouts.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
            if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.CreatedByUserId, actorId, replay.RequestFingerprint, hash);
            throw new ApiConflictException("Hoa hồng đã được đưa vào phiếu chi khác. Vui lòng tải lại.");
        }
    }

    public async Task ApprovePayout(long id, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesPayoutApprove, ct);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var payout = await LockPayout(id, ct);
        if (!access.CanManageOrganization(payout.OrganizationId)) throw new KeyNotFoundException();
        if (payout.Status is "APPROVED" or "PAID") return;
        if (payout.Status != "DRAFT") throw new ApiConflictException("Phiếu chi không ở trạng thái chờ duyệt.");
        await EnsurePayoutReconciled(payout.Id, ct);
        payout.Status = "APPROVED";
        payout.ApprovedAt = DateTime.UtcNow;
        payout.ApprovedByUserId = actorId;
        payout.UpdatedAt = DateTime.UtcNow;
        AddPayoutEvent(payout, actorId, "APPROVED", null, payout.UpdatedAt);
        Audit.Add(db, actorId, "APPROVE_PAYOUT", nameof(Payout), id, new { status = "DRAFT" }, new { payout.Status, payout.NetAmount }, http);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    public async Task CompletePayout(long id, CompletePayoutRequest request, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesPayoutComplete, ct);
        var reference = Validation.Required(request.PaymentReference, "payment_reference", "Cần mã giao dịch / phiếu chi thực tế.", 120);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var payout = await LockPayout(id, ct);
        if (!access.CanManageOrganization(payout.OrganizationId)) throw new KeyNotFoundException();
        if (payout.Status == "PAID")
        {
            if (payout.PaymentReference != reference) throw new ApiConflictException("Phiếu chi đã hoàn tất với mã giao dịch khác.");
            return;
        }
        if (payout.Status != "APPROVED") throw new ApiConflictException("Phải duyệt phiếu chi trước khi ghi nhận đã chi.");
        await EnsurePayoutReconciled(payout.Id, ct);
        payout.Status = "PAID";
        payout.PaidAt = DateTime.UtcNow;
        payout.PaidByUserId = actorId;
        payout.PaymentReference = reference;
        payout.UpdatedAt = DateTime.UtcNow;
        AddPayoutEvent(payout, actorId, "PAID", CleanOptional(request.Reason, 1000), payout.UpdatedAt);
        Audit.Add(db, actorId, "COMPLETE_PAYOUT", nameof(Payout), id, new { status = "APPROVED" }, new { payout.Status, payout.NetAmount, payout.PaymentReference, payout.PaidAt }, http);
        try
        {
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        catch (DbUpdateException)
        {
            throw new ApiConflictException("Mã giao dịch đã được dùng cho phiếu chi khác.");
        }
    }

    public async Task<long> CreateCommissionPolicy(CreateCommissionPolicyRequest request, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesPolicyManage, ct);
        if (!access.CanManageOrganization(request.OrganizationId)) throw new KeyNotFoundException();
        var today = ChannelSalesValidation.BusinessDate(DateTime.UtcNow);
        if (request.EffectiveFrom <= today) throw ApiValidationException.For("effective_from", "Chính sách mới có hiệu lực sớm nhất từ ngày mai để tránh áp hồi tố.");
        if (request.EffectiveUntil < request.EffectiveFrom) throw ApiValidationException.For("effective_until", "Ngày kết thúc phải từ ngày bắt đầu trở đi.");
        var code = Validation.Required(request.Code, "code", "Vui lòng nhập mã phiên bản.", 48).ToUpperInvariant();
        var personnelType = CommissionPersonnelTypes.Normalize(CleanOptional(request.PersonnelType, 32));
        if (personnelType is not null && !CommissionPersonnelTypes.Specific.Contains(personnelType))
            throw ApiValidationException.For("personnel_type", "Nhóm nhân sự áp dụng không hợp lệ.");
        var name = Validation.Required(request.Name, "name", "Vui lòng nhập tên chính sách.", 190);
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var organization = await db.Organizations.FromSqlInterpolated($"SELECT * FROM organizations WHERE id = {request.OrganizationId} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (request.RatePercent < 0 || request.RatePercent > organization.CommissionRateCeiling || decimal.Round(request.RatePercent, 4) != request.RatePercent)
            throw ApiValidationException.For("rate_percent", $"Tỷ lệ phải nằm trong hạn mức {organization.CommissionRateCeiling}% của tổ chức.");
        if (await db.CommissionPolicyVersions.AnyAsync(x => x.OrganizationId == organization.Id && x.EffectiveFrom >= request.EffectiveFrom, ct))
            throw new ApiConflictException("Phiên bản mới phải có ngày hiệu lực sau phiên bản mới nhất.");
        var policy = new CommissionPolicyVersion
        {
            OrganizationId = organization.Id,
            Code = code,
            Name = name,
            RatePercent = request.RatePercent,
            PersonnelType = personnelType,
            EffectiveFrom = request.EffectiveFrom,
            EffectiveUntil = request.EffectiveUntil,
            Status = "ACTIVE",
            CreatedByUserId = actorId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.CommissionPolicyVersions.Add(policy);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) { throw new ApiConflictException("Mã phiên bản chính sách đã tồn tại."); }
        Audit.Add(db, actorId, "CREATE_COMMISSION_POLICY", nameof(CommissionPolicyVersion), policy.Id, null,
            new { policy.Code, policy.OrganizationId, policy.PersonnelType, policy.RatePercent, policy.EffectiveFrom, policy.EffectiveUntil }, http);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return policy.Id;
    }

    public async Task<long> AdjustCommission(long entryId, AdjustCommissionRequest request, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesCommissionAdjust, ct);
        var key = Validation.Required(request.IdempotencyKey, "idempotency_key", "Thiếu khóa yêu cầu.", 120);
        var hash = ChannelSalesValidation.Fingerprint(request, entryId);
        var reason = Validation.Required(request.Reason, "reason", "Điều chỉnh cần có lý do / chứng từ.", 1000);
        ChannelSalesValidation.WholeDong(decimal.Abs(request.Amount), "amount");
        var period = ChannelSalesValidation.Period(request.Period);
        if (string.CompareOrdinal(period, ChannelSalesValidation.BusinessPeriod(DateTime.UtcNow)) < 0) throw ApiValidationException.For("period", "Điều chỉnh chỉ được ghi vào kỳ hiện tại hoặc kỳ sau.");
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var original = await db.CommissionLedgerEntries.FromSqlInterpolated($"SELECT * FROM commission_ledger_entries WHERE id = {entryId} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(original.BeneficiaryOrganizationId)) throw new KeyNotFoundException();
        if (original.EntryType != "ACCRUAL") throw new ApiConflictException("Chỉ điều chỉnh từ bút toán phát sinh gốc.");
        if (string.CompareOrdinal(period, original.Period) < 0) throw ApiValidationException.For("period", "Kỳ điều chỉnh không được trước kỳ phát sinh gốc.");
        var replay = await db.CommissionLedgerEntries.AsNoTracking().SingleOrDefaultAsync(x => x.IdempotencyKey == key, ct);
        if (replay is not null) return ChannelSalesValidation.Replay(replay.Id, replay.CreatedByUserId, actorId, replay.RequestFingerprint, hash);
        var adjusted = await db.CommissionLedgerEntries.Where(x => x.RelatedEntryId == original.Id).SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
        if (original.Amount + adjusted + request.Amount < 0) throw ApiValidationException.For("amount", "Tổng điều chỉnh giảm không được vượt hoa hồng của bút toán gốc.");
        var now = DateTime.UtcNow;
        var entry = new CommissionLedgerEntry
        {
            ContractId = original.ContractId,
            PolicyVersionId = original.PolicyVersionId,
            RelatedEntryId = original.Id,
            BeneficiaryUserId = original.BeneficiaryUserId,
            BeneficiaryOrganizationId = original.BeneficiaryOrganizationId,
            EntryType = request.Amount < 0 ? "REVERSAL" : "ADJUSTMENT",
            CalculationBase = 0,
            RatePercent = 0,
            Amount = request.Amount,
            Status = "ACCRUED",
            Period = period,
            OccurredAt = now,
            Reason = reason,
            IdempotencyKey = key,
            RequestFingerprint = hash,
            CreatedByUserId = actorId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.CommissionLedgerEntries.Add(entry);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) { throw new ApiConflictException("Khóa điều chỉnh đã được sử dụng."); }
        Audit.Add(db, actorId, "ADJUST_COMMISSION", nameof(CommissionLedgerEntry), entry.Id, null, new { entry.RelatedEntryId, entry.Amount, entry.Period, entry.Reason }, http);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return entry.Id;
    }

    public async Task<long> CreateSalesAccount(CreateSalesAccountRequest request, long actorId, IPasswordHasher<User> hasher, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesTeamManage, ct);
        if (!access.CanManageOrganization(request.OrganizationId)) throw new KeyNotFoundException();
        var name = Validation.Required(request.Name, "name", "Vui lòng nhập họ tên.", 190);
        var email = Validation.Required(request.Email, "email", "Vui lòng nhập email.", 190).ToLowerInvariant();
        if (!MailAddress.TryCreate(email, out var address) || address.Address != email) throw ApiValidationException.For("email", "Email không hợp lệ.");
        var password = Validation.Required(request.Password, "password", "Vui lòng nhập mật khẩu tối thiểu 12 ký tự.", 128);
        if (password.Length < 12) throw ApiValidationException.For("password", "Mật khẩu tối thiểu 12 ký tự.");
        var roleCode = access.Has(Permissions.ChannelSalesIdentityManage) ? (request.RoleCode ?? "CHANNEL_SALES").ToUpperInvariant() : "PARTNER_COLLABORATOR";
        // Explicit compatibility mapping: new CHECKEE sellers must not inherit education CRM permissions.
        if (roleCode == "SALES") roleCode = "CHANNEL_SALES";
        var allowed = new[] { "ADMIN", "BOARD", "ACCOUNTANT", "SALES_MANAGER", "CUSTOMER_CARE", "CHANNEL_SALES", "CHECKEE", "PARTNER_ADMIN", "PARTNER_COLLABORATOR" };
        if (!allowed.Contains(roleCode)) throw ApiValidationException.For("role_code", "Vai trò không được hỗ trợ.");
        // Sensitive executive roles require a separate KIDSFIT authorization workflow.
        if (roleCode is "ADMIN" or "BOARD") throw new ApiConflictException("Không cấp vai trò Admin/BGĐ qua chức năng quản lý nhân sự thông thường.");
        var role = await db.Roles.SingleOrDefaultAsync(x => x.Code == roleCode, ct) ?? throw new KeyNotFoundException();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var user = new User { Code = "USR-" + Guid.NewGuid().ToString("N")[..16].ToUpperInvariant(), Name = name, Email = email, Status = "ACTIVE", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        user.Password = hasher.HashPassword(user, password);
        db.Users.Add(user);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) { throw new ApiConflictException("Email đã được sử dụng. Không tự gán tài khoản đã tồn tại vào tổ chức khác."); }
        db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        var membership = new OrganizationMembership { UserId = user.Id, OrganizationId = request.OrganizationId, ManagerUserId = actorId, MembershipType = roleCode, Status = "ACTIVE", IsPrimary = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.OrganizationMemberships.Add(membership);
        Audit.Add(db, actorId, "CREATE_CHANNEL_ACCOUNT", nameof(User), user.Id, null, new { request.OrganizationId, roleCode }, http);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return user.Id;
    }

    public async Task<long> RecordSupportActivity(long customerId, AddCustomerActivityRequest request, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesActivity, ct);
        var customer = await access.Customers(db).SingleOrDefaultAsync(x => x.Id == customerId && x.LifecycleStatus == "CONTRACTED", ct) ?? throw new KeyNotFoundException();
        if (!access.All && !await access.Contracts(db).AnyAsync(x => x.CustomerId == customerId && x.Status == "ACTIVE", ct)) throw new KeyNotFoundException();
        var content = Validation.Required(request.Content, "content", "Vui lòng nhập nội dung chăm sóc.", 4000);
        var now = DateTime.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var activity = new CustomerActivity { CustomerId = customerId, UserId = actorId, ActivityType = "SUPPORT", Content = content, NextFollowUpAt = request.NextFollowUpAt?.ToUniversalTime(), CreatedAt = now, UpdatedAt = now };
        db.CustomerActivities.Add(activity);
        await db.SaveChangesAsync(ct);
        Audit.Add(db, actorId, "RECORD_CUSTOMER_SUPPORT", nameof(CustomerActivity), activity.Id, null, new { activity.CustomerId, activity.ActivityType, activity.NextFollowUpAt }, http);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return activity.Id;
    }

    public async Task ChangeMembershipStatus(long id, ChangeMembershipStatusRequest request, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesTeamManage, ct);
        var membership = await db.OrganizationMemberships.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (!access.CanManageOrganization(membership.OrganizationId) || membership.UserId == actorId) throw new KeyNotFoundException();
        if (!access.Has(Permissions.ChannelSalesIdentityManage) && membership.MembershipType != "PARTNER_COLLABORATOR" && membership.MembershipType != "COLLABORATOR") throw new KeyNotFoundException();
        var status = request.Status?.ToUpperInvariant();
        if (status is not ("ACTIVE" or "SUSPENDED")) throw ApiValidationException.For("status", "Trạng thái không hợp lệ.");
        var previous = membership.Status;
        if (previous == status) return;
        if (status == "SUSPENDED")
        {
            await CompleteSchoolHandover(id, new(request.IdempotencyKey, request.Reason, request.Summary, false), actorId, http, ct);
            return;
        }
        await ReactivateSchoolMembership(id, new(request.Reason ?? "Khôi phục thành viên theo quản lý tài khoản."), actorId, http, ct);
    }

    private async Task<Payout> LockPayout(long id, CancellationToken ct) => await db.Payouts.FromSqlInterpolated($"SELECT * FROM payouts WHERE id = {id} FOR UPDATE").SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();

    private async Task EnsurePayoutReconciled(long id, CancellationToken ct)
    {
        var contractIds = await (from item in db.PayoutItems join entry in db.CommissionLedgerEntries on item.CommissionLedgerEntryId equals entry.Id where item.PayoutId == id select entry.ContractId).Distinct().ToArrayAsync(ct);
        foreach (var contractId in contractIds.Order())
        {
            var reconciliation = await db.ReconciliationCases.FromSqlInterpolated($"SELECT * FROM reconciliation_cases WHERE contract_id = {contractId} FOR UPDATE").SingleOrDefaultAsync(ct);
            if (reconciliation?.Status != "CONFIRMED") throw new ApiConflictException("Cần CHECKEE xác nhận đối soát trước khi duyệt hoặc ghi nhận chi hoa hồng.");
        }
    }

    private void AddPayoutEvent(Payout payout, long actorId, string eventType, string? reason, DateTime now) => db.PayoutEvents.Add(new PayoutEvent
    {
        PayoutId = payout.Id,
        ActorUserId = actorId,
        EventType = eventType,
        Reason = reason,
        CreatedAt = now,
        UpdatedAt = now,
    });
}

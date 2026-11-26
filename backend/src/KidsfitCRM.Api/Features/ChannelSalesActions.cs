using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;
using MySql.Data.MySqlClient;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions(KidsfitDbContext db)
{
    public async Task Reconcile(long caseId, bool confirm, ReconcileContractRequest request, long actorId, HttpContext http, CancellationToken cancellationToken)
    {
        await RequirePermission(actorId, Permissions.ChannelSalesReconcile, cancellationToken);
        await ReconcileAuthorized(caseId, confirm, request, actorId, http, cancellationToken);
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
        // Expiry is already authorized by existing policy; this only records the event.
        var collaborator = await db.OrganizationMemberships.AsNoTracking().AnyAsync(m =>
            m.UserId == registration.OwnerUserId && m.OrganizationId == registration.OwnerOrganizationId
            && m.Status == "ACTIVE" && (m.MembershipType == "COLLABORATOR"
                || m.MembershipType == "PARTNER_COLLABORATOR"), cancellationToken);
        CrmNotificationWriter.Add(db, registration.OwnerOrganizationId, registration.OwnerUserId,
            "SCHOOL_APPROACH_EXPIRED", nameof(ApproachRegistration), registration.Id,
            "Quyền tiếp cận trường đã hết hạn",
            "Quyền tiếp cận trường đã kết thúc và trường có thể được đăng ký theo quy tắc CRM.",
            collaborator ? "role-collaborator-approaches" : "role-sales-staff-customers");
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

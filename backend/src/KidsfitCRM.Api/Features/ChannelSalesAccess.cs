using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed record ChannelSalesAccess(long UserId, long[] OrganizationIds, string[] PermissionCodes)
{
    public bool Has(string permission) => PermissionCodes.Contains(permission, StringComparer.Ordinal);
    public bool All => OrganizationIds.Length > 0 && Has(Permissions.ChannelSalesAllScope);
    public bool Organization => OrganizationIds.Length > 0 && Has(Permissions.ChannelSalesOrganizationScope);
    public bool InOrganization(long organizationId) => OrganizationIds.Contains(organizationId);
    public bool CanManage(long ownerId, long organizationId) => All || (InOrganization(organizationId) && (ownerId == UserId || Organization));
    public bool CanManageOrganization(long organizationId) => All || (Organization && InOrganization(organizationId));

    public static async Task<ChannelSalesAccess> Load(KidsfitDbContext db, long userId, CancellationToken ct)
    {
        if (!await db.Users.AnyAsync(x => x.Id == userId && x.Status == "ACTIVE", ct)) throw new KeyNotFoundException();
        var codes = await (from ur in db.UserRoles
                           join pr in db.PermissionRoles on ur.RoleId equals pr.RoleId
                           join p in db.Permissions on pr.PermissionId equals p.Id
                           where ur.UserId == userId
                           select p.Code).Distinct().ToArrayAsync(ct);
        var organizations = await (from membership in db.OrganizationMemberships
                                   join organization in db.Organizations on membership.OrganizationId equals organization.Id
                                   where membership.UserId == userId && membership.Status == "ACTIVE" && organization.Status == "ACTIVE"
                                   select membership.OrganizationId).ToArrayAsync(ct);
        return new(userId, organizations, codes);
    }

    public IQueryable<SalesContract> Contracts(KidsfitDbContext db) => All ? db.SalesContracts : db.SalesContracts.Where(x =>
        OrganizationIds.Contains(x.OwnerOrganizationId) && (Organization || x.OwnerUserId == UserId));

    public IQueryable<CommissionLedgerEntry> Commissions(KidsfitDbContext db) => All ? db.CommissionLedgerEntries : db.CommissionLedgerEntries.Where(x =>
        OrganizationIds.Contains(x.BeneficiaryOrganizationId) && (Organization || x.BeneficiaryUserId == UserId));

    public IQueryable<Payout> Payouts(KidsfitDbContext db) => All ? db.Payouts : db.Payouts.Where(x =>
        OrganizationIds.Contains(x.OrganizationId) && (Organization || x.BeneficiaryUserId == UserId));

    public IQueryable<ChannelCustomer> Customers(KidsfitDbContext db)
    {
        if (All) return db.ChannelCustomers;
        var now = DateTime.UtcNow;
        var scoped = db.ChannelCustomers.Where(x =>
            (Organization && OrganizationIds.Contains(x.OrganizationId))
            || db.ApproachRegistrations.Any(r => r.CustomerId == x.Id && OrganizationIds.Contains(r.OwnerOrganizationId) && (Organization || r.OwnerUserId == UserId))
            || db.SalesContracts.Any(c => c.CustomerId == x.Id && OrganizationIds.Contains(c.OwnerOrganizationId) && (Organization || c.OwnerUserId == UserId))
            || (OrganizationIds.Contains(x.OrganizationId) && !db.CustomerProtections.Any(p => p.CustomerId == x.Id && p.Status == "ACTIVE" && p.EffectiveUntil > now))
            || (HasReconciliation && db.ReconciliationCases.Any(r => r.CustomerId == x.Id && OrganizationIds.Contains(r.CheckeeOrganizationId))));
        if (!Has(Permissions.ChannelSalesRegister) && !HasReconciliation && !Has(Permissions.ChannelSalesRecordRevenue) && !Has(Permissions.ChannelSalesCommissionView))
            scoped = scoped.Where(x => x.LifecycleStatus == "CONTRACTED");
        return scoped;
    }

    private bool HasReconciliation => Has(Permissions.ChannelSalesReconcile);
}

public static class ChannelSalesValidation
{
    public static string Fingerprint<T>(T request, long? resourceId = null) =>
        Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(new { resourceId, request })));

    public static long Replay(long id, long originalActor, long actor, string? storedHash, string hash)
    {
        if (originalActor != actor) throw new KeyNotFoundException();
        if (storedHash is null || storedHash != hash) throw new ApiConflictException("Khóa yêu cầu đã dùng cho nội dung khác. Vui lòng tạo yêu cầu mới.");
        return id;
    }

    public static string Period(string? period)
    {
        var value = period?.Trim();
        if (value is null || !DateOnly.TryParseExact(value + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            throw ApiValidationException.For("period", "Kỳ phải có định dạng YYYY-MM hợp lệ.");
        return value;
    }

    public static void WholeDong(decimal amount, string field, bool positive = true)
    {
        if ((positive && amount <= 0) || (!positive && amount < 0) || decimal.Truncate(amount) != amount || amount > 999_999_999_999_999m)
            throw ApiValidationException.For(field, "Số tiền phải là số nguyên đồng hợp lệ.");
    }

    public static DateOnly BusinessDate(DateTime utc) => DateOnly.FromDateTime(DateTime.SpecifyKind(utc, DateTimeKind.Utc).AddHours(7));
    public static string BusinessPeriod(DateTime utc) => BusinessDate(utc).ToString("yyyy-MM", CultureInfo.InvariantCulture);
}

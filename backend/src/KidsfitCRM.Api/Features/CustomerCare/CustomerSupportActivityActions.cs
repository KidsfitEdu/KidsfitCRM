using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed partial class ChannelSalesActions
{
    public async Task<long> RecordSupportActivity(long customerId, AddCustomerActivityRequest request, long actorId, HttpContext http, CancellationToken ct)
    {
        var access = await RequirePermission(actorId, Permissions.ChannelSalesActivity, ct);
        var customer = await access.Customers(db).SingleOrDefaultAsync(x => x.Id == customerId && x.LifecycleStatus == "CONTRACTED", ct) ?? throw new KeyNotFoundException();
        if (!access.All && !await access.Contracts(db).AnyAsync(x => x.CustomerId == customerId && x.Status == "ACTIVE", ct)) throw new KeyNotFoundException();
        if (access.Has(Permissions.SchoolSupportManage) && !access.All
            && !await db.SalesContracts.AnyAsync(x => x.CustomerId == customerId && x.Status == "ACTIVE"
                && x.VerifiedAt != null && x.CareUserId == actorId && x.CareOrganizationId.HasValue
                && access.OrganizationIds.Contains(x.CareOrganizationId.Value), ct))
            throw new KeyNotFoundException();
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
}

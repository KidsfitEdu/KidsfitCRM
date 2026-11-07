using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public static class SchoolProposalAlertEndpoints
{
    public static RouteGroupBuilder MapSchoolProposalAlerts(this RouteGroupBuilder secured)
    {
        var alerts = secured.MapGroup("/notifications");
        alerts.MapGet("", async (HttpContext http, KidsfitDbContext db, CancellationToken ct) =>
        {
            var userId = http.UserId();
            // Revoked Admin/Director privileges must also revoke access to old alerts.
            if (!await IsCentralReviewer(db, userId, ct))
                return Results.Ok(new { unread_count = 0, data = Array.Empty<object>() });
            // Only the signed-in recipient can read notices. No cross-tenant query parameter.
            var items = await
                (from alert in db.SchoolProposalAlerts.AsNoTracking()
                 join proposal in db.SchoolProposals.AsNoTracking() on alert.SchoolProposalId equals proposal.Id
                 where alert.RecipientUserId == userId && alert.Status == "OPEN"
                 orderby alert.CreatedAt descending
                 select new
                 {
                     alert.Id, alert.Kind, alert.DueAt, alert.CreatedAt, alert.ReadAt,
                     alert.SchoolProposalId, proposal.Name, proposal.SchoolCode
                 }).Take(50).ToArrayAsync(ct);
            var unread = await db.SchoolProposalAlerts.CountAsync(x =>
                x.RecipientUserId == userId && x.Status == "OPEN" && x.ReadAt == null, ct);
            return Results.Ok(new
            {
                unread_count = unread,
                data = items.Select(x => new
                {
                    x.Id, x.Kind, x.DueAt, x.CreatedAt, x.ReadAt, x.SchoolProposalId,
                    school_name = x.Name, school_code = x.SchoolCode,
                    message = x.Kind == "ADMIN_OVERDUE"
                        ? "Đề xuất trường đã quá hạn chờ Admin xem xét."
                        : "Đề xuất trường quá hạn Admin, cần BGĐ giám sát."
                })
            });
        });
        alerts.MapGet("/contract-expiry", async (HttpContext http, KidsfitDbContext db, CancellationToken ct) =>
        {
            var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
            if (!access.Has(Permissions.ChannelSalesView) && !access.Has(Permissions.SchoolSupportManage))
                return Results.Ok(new { unread_count = 0, data = Array.Empty<object>() });
            var visibleContracts = access.Contracts(db)
                .Where(c => c.Status == "ACTIVE" && c.VerifiedAt != null
                    && c.RequiresSchoolVerification
                    && !db.ContractCancellations.Any(cancel => cancel.ContractId == c.Id))
                .Select(x => x.Id);
            var isCollaborator = await db.OrganizationMemberships.AnyAsync(m =>
                m.UserId == access.UserId && m.Status == "ACTIVE" && m.MembershipType == "COLLABORATOR", ct);
            var alertsQuery = db.ContractExpiryAlerts.AsNoTracking().Where(x =>
                x.RecipientUserId == access.UserId && x.Status == "OPEN"
                && visibleContracts.Contains(x.ContractId));
            var unread = await alertsQuery.CountAsync(x => x.ReadAt == null, ct);
            var rows = await alertsQuery.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
                .Take(50).Select(x => new
                {
                    x.Id, x.ContractId, x.Kind, x.DueOn, x.MilestoneOn, x.ReadAt,
                    x.CreatedAt, ContractCode = db.SalesContracts.Where(c => c.Id == x.ContractId)
                        .Select(c => c.ContractCode).First(),
                    SchoolName = db.SalesContracts.Where(c => c.Id == x.ContractId)
                        .Select(c => db.ChannelCustomers.Where(k => k.Id == c.CustomerId)
                            .Select(k => k.DisplayName).First()).First(),
                    OwnerUserId = db.SalesContracts.Where(c => c.Id == x.ContractId)
                        .Select(c => c.OwnerUserId).First(),
                    CareUserId = db.SalesContracts.Where(c => c.Id == x.ContractId)
                        .Select(c => c.CareUserId).First()
                }).ToArrayAsync(ct);
            return Results.Ok(new
            {
                unread_count = unread,
                data = rows.Select(x => new
                {
                    x.Id, x.Kind, x.ReadAt, x.CreatedAt, x.ContractId, x.ContractCode,
                    school_name = x.SchoolName,
                    message = ContractExpiryMessage(x.Kind, x.MilestoneOn),
                    due_at = x.DueOn,
                    target = x.OwnerUserId == access.UserId ? (isCollaborator ? "role-collaborator-approaches" : "role-sales-staff-customers")
                        : x.CareUserId == access.UserId ? "role-customer-care-customers" : "manager-contracts"
                })
            });
        });
        alerts.MapPost("/contract-expiry/{id:long}/read", async (long id, HttpContext http,
            KidsfitDbContext db, CancellationToken ct) =>
        {
            var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
            if (!access.Has(Permissions.ChannelSalesView) && !access.Has(Permissions.SchoolSupportManage))
                throw new KeyNotFoundException();
            var visibleContracts = access.Contracts(db)
                .Where(c => c.Status == "ACTIVE" && c.VerifiedAt != null
                    && c.RequiresSchoolVerification
                    && !db.ContractCancellations.Any(cancel => cancel.ContractId == c.Id))
                .Select(x => x.Id);
            var alert = db.ContractExpiryAlerts.Where(x => x.Id == id
                && x.RecipientUserId == access.UserId && x.Status == "OPEN"
                && visibleContracts.Contains(x.ContractId));
            if (!await alert.AnyAsync(ct)) throw new KeyNotFoundException();
            await alert.Where(x => x.ReadAt == null).ExecuteUpdateAsync(
                x => x.SetProperty(a => a.ReadAt, DateTime.UtcNow)
                    .SetProperty(a => a.UpdatedAt, DateTime.UtcNow), ct);
            return Results.Ok(new { success = true });
        });
        alerts.MapPost("/{id:long}/read", async (long id, HttpContext http, KidsfitDbContext db, CancellationToken ct) =>
        {
            var userId = http.UserId();
            if (!await IsCentralReviewer(db, userId, ct)) throw new KeyNotFoundException();
            var ownAlert = db.SchoolProposalAlerts.Where(x =>
                x.Id == id && x.RecipientUserId == userId && x.Status == "OPEN");
            if (!await ownAlert.AnyAsync(ct)) throw new KeyNotFoundException();
            await ownAlert.Where(x => x.ReadAt == null)
                .ExecuteUpdateAsync(set => set.SetProperty(x => x.ReadAt, DateTime.UtcNow), ct);
            return Results.Ok(new { success = true });
        });
        return secured;
    }

    private static string ContractExpiryMessage(string kind, DateOnly expires) =>
        kind switch
        {
            "SERVICE_BEFORE_30" => $"Kỳ dịch vụ sẽ hết hạn sau 30 ngày ({expires:dd/MM/yyyy}).",
            "SERVICE_BEFORE_15" => $"Kỳ dịch vụ sẽ hết hạn sau 15 ngày ({expires:dd/MM/yyyy}).",
            "SERVICE_BEFORE_7" => $"Kỳ dịch vụ sẽ hết hạn sau 7 ngày ({expires:dd/MM/yyyy}).",
            "SERVICE_EXPIRED" => $"Hôm nay kỳ dịch vụ kết thúc ({expires:dd/MM/yyyy}).",
            "SERVICE_AFTER_30" => $"Kỳ dịch vụ đã hết hạn 30 ngày ({expires:dd/MM/yyyy}).",
            "SERVICE_GAP_BEFORE_30" => $"Kỳ sử dụng sẽ tạm gián đoạn sau 30 ngày (từ {expires:dd/MM/yyyy}), dù đã có kỳ tái ký được xác nhận.",
            "SERVICE_GAP_BEFORE_15" => $"Kỳ sử dụng sẽ tạm gián đoạn sau 15 ngày (từ {expires:dd/MM/yyyy}), dù đã có kỳ tái ký được xác nhận.",
            "SERVICE_GAP_BEFORE_7" => $"Kỳ sử dụng sẽ tạm gián đoạn sau 7 ngày (từ {expires:dd/MM/yyyy}), dù đã có kỳ tái ký được xác nhận.",
            "SERVICE_INTERRUPTED" => $"Kỳ sử dụng bắt đầu tạm gián đoạn hôm nay ({expires:dd/MM/yyyy}); kỳ tiếp theo đã được xác nhận.",
            "PROTECTION_BEFORE_30" => $"Quyền bảo vệ Sales sẽ hết hạn sau 30 ngày ({expires:dd/MM/yyyy}).",
            "PROTECTION_BEFORE_7" => $"Quyền bảo vệ Sales sẽ hết hạn sau 7 ngày ({expires:dd/MM/yyyy}).",
            "PROTECTION_EXPIRED" => $"Quyền bảo vệ Sales đến hạn hôm nay ({expires:dd/MM/yyyy}).",
            _ => "Có cảnh báo hợp đồng cần theo dõi."
        };

    private static Task<bool> IsCentralReviewer(KidsfitDbContext db, long userId, CancellationToken ct) =>
        (from ur in db.UserRoles
         join role in db.Roles on ur.RoleId equals role.Id
         join membership in db.OrganizationMemberships on ur.UserId equals membership.UserId
         join org in db.Organizations on membership.OrganizationId equals org.Id
         where ur.UserId == userId && (role.Code == "ADMIN" || role.Code == "DIRECTOR")
               && membership.Status == "ACTIVE" && org.Status == "ACTIVE" && org.Code == "KIDSFIT"
         select ur.UserId).AnyAsync(ct);
}

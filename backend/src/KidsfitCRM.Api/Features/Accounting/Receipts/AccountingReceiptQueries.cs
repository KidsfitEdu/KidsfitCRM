using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public static partial class AccountingWorkspaceEndpoints
{
    public static async Task<IResult> ReceivableContracts(HttpContext http, KidsfitDbContext db,
        string? search, int? page, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesRecordRevenue)) return Results.Forbid();
        var term = (search ?? "").Trim();
        if (term.Length > 190) throw ApiValidationException.For("search", "Tìm kiếm tối đa 190 ký tự.");
        var pn = Math.Max(1, page ?? 1);
        var scope = access.Contracts(db).AsNoTracking().Where(c => c.VerifiedAt.HasValue
            && c.Status == "ACTIVE"
            && db.RevenueSchedules.Any(schedule => schedule.ContractId == c.Id
                && schedule.AmountReceived < schedule.AmountDue));
        if (term.Length > 0)
            scope = scope.Where(c => c.ContractCode.Contains(term)
                || db.ChannelCustomers.Any(school => school.Id == c.CustomerId
                    && school.DisplayName.Contains(term)));
        var total = await scope.CountAsync(ct);
        var data = await (from contract in scope
            join school in db.ChannelCustomers.AsNoTracking() on contract.CustomerId equals school.Id
            join owner in db.Users.AsNoTracking() on contract.OwnerUserId equals owner.Id
            orderby school.DisplayName, contract.Id
            select new { id = contract.Id, code = contract.ContractCode,
                school_name = school.DisplayName,
                owner_name = owner.Name,
                personnel_type = contract.OwnerPersonnelType,
                // Direct manager in the contract owner's organization. Never infer from other
                // managers in the company; an unassigned or inactive relationship stays null.
                manager_name = (from membership in db.OrganizationMemberships.AsNoTracking()
                    join manager in db.Users.AsNoTracking()
                        on membership.ManagerUserId equals (long?)manager.Id
                    where membership.OrganizationId == contract.OwnerOrganizationId
                        && membership.UserId == contract.OwnerUserId
                        && membership.Status == "ACTIVE" && manager.Status == "ACTIVE"
                        && db.OrganizationMemberships.Any(managerMembership =>
                            managerMembership.OrganizationId == contract.OwnerOrganizationId
                            && managerMembership.UserId == manager.Id
                            && managerMembership.Status == "ACTIVE"
                            && (managerMembership.MembershipType == "SALES_MANAGER"
                                || managerMembership.MembershipType == "PARTNER_ADMIN"))
                    select manager.Name).FirstOrDefault(),
                amount_remaining = db.RevenueSchedules.Where(x => x.ContractId == contract.Id)
                    .Sum(x => (decimal?)(x.AmountDue - x.AmountReceived)) ?? 0m })
            .Skip((pn - 1) * 50).Take(50).ToArrayAsync(ct);
        return Results.Ok(new { data, total, page = pn, page_size = 50 });
    }

    /// <summary>
    /// One ledger-backed source of receipt history across verified contracts;
    /// no financial mutation and no inferred renewal year from the bank date.
    /// </summary>
    public static async Task<IResult> Receipts(HttpContext http, KidsfitDbContext db,
        string? search, int? year, int? page, int? page_size, int? month, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesCommissionView)) return Results.Forbid();
        var term = (search ?? "").Trim();
        if (term.Length > 190) throw ApiValidationException.For("search", "Tìm kiếm tối đa 190 ký tự.");
        if (year is < 2000 or > 2100) throw ApiValidationException.For("year", "Năm không hợp lệ.");
        if (month.HasValue && (month < 1 || month > 12 || !year.HasValue))
            throw ApiValidationException.For("month", "Chọn năm hợp lệ trước khi lọc tháng thu.");
        var pn = Math.Max(1, page ?? 1);
        var size = Math.Clamp(page_size ?? 20, 1, 100);
        var scopedContracts = access.Contracts(db).AsNoTracking().Where(c => c.VerifiedAt.HasValue);
        var query = from receipt in db.RevenueReceipts.AsNoTracking()
                    join contract in scopedContracts on receipt.ContractId equals contract.Id
                    join school in db.ChannelCustomers.AsNoTracking() on contract.CustomerId equals school.Id
                    where receipt.Status == "COMPLETED"
                    select new { receipt, contract, school };
        if (term.Length > 0)
            query = query.Where(x => x.receipt.ReferenceCode.Contains(term)
                || x.contract.ContractCode.Contains(term) || x.school.DisplayName.Contains(term));
        if (year.HasValue)
        {
            // Vietnam business-year boundary is 00:00 Asia/Ho_Chi_Minh (UTC+07).
            var beginning = new DateTime(year.Value, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddHours(-7);
            var from = month.HasValue ? beginning.AddMonths(month.Value - 1) : beginning;
            var to = month.HasValue ? from.AddMonths(1) : beginning.AddYears(1);
            query = query.Where(x => x.receipt.ReceivedAt >= from
                && x.receipt.ReceivedAt < to);
        }
        var total = await query.CountAsync(ct);
        var data = await query.OrderByDescending(x => x.receipt.ReceivedAt)
            .ThenByDescending(x => x.receipt.Id)
            .Skip((pn - 1) * size).Take(size)
            .Select(x => new {
                id = x.receipt.Id,
                contract_id = x.contract.Id,
                contract_code = (from scheduled in db.RevenueSchedules
                    join renewal in db.ContractRenewals on scheduled.ContractRenewalId equals renewal.Id
                    where scheduled.Id == x.receipt.RevenueScheduleId
                    select renewal.ContractCode).FirstOrDefault() ?? x.contract.ContractCode,
                renewal_no = (from scheduled in db.RevenueSchedules
                    join renewal in db.ContractRenewals on scheduled.ContractRenewalId equals renewal.Id
                    where scheduled.Id == x.receipt.RevenueScheduleId
                    select (int?)renewal.RenewalNo).FirstOrDefault(),
                school_name = x.school.DisplayName,
                amount = x.receipt.Amount,
                received_at = x.receipt.ReceivedAt,
                reference_code = x.receipt.ReferenceCode,
                payment_method = x.receipt.PaymentMethod,
                status = x.receipt.Status,
                schedule_id = x.receipt.RevenueScheduleId,
                proof_id = db.FinancialEvidences.Where(e => e.RevenueReceiptId == x.receipt.Id
                        && e.Kind == "RECEIPT" && e.AttachedAt.HasValue)
                    .OrderByDescending(e => e.Id).Select(e => (long?)e.Id).FirstOrDefault(),
                proof_file_name = db.FinancialEvidences.Where(e => e.RevenueReceiptId == x.receipt.Id
                        && e.Kind == "RECEIPT" && e.AttachedAt.HasValue)
                    .OrderByDescending(e => e.Id).Select(e => e.FileName).FirstOrDefault()
            }).ToArrayAsync(ct);
        return Results.Ok(new { data, total, page = pn, page_size = size });
    }
}

using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Infrastructure;
using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

/// <summary>
/// Server-paged Accounting registers. Collection-valued payout history is loaded
/// separately for the current page, avoiding cartesian joins and EF Query[20504].
/// All financial reads are scoped through the actor's authorized records.
/// </summary>
public static class AccountingPayoutEndpoints
{
    public static void Map(RouteGroupBuilder group)
    {
        group.MapGet("/accounting/payouts", List)
            .RequireAuthorization(Permissions.ChannelSalesCommissionView);
        group.MapGet("/accounting/eligible-payouts", Eligible)
            .RequireAuthorization(Permissions.ChannelSalesPayoutCreate);
    }

    public static async Task<IResult> List(
        HttpContext http, KidsfitDbContext db, string? period,
        string? search, string? status, string? role, long? organization_id,
        int? page, int? page_size, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesCommissionView)) return Results.Forbid();
        var month = ChannelSalesValidation.Period(period ?? ChannelSalesValidation.BusinessPeriod(DateTime.UtcNow));
        var term = (search ?? "").Trim();
        if (term.Length > 190) throw ApiValidationException.For("search", "Tìm kiếm tối đa 190 ký tự.");
        var state = (status ?? "ALL").Trim().ToUpperInvariant();
        if (state is not ("ALL" or "DRAFT" or "PENDING_APPROVAL" or "CHANGES_REQUESTED"
            or "APPROVED" or "PAID" or "CANCELLED" or "REJECTED"))
            throw ApiValidationException.For("status", "Trạng thái phiếu chi không hợp lệ.");
        var beneficiaryRole = (role ?? "ALL").Trim().ToUpperInvariant();
        if (beneficiaryRole is not ("ALL" or "SALES" or "MANAGER"))
            throw ApiValidationException.For("role", "Vai trò người hưởng không hợp lệ.");
        if (organization_id.HasValue && organization_id.Value <= 0)
            throw ApiValidationException.For("organization_id", "Tổ chức không hợp lệ.");
        var pn = Math.Max(page ?? 1, 1);
        var size = Math.Clamp(page_size ?? 20, 1, 100);

        var payoutScope = access.Payouts(db).AsNoTracking().Where(x => x.Period == month);
        if (state != "ALL") payoutScope = payoutScope.Where(x => x.Status == state);
        if (beneficiaryRole != "ALL") payoutScope = payoutScope.Where(x => x.BeneficiaryRole == beneficiaryRole);
        if (organization_id.HasValue) payoutScope = payoutScope.Where(x => x.OrganizationId == organization_id.Value);

        var query = from payout in payoutScope
                    join beneficiary in db.Users.AsNoTracking()
                        on payout.BeneficiaryUserId equals (long?)beneficiary.Id
                    select new { payout, beneficiary_name = beneficiary.Name };
        if (term.Length > 0)
        {
            var authorizedEntries = access.Commissions(db);
            var authorizedContracts = access.Contracts(db);
            query = query.Where(x => x.payout.Code.Contains(term)
                || x.beneficiary_name.Contains(term)
                || (from item in db.PayoutItems
                    join entry in authorizedEntries on item.CommissionLedgerEntryId equals entry.Id
                    join contract in authorizedContracts on entry.ContractId equals contract.Id
                    join school in db.ChannelCustomers on contract.CustomerId equals school.Id
                    where item.PayoutId == x.payout.Id
                        && (contract.ContractCode.Contains(term) || school.DisplayName.Contains(term))
                    select item.Id).Any());
        }

        var total = await query.CountAsync(ct);
        var records = await query.OrderByDescending(x => x.payout.CreatedAt)
            .ThenByDescending(x => x.payout.Id).Skip((pn - 1) * size).Take(size)
            .Select(x => new
            {
                x.payout.Id, x.payout.OrganizationId, x.payout.CreatedByUserId,
                x.payout.BeneficiaryUserId, x.beneficiary_name,
                x.payout.Code, x.payout.Period, beneficiary_role = x.payout.BeneficiaryRole,
                x.payout.GrossAmount, x.payout.SuggestedRatePercent,
                x.payout.RequestedRatePercent, x.payout.SuggestedAmount,
                x.payout.RequestedAmount, x.payout.AdjustmentReason,
                x.payout.SubmittedAt, x.payout.WithholdingAmount,
                x.payout.WithholdingReason, x.payout.NetAmount, x.payout.Status,
                x.payout.ApprovedAt, x.payout.PaidAt, x.payout.PaymentReference
            }).ToArrayAsync(ct);
        var ids = records.Select(x => x.Id).ToArray();

        // Three small page-scoped reads instead of projecting three correlated
        // collection navigations into one paginated query.
        var contracts = await (from item in db.PayoutItems.AsNoTracking()
            join entry in access.Commissions(db).AsNoTracking()
                on item.CommissionLedgerEntryId equals entry.Id
            join contract in access.Contracts(db).AsNoTracking()
                on entry.ContractId equals contract.Id
            join school in db.ChannelCustomers.AsNoTracking()
                on contract.CustomerId equals school.Id
            where ids.Contains(item.PayoutId)
            select new { item.PayoutId, contract_id = contract.Id,
                contract_code = contract.ContractCode, school_name = school.DisplayName })
            .Distinct().ToArrayAsync(ct);
        var events = await db.PayoutEvents.AsNoTracking()
            .Where(x => ids.Contains(x.PayoutId))
            .OrderBy(x => x.CreatedAt).ThenBy(x => x.Id)
            .Select(x => new { x.PayoutId, x.EventType, x.CreatedAt, x.Reason })
            .ToArrayAsync(ct);
        var proofs = await db.FinancialEvidences.AsNoTracking()
            .Where(x => x.PayoutId.HasValue && ids.Contains(x.PayoutId.Value)
                && x.Kind == "PAYOUT" && x.AttachedAt.HasValue)
            .OrderByDescending(x => x.Id)
            .Select(x => new { x.PayoutId, x.Id, x.FileName })
            .ToArrayAsync(ct);

        var data = records.Select(x =>
        {
            var related = contracts.Where(c => c.PayoutId == x.Id).ToArray();
            var proof = proofs.FirstOrDefault(e => e.PayoutId == x.Id);
            var canEdit = access.Has(Permissions.ChannelSalesPayoutCreate)
                && x.CreatedByUserId == access.UserId
                && access.CanManageOrganization(x.OrganizationId)
                && x.Status is "DRAFT" or "CHANGES_REQUESTED";
            return new {
                id = x.Id, organization_id = x.OrganizationId,
                beneficiary_user_id = x.BeneficiaryUserId,
                x.beneficiary_name, x.Code, x.Period, x.beneficiary_role,
                x.GrossAmount, x.SuggestedRatePercent, x.RequestedRatePercent,
                x.SuggestedAmount, x.RequestedAmount, x.AdjustmentReason,
                x.SubmittedAt, x.WithholdingAmount, x.WithholdingReason,
                x.NetAmount, x.Status, x.ApprovedAt, x.PaidAt,
                x.PaymentReference,
                contract_ids = related.Select(c => c.contract_id).Distinct().ToArray(),
                contract_codes = related.Select(c => c.contract_code).Distinct().ToArray(),
                school_names = related.Select(c => c.school_name).Distinct().ToArray(),
                proof_id = proof?.Id,
                proof_file_name = proof?.FileName,
                events = events.Where(e => e.PayoutId == x.Id)
                    .Select(e => new { e.EventType, e.CreatedAt, e.Reason }).ToArray(),
                can_edit = canEdit && related.Select(c => c.contract_id).Distinct().Count() == 1,
                can_submit = canEdit,
                can_approve = access.Has(Permissions.ChannelSalesPayoutApprove)
                    && access.CanManageOrganization(x.OrganizationId)
                    && x.CreatedByUserId != access.UserId && x.Status == "PENDING_APPROVAL",
                can_complete = access.Has(Permissions.ChannelSalesPayoutComplete)
                    && access.CanManageOrganization(x.OrganizationId) && x.Status == "APPROVED"
                    && related.Select(c => c.contract_id).Distinct().Count() == 1
            };
        }).ToArray();
        var organizations = await db.Organizations.AsNoTracking()
            .Where(x => x.Status == "ACTIVE"
                && (access.All || access.OrganizationIds.Contains(x.Id)))
            .OrderBy(x => x.Name)
            .Select(x => new { x.Id, x.Name, x.Code, x.CommissionRateCeiling })
            .ToArrayAsync(ct);
        return Results.Ok(new { data, total, page = pn, page_size = size, organizations });
    }

    public static async Task<IResult> Eligible(
        HttpContext http, KidsfitDbContext db, string? period, string? search,
        string? role, long? organization_id, int? page, int? page_size, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesPayoutCreate)) return Results.Forbid();
        var month = ChannelSalesValidation.Period(period ?? ChannelSalesValidation.BusinessPeriod(DateTime.UtcNow));
        var term = (search ?? "").Trim();
        if (term.Length > 190) throw ApiValidationException.For("search", "Tìm kiếm tối đa 190 ký tự.");
        var beneficiaryRole = (role ?? "ALL").Trim().ToUpperInvariant();
        if (beneficiaryRole is not ("ALL" or "SALES" or "MANAGER"))
            throw ApiValidationException.For("role", "Vai trò không hợp lệ.");
        if (organization_id.HasValue && organization_id.Value <= 0)
            throw ApiValidationException.For("organization_id", "Tổ chức không hợp lệ.");
        var pn = Math.Max(page ?? 1, 1);
        var size = Math.Clamp(page_size ?? 20, 1, 100);
        var entries = access.Commissions(db).AsNoTracking()
            .Where(x => x.Period == month && !db.PayoutItems.Any(i => i.CommissionLedgerEntryId == x.Id));
        if (beneficiaryRole != "ALL") entries = entries.Where(x => x.BeneficiaryRole == beneficiaryRole);
        if (organization_id.HasValue) entries = entries.Where(x => x.BeneficiaryOrganizationId == organization_id.Value);

        var query = from entry in entries
                    join contract in access.Contracts(db).AsNoTracking() on entry.ContractId equals contract.Id
                    join school in db.ChannelCustomers.AsNoTracking() on contract.CustomerId equals school.Id
                    join user in db.Users.AsNoTracking() on entry.BeneficiaryUserId equals user.Id
                    where contract.OwnerOrganizationId == entry.BeneficiaryOrganizationId
                    group entry by new {
                        entry.ContractId, contract.ContractCode, school.DisplayName,
                        entry.BeneficiaryOrganizationId, entry.BeneficiaryUserId,
                        user.Name, entry.BeneficiaryRole, entry.Period
                    } into grouped
                    select new {
                        contract_id = grouped.Key.ContractId,
                        contract_code = grouped.Key.ContractCode,
                        school_name = grouped.Key.DisplayName,
                        organization_id = grouped.Key.BeneficiaryOrganizationId,
                        beneficiary_user_id = grouped.Key.BeneficiaryUserId,
                        beneficiary_name = grouped.Key.Name,
                        beneficiary_role = grouped.Key.BeneficiaryRole,
                        period = grouped.Key.Period,
                        amount = grouped.Sum(x => x.Amount),
                        entry_count = grouped.Count()
                    };
        var candidates = query.Where(x => x.amount > 0);
        if (term.Length > 0)
            candidates = candidates.Where(x => x.contract_code.Contains(term)
                || x.school_name.Contains(term) || x.beneficiary_name.Contains(term));
        var total = await candidates.CountAsync(ct);
        var data = await candidates.OrderByDescending(x => x.amount)
            .ThenBy(x => x.school_name).ThenBy(x => x.contract_id)
            .ThenBy(x => x.beneficiary_user_id).ThenBy(x => x.beneficiary_role)
            .Skip((pn - 1) * size).Take(size).ToArrayAsync(ct);
        return Results.Ok(new { data, total, page = pn, page_size = size });
    }
}

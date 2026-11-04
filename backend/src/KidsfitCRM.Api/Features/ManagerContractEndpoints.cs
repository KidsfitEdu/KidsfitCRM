using System.Data;
using System.Text.Json;
using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public sealed record ReturnSchoolContractRequest(string? Reason);
public sealed record ResubmitSchoolContractRequest(
    long? EvidenceId,
    DateOnly? SignedOn = null,
    string? ServicePlan = null,
    int? StudentCount = null,
    int? BranchCount = null,
    long[]? SchoolUnitIds = null,
    decimal? MaintenanceFee = null,
    decimal? SetupFee = null,
    string? ContractNote = null);

/// <summary>
/// Manager contract workflow. Authorization and scope are enforced in SQL, not by the UI.
/// File evidence is retained across revisions; a forwarded case is visible to CHECKEE.
/// </summary>
public static class ManagerContractEndpoints
{
    public static void MapManagerContractOperations(this RouteGroupBuilder group)
    {
        group.MapGet("/school-contracts/reviews", List).RequireAuthorization(Permissions.SchoolContractReview);
        group.MapGet("/school-contracts/my-revisions", MyRevisions).RequireAuthorization(Permissions.ChannelSalesReportContract);
        group.MapGet("/manager/team", Team).RequireAuthorization(Permissions.ChannelSalesTeamManage);
        group.MapGet("/manager/team/{id:long}/handover-preview", HandoverPreview)
            .RequireAuthorization(Permissions.SchoolHandoverManage);
        group.MapGet("/manager/released-schools", ReleasedSchools)
            .RequireAuthorization(Permissions.SchoolAllocationManage);
        group.MapGet("/manager/overview", Overview).RequireAuthorization(Permissions.SchoolAllocationManage);
        group.MapGet("/school-contracts/{id:long}/review-detail", Detail).RequireAuthorization(Permissions.ChannelSalesView);
        group.MapPost("/school-contracts/{id:long}/request-revision", ReturnForRevision)
            .RequireAuthorization(Permissions.SchoolContractReview);
        group.MapPost("/school-contracts/{id:long}/resubmit", Resubmit)
            .RequireAuthorization(Permissions.ChannelSalesReportContract);
    }

    private static IQueryable<SalesContract> ManagerScope(KidsfitDbContext db, ChannelSalesAccess access) =>
        db.SalesContracts.Where(c => c.RequiresSchoolVerification &&
            (access.All || (access.Organization && access.OrganizationIds.Contains(c.OwnerOrganizationId)
                && db.OrganizationMemberships.Any(m => m.OrganizationId == c.OwnerOrganizationId
                    && m.UserId == c.OwnerUserId && m.ManagerUserId == access.UserId
                    && (m.Status == "ACTIVE" || m.Status == "SUSPENDED")))));

    internal static async Task<IResult> Overview(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.SchoolAllocationManage)) return Results.Forbid();
        var actor = http.UserId();
        var scopedOrganizations = access.OrganizationIds;
        var contracts = ManagerScope(db, access).AsNoTracking();
        var proposals = db.SchoolProposals.AsNoTracking()
            .Where(x => access.All || (scopedOrganizations.Contains(x.OrganizationId) && x.ManagerUserId == actor));
        var extensions = db.SchoolExtensionRequests.AsNoTracking()
            .Where(x => access.All || (scopedOrganizations.Contains(x.OrganizationId) && x.ManagerUserId == actor));
        var invitations = db.SchoolInvitations.AsNoTracking()
            .Where(x => access.All || scopedOrganizations.Contains(x.OrganizationId));
        return Results.Ok(new
        {
            pending_proposals = await proposals.CountAsync(x => x.Status == "PENDING_MANAGER", ct),
            pending_invitations = await invitations.CountAsync(x => x.Status == "PENDING", ct),
            pending_extensions = await extensions.CountAsync(x => x.Status == "PENDING", ct),
            pending_contracts = await contracts.CountAsync(x => x.Status == "PENDING_REVIEW", ct),
            awaiting_checkee = await contracts.CountAsync(x => x.Status == "MANAGER_REVIEWED"
                && !db.ReconciliationCases.Any(r => r.ContractId == x.Id && r.Status == "DISPUTED"), ct),
            needs_revision = await contracts.CountAsync(x => x.Status == "NEEDS_REVISION"
                || (x.Status == "MANAGER_REVIEWED"
                    && db.ReconciliationCases.Any(r => r.ContractId == x.Id && r.Status == "DISPUTED")), ct),
            verified_contracts = await contracts.CountAsync(x => x.Status == "ACTIVE", ct),
        });
    }

    internal static async Task<IResult> Team(HttpContext http, KidsfitDbContext db,
        string? search, string? status, int? page, int? page_size, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesTeamManage)) return Results.Forbid();
        var actor = http.UserId();
        var members = db.OrganizationMemberships.AsNoTracking()
            .Where(m => access.OrganizationIds.Contains(m.OrganizationId)
                && (access.All || m.ManagerUserId == actor)
                && (m.MembershipType == "SALES" || m.MembershipType == "CHANNEL_SALES"
                    || m.MembershipType == "COLLABORATOR" || m.MembershipType == "PARTNER_COLLABORATOR"));
        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            var selected = status.Trim().ToUpperInvariant();
            if (selected is not ("ACTIVE" or "SUSPENDED" or "INACTIVE"))
                throw ApiValidationException.For("status", "Trạng thái nhân sự không hợp lệ.");
            members = members.Where(m => m.Status == selected);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            members = members.Where(m => db.Users.Any(u => u.Id == m.UserId && (u.Name.Contains(term) || u.Email.Contains(term)))
                || db.Organizations.Any(o => o.Id == m.OrganizationId && o.Name.Contains(term)));
        }
        var total = await members.CountAsync(ct);
        var pageNumber = Math.Max(1, page ?? 1);
        var size = Math.Clamp(page_size ?? 20, 1, 100);
        var now = DateTime.UtcNow;
        var soon = now.AddHours(48);
        var rows = await (from m in members
                          join user in db.Users.AsNoTracking() on m.UserId equals user.Id
                          join organization in db.Organizations.AsNoTracking() on m.OrganizationId equals organization.Id
                          orderby user.Name, m.Id
                          select new
                          {
                              id = m.Id, m.UserId, name = user.Name, user.Email,
                              m.OrganizationId, organization_name = organization.Name,
                              m.MembershipType, m.Status, m.SchoolApproachLimit,
                              active_schools = db.ApproachRegistrations
                                  .Where(r => r.OwnerUserId == m.UserId && r.OwnerOrganizationId == m.OrganizationId
                                      && r.Status == "ACTIVE" && r.ProtectedUntil > now
                                      && db.DirectorySchools.Any(s => s.CustomerId == r.CustomerId))
                                  .Select(r => r.CustomerId).Distinct().Count(),
                              expiring_schools = db.ApproachRegistrations
                                  .Where(r => r.OwnerUserId == m.UserId && r.OwnerOrganizationId == m.OrganizationId
                                      && r.Status == "ACTIVE" && r.ProtectedUntil > now && r.ProtectedUntil <= soon
                                      && db.DirectorySchools.Any(s => s.CustomerId == r.CustomerId))
                                  .Select(r => r.CustomerId).Distinct().Count(),
                              contracts_reported = db.SalesContracts.Count(c =>
                                  c.OwnerUserId == m.UserId && c.OwnerOrganizationId == m.OrganizationId),
                          }).Skip((pageNumber - 1) * size).Take(size).ToArrayAsync(ct);
        return Results.Ok(new {
            data = rows, total, page = pageNumber, page_size = size,
            summary = new {
                members = total,
                active = await members.CountAsync(m => m.Status == "ACTIVE", ct),
                organizations = await members.Select(m => m.OrganizationId).Distinct().CountAsync(ct),
            }
        });
    }


    /// <summary>Read-only departure preview. The command rechecks eligibility under locks.</summary>
    internal static async Task<IResult> HandoverPreview(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.SchoolHandoverManage)) throw new KeyNotFoundException();
        var actor = http.UserId();
        var member = await db.OrganizationMemberships.AsNoTracking()
            .Where(m => m.Id == id && m.UserId != actor
                && (m.MembershipType == "SALES" || m.MembershipType == "CHANNEL_SALES"
                    || m.MembershipType == "COLLABORATOR" || m.MembershipType == "PARTNER_COLLABORATOR")
                && (access.All || (access.Organization && access.OrganizationIds.Contains(m.OrganizationId)
                    && m.ManagerUserId == actor)))
            .Select(m => new {
                m.Id, m.UserId, m.OrganizationId, m.Status,
                name = db.Users.Where(u => u.Id == m.UserId).Select(u => u.Name).First(),
                account_status = db.Users.Where(u => u.Id == m.UserId).Select(u => u.Status).First()
            }).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        var now = DateTime.UtcNow;
        var claims = await db.ApproachRegistrations.AsNoTracking()
            .Where(r => r.OwnerUserId == member.UserId && r.OwnerOrganizationId == member.OrganizationId
                && r.Status == "ACTIVE")
            .OrderBy(r => r.CustomerId)
            .Select(r => new {
                r.Id, r.CustomerId, r.ProtectedUntil, r.RegisteredAt,
                school_name = db.ChannelCustomers.Where(c => c.Id == r.CustomerId).Select(c => c.DisplayName).First(),
                has_contract = db.SalesContracts.Any(c => c.ApproachRegistrationId == r.Id
                    && c.Status != "CANCELLED" && c.Status != "REJECTED"),
                next_follow_up_at = db.CustomerActivities.Where(a => a.CustomerId == r.CustomerId
                    && a.UserId == member.UserId && a.NextFollowUpAt != null)
                    .OrderByDescending(a => a.CreatedAt).Select(a => a.NextFollowUpAt).FirstOrDefault()
            }).ToArrayAsync(ct);
        var contractQuery = db.SalesContracts.AsNoTracking()
            .Where(c => c.OwnerUserId == member.UserId && c.OwnerOrganizationId == member.OrganizationId);
        var contractTotal = await contractQuery.CountAsync(ct);
        var contracts = await contractQuery.OrderByDescending(c => c.CreatedAt).Take(100)
            .Select(c => new {
                c.Id, c.ContractCode, c.Status, c.VerifiedAt,
                school_name = db.ChannelCustomers.Where(x => x.Id == c.CustomerId).Select(x => x.DisplayName).First()
            }).ToArrayAsync(ct);
        var handovers = await db.SchoolHandovers.AsNoTracking().Where(h => h.MembershipId == member.Id)
            .OrderByDescending(h => h.CreatedAt).Take(20)
            .Select(h => new { h.Id, h.CreatedAt, h.Reason, h.Summary, h.RevokedRegistrations }).ToArrayAsync(ct);
        return Results.Ok(new {
            member,
            summary = new {
                active_claims = claims.Length,
                revoke_approaches = claims.Count(x => !x.has_contract),
                protected_contract_approaches = claims.Count(x => x.has_contract),
                pending_invitations = await db.SchoolInvitations.CountAsync(x => x.AssigneeUserId == member.UserId
                    && x.OrganizationId == member.OrganizationId && x.Status == "PENDING", ct),
                pending_extensions = await db.SchoolExtensionRequests.CountAsync(x => x.RequestedByUserId == member.UserId
                    && x.OrganizationId == member.OrganizationId && x.Status == "PENDING", ct),
                contracts = contractTotal,
                awaiting_verification = await contractQuery.CountAsync(c => c.Status != "ACTIVE"
                    && c.Status != "CANCELLED" && c.Status != "REJECTED", ct),
                can_handover = member.Status == "ACTIVE"
            },
            claims, contracts, handovers
        });
    }

    /// <summary>Recently revoked and currently available schools, scoped to a direct team.</summary>
    internal static async Task<IResult> ReleasedSchools(HttpContext http, KidsfitDbContext db,
        string? search, int? page, int? page_size, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.SchoolAllocationManage)) throw new KeyNotFoundException();
        var now = DateTime.UtcNow;
        var cutoff = now.AddDays(-30);
        var term = (search ?? "").Trim();
        if (term.Length > 190) throw ApiValidationException.For("search", "Tìm kiếm tối đa 190 ký tự.");
        var revokedCustomers = db.ApproachRegistrations.AsNoTracking()
            .Where(r => r.Status == "REVOKED" && r.UpdatedAt >= cutoff
                && (access.All || (access.Organization && access.OrganizationIds.Contains(r.OwnerOrganizationId)
                    && db.OrganizationMemberships.Any(m => m.UserId == r.OwnerUserId
                        && m.OrganizationId == r.OwnerOrganizationId && m.ManagerUserId == access.UserId))))
            .Select(r => r.CustomerId);
        var available = db.DirectorySchools.AsNoTracking()
            .Where(s => revokedCustomers.Contains(s.CustomerId)
                && !db.CustomerProtections.Any(p => p.CustomerId == s.CustomerId && p.Status == "ACTIVE"
                    && p.EffectiveUntil > now))
            .Where(s => term == "" || s.SchoolCode.Contains(term)
                || db.ChannelCustomers.Any(c => c.Id == s.CustomerId && c.DisplayName.Contains(term)));
        var p = Math.Clamp(page ?? 1, 1, 10000);
        var size = Math.Clamp(page_size ?? 20, 1, 100);
        var total = await available.CountAsync(ct);
        var rows = await available.OrderBy(s => s.SchoolCode).ThenBy(s => s.Id)
            .Skip((p - 1) * size).Take(size).Select(s => new {
                id = s.Id, s.CustomerId, s.SchoolCode,
                school_name = db.ChannelCustomers.Where(c => c.Id == s.CustomerId).Select(c => c.DisplayName).First(),
                released_at = db.ApproachRegistrations.Where(r => r.CustomerId == s.CustomerId
                    && r.Status == "REVOKED" && r.UpdatedAt >= cutoff).Max(r => (DateTime?)r.UpdatedAt)
            }).ToArrayAsync(ct);
        return Results.Ok(new { data = rows, total, page = p, page_size = size });
    }

    internal static async Task<IResult> MyRevisions(HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!access.Has(Permissions.ChannelSalesReportContract)) return Results.Forbid();
        var actor = http.UserId();
        var scoped = access.Contracts(db).AsNoTracking()
            .Where(c => c.RequiresSchoolVerification && c.Status == "NEEDS_REVISION"
                && (c.OwnerUserId == actor || c.ReportedByUserId == actor));
        var rows = await (from contract in scoped
                          join school in db.ChannelCustomers.AsNoTracking() on contract.CustomerId equals school.Id
                          orderby contract.UpdatedAt descending
                          select new
                          {
                              id = contract.Id, contract_code = contract.ContractCode, school_name = school.DisplayName,
                              reason = contract.RevisionReason ?? (from reconciliation in db.ReconciliationCases
                                        join evt in db.ReconciliationEvents on reconciliation.Id equals evt.ReconciliationCaseId
                                        where reconciliation.ContractId == contract.Id && evt.EventType == "MANAGER_REVISION"
                                        orderby evt.CreatedAt descending, evt.Id descending
                                        select evt.Reason).FirstOrDefault(),
                          }).Take(100).ToArrayAsync(ct);
        return Results.Ok(new { data = rows, total = await scoped.CountAsync(ct) });
    }

    internal static async Task<IResult> List(HttpContext http, KidsfitDbContext db,
        string? search, string? status, int? page, int? page_size, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var query = ManagerScope(db, access).AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("ALL", StringComparison.OrdinalIgnoreCase))
        {
            var selected = status.Trim().ToUpperInvariant();
            if (selected is not ("PENDING_REVIEW" or "MANAGER_REVIEWED" or "NEEDS_REVISION" or "PENDING_KIDSFIT" or "ACTIVE" or "CANCELLED" or "DISPUTED"))
                throw ApiValidationException.For("status", "Trạng thái hợp đồng không hợp lệ.");
            query = selected == "DISPUTED"
                ? query.Where(x => db.ReconciliationCases.Any(r => r.ContractId == x.Id && r.Status == "DISPUTED"))
                : query.Where(x => x.Status == selected);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(x => x.ContractCode.Contains(term)
                || db.ChannelCustomers.Any(c => c.Id == x.CustomerId && c.DisplayName.Contains(term))
                || db.Users.Any(u => u.Id == x.OwnerUserId && u.Name.Contains(term)));
        }
        var number = Math.Max(1, page ?? 1);
        var size = Math.Clamp(page_size ?? 20, 1, 100);
        var total = await query.CountAsync(ct);
        var rows = await (from contract in query
                          join school in db.ChannelCustomers.AsNoTracking() on contract.CustomerId equals school.Id
                          join owner in db.Users.AsNoTracking() on contract.OwnerUserId equals owner.Id
                          orderby (contract.Status == "PENDING_REVIEW" ? 0 : contract.Status == "NEEDS_REVISION" ? 1 : 2),
                                  contract.CreatedAt descending, contract.Id descending
                          select new
                          {
                              id = contract.Id,
                              school_name = school.DisplayName,
                              sales_name = owner.Name,
                              contract_code = contract.ContractCode,
                              total_value = contract.TotalValue,
                              status = db.ReconciliationCases.Any(r => r.ContractId == contract.Id && r.Status == "DISPUTED")
                                  ? "DISPUTED" : contract.Status,
                              can_review = contract.Status == "PENDING_REVIEW" && access.Has(Permissions.SchoolContractReview)
                                  && (access.All || access.OrganizationIds.Contains(contract.OwnerOrganizationId)),
                              can_return = (contract.Status == "PENDING_REVIEW" || (contract.Status == "MANAGER_REVIEWED"
                                  && db.ReconciliationCases.Any(r => r.ContractId == contract.Id && r.Status == "DISPUTED")))
                                  && access.Has(Permissions.SchoolContractReview)
                                  && (access.All || access.OrganizationIds.Contains(contract.OwnerOrganizationId)),
                          })
                         .Skip((number - 1) * size).Take(size).ToArrayAsync(ct);
        return Results.Ok(new { data = rows, total, page = number, page_size = size });
    }

    internal static async Task<IResult> Detail(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var scoped = access.Has(Permissions.SchoolContractReview) ? ManagerScope(db, access) : access.Contracts(db);
        var contract = await (from c in scoped.AsNoTracking().Where(x => x.Id == id && x.RequiresSchoolVerification)
                              join customer in db.ChannelCustomers.AsNoTracking() on c.CustomerId equals customer.Id
                              join owner in db.Users.AsNoTracking() on c.OwnerUserId equals owner.Id
                              select new {
                                  id = c.Id, c.ContractCode, c.SignedOn, c.EffectiveOn, c.TotalValue,
                                  c.Status, c.ServicePlan, c.StudentCount, c.BranchCount, c.ContractNote, c.EvidenceReference, c.SchoolUnitIdsJson,
                                  c.ManagerReviewedAt, c.VerifiedAt, c.OwnerUserId, c.OwnerOrganizationId, c.ReportedByUserId,
                                  school_name = customer.DisplayName, school_address = customer.Address,
                                  school_province = customer.Province, sales_name = owner.Name
                              }).SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();

        var feeItems = await db.SalesContractItems.AsNoTracking().Where(x => x.ContractId == id).ToArrayAsync(ct);
        var maintenanceFee = feeItems.FirstOrDefault(x => x.Description.StartsWith("Phí duy trì"))?.UnitPrice;
        var setupFee = feeItems.FirstOrDefault(x => x.Description == "Phí khởi tạo (một lần)")?.UnitPrice ?? 0m;
        var files = await db.FinancialEvidences.AsNoTracking()
            .Where(x => x.ContractId == id && x.Kind == "CONTRACT" && x.AttachedAt != null)
            .OrderByDescending(x => x.AttachedAt)
            .Select(x => new { id = x.Id, file_name = x.FileName, mime_type = x.MimeType, created_at = x.CreatedAt })
            .ToArrayAsync(ct);
        var installments = await db.RevenueSchedules.AsNoTracking().Where(x => x.ContractId == id)
            .OrderBy(x => x.DueOn).Select(x => new { due_on = x.DueOn, amount = x.AmountDue, status = x.Status }).ToArrayAsync(ct);
        var unitIds = JsonSerializer.Deserialize<long[]>(contract.SchoolUnitIdsJson ?? "[]") ?? [];
        var units = await db.SchoolUnits.AsNoTracking().Where(x => unitIds.Contains(x.Id))
            .Select(x => new { id = x.Id, name = x.Name }).ToArrayAsync(ct);
        var history = await (from r in db.ReconciliationCases.AsNoTracking().Where(r => r.ContractId == id)
                             join e in db.ReconciliationEvents.AsNoTracking() on r.Id equals e.ReconciliationCaseId
                             join actor in db.Users.AsNoTracking() on e.ActorUserId equals actor.Id
                             orderby e.CreatedAt, e.Id
                             select new { event_type = e.EventType, reason = e.Reason, created_at = e.CreatedAt, actor_name = actor.Name })
                            .ToArrayAsync(ct);
        return Results.Ok(new {
            data = new {
                contract.id, contract.ContractCode, contract.SignedOn, contract.EffectiveOn,
                contract.TotalValue, contract.Status, contract.ServicePlan, contract.StudentCount, contract.BranchCount,
                contract.ContractNote, maintenance_fee = maintenanceFee, setup_fee = setupFee,
                revision_reason = await db.SalesContracts.Where(x => x.Id == id).Select(x => x.RevisionReason).SingleAsync(ct),
                contract.EvidenceReference, contract.ManagerReviewedAt, contract.VerifiedAt,
                contract.school_name, contract.school_address, contract.school_province, contract.sales_name,
                can_review = contract.Status == "PENDING_REVIEW" && access.Has(Permissions.SchoolContractReview)
                    && (access.All || (access.CanManageOrganization(contract.OwnerOrganizationId)
                        && contract.OwnerUserId != access.UserId)),
                reconciliation_status = await db.ReconciliationCases.Where(r => r.ContractId == id).Select(r => r.Status).FirstOrDefaultAsync(ct),
                can_return = (contract.Status == "PENDING_REVIEW" || (contract.Status == "MANAGER_REVIEWED"
                    && await db.ReconciliationCases.AnyAsync(r => r.ContractId == id && r.Status == "DISPUTED", ct)))
                    && access.Has(Permissions.SchoolContractReview)
                    && access.CanManageOrganization(contract.OwnerOrganizationId),
                can_resubmit = contract.Status == "NEEDS_REVISION" && access.Has(Permissions.ChannelSalesReportContract)
                    && (contract.OwnerUserId == access.UserId || contract.ReportedByUserId == access.UserId
                        || (access.Has(Permissions.SchoolContractReview)
                            && await ManagerScope(db, access).AnyAsync(c => c.Id == id, ct)
                            && await db.OrganizationMemberships.AnyAsync(m => m.UserId == contract.OwnerUserId
                                && m.OrganizationId == contract.OwnerOrganizationId && m.Status == "SUSPENDED", ct)))
            },
            evidence = files, installments, school_units = units, history
        });
    }

    internal static async Task<IResult> ReturnForRevision(long id, ReturnSchoolContractRequest request,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var reason = Validation.Required(request.Reason, "reason", "Vui lòng nhập lý do yêu cầu bổ sung.", 2000);
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var contract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (!access.Has(Permissions.SchoolContractReview)
            || !access.CanManageOrganization(contract.OwnerOrganizationId)
            || !await ManagerScope(db, access).AnyAsync(x => x.Id == id, ct))
            throw new KeyNotFoundException();
        var reconciliation = await db.ReconciliationCases.SingleOrDefaultAsync(x => x.ContractId == id, ct);
        var previousStatus = contract.Status;
        if (contract.Status != "PENDING_REVIEW" && !(contract.Status == "MANAGER_REVIEWED" && reconciliation?.Status == "DISPUTED"))
            throw new ApiConflictException("Chỉ trả bổ sung hồ sơ chờ Quản lý hoặc hồ sơ CHECKEE phản hồi.");
        var now = DateTime.UtcNow;
        contract.Status = "NEEDS_REVISION";
        contract.RevisionReason = reason;
        contract.RevisionRequestedAt = now;
        contract.ManagerReviewedAt = null;
        contract.ManagerReviewedByUserId = null;
        contract.UpdatedAt = now;
        if (reconciliation is not null)
        {
            reconciliation.Status = "AWAITING_MANAGER";
            reconciliation.UpdatedAt = now;
            db.ReconciliationEvents.Add(new ReconciliationEvent { ReconciliationCaseId = reconciliation.Id,
                ActorUserId = http.UserId(), EventType = "MANAGER_REVISION", Reason = reason, CreatedAt = now, UpdatedAt = now });
        }
        Audit.Add(db, http.UserId(), "REQUEST_SCHOOL_CONTRACT_REVISION", nameof(SalesContract), id,
            new { status = previousStatus }, new { contract.Status, reason }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.Ok(new { message = "Đã trả hồ sơ để Sales bổ sung." });
    }

    internal static async Task<IResult> Resubmit(long id, ResubmitSchoolContractRequest request,
        HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var access = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!request.EvidenceId.HasValue) throw ApiValidationException.For("evidence_id", "Cần tải lại file hợp đồng bổ sung.");
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        var contract = await db.SalesContracts.FromSqlInterpolated($"SELECT * FROM sales_contracts WHERE id = {id} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        var managerRecovery = access.Has(Permissions.SchoolContractReview)
            && await ManagerScope(db, access).AnyAsync(x => x.Id == id, ct)
            && await db.OrganizationMemberships.AnyAsync(m => m.UserId == contract.OwnerUserId
                && m.OrganizationId == contract.OwnerOrganizationId && m.Status == "SUSPENDED", ct);
        if (!access.Has(Permissions.ChannelSalesReportContract)
            || !await access.Contracts(db).AnyAsync(x => x.Id == id, ct)
            || (contract.OwnerUserId != http.UserId() && contract.ReportedByUserId != http.UserId() && !managerRecovery))
            throw new KeyNotFoundException();
        if (contract.Status != "NEEDS_REVISION") throw new ApiConflictException("Hợp đồng không ở bước cần bổ sung.");
        var evidence = await db.FinancialEvidences.FromSqlInterpolated($"SELECT * FROM financial_evidences WHERE id = {request.EvidenceId.Value} FOR UPDATE")
            .SingleOrDefaultAsync(ct) ?? throw new KeyNotFoundException();
        if (evidence.Kind != "CONTRACT" || evidence.ContractId.HasValue || evidence.AttachedAt.HasValue
            || evidence.UploadedByUserId != http.UserId()) throw new KeyNotFoundException();
        var now = DateTime.UtcNow;
        var before = new {
            contract.SignedOn, contract.ServicePlan, contract.StudentCount, contract.BranchCount,
            contract.SchoolUnitIdsJson, contract.ContractNote, contract.TotalValue
        };
        if (request.SignedOn.HasValue)
        {
            var registeredAt = await db.ApproachRegistrations.Where(x => x.Id == contract.ApproachRegistrationId)
                .Select(x => x.RegisteredAt).SingleAsync(ct);
            if (request.SignedOn.Value < ChannelSalesValidation.BusinessDate(registeredAt)
                || request.SignedOn.Value > ChannelSalesValidation.BusinessDate(now))
                throw ApiValidationException.For("signed_on", "Ngày ký phải từ ngày đăng ký tiếp cận đến hôm nay.");
            contract.SignedOn = request.SignedOn.Value;
        }
        if (request.ServicePlan is not null)
        {
            var plan = request.ServicePlan.Trim().ToUpperInvariant();
            if (plan is not ("SCHOOL_YEAR" or "MONTHLY_9"))
                throw ApiValidationException.For("service_plan", "Gói thanh toán không hợp lệ.");
            contract.ServicePlan = plan;
        }
        if (request.StudentCount.HasValue)
        {
            if (request.StudentCount.Value is <= 0 or > 100000)
                throw ApiValidationException.For("student_count", "Quy mô học sinh phải từ 1 đến 100.000.");
            contract.StudentCount = request.StudentCount.Value;
        }
        if (request.SchoolUnitIds is not null)
        {
            var units = request.SchoolUnitIds;
            if (units.Length != units.Distinct().Count())
                throw ApiValidationException.For("school_unit_ids", "Danh sách phân hiệu bị trùng.");
            var schoolId = await db.DirectorySchools.Where(x => x.CustomerId == contract.CustomerId)
                .Select(x => (long?)x.Id).SingleOrDefaultAsync(ct);
            if (!schoolId.HasValue || await db.SchoolUnits.CountAsync(x =>
                    x.DirectorySchoolId == schoolId.Value && x.UnitType == "BRANCH"
                    && units.Contains(x.Id), ct) != units.Length)
                throw ApiValidationException.For("school_unit_ids", "Phân hiệu không thuộc trường chính.");
            contract.SchoolUnitIdsJson = JsonSerializer.Serialize(units);
        }
        var selectedUnits = JsonSerializer.Deserialize<long[]>(contract.SchoolUnitIdsJson ?? "[]") ?? [];
        if (request.BranchCount.HasValue)
        {
            if (request.BranchCount.Value < selectedUnits.Length || request.BranchCount.Value > 100000)
                throw ApiValidationException.For("branch_count", "Số phân hiệu phải hợp lệ và không nhỏ hơn số đã chọn.");
            contract.BranchCount = request.BranchCount.Value;
        }
        else if (contract.BranchCount < selectedUnits.Length)
            throw ApiValidationException.For("branch_count", "Số phân hiệu nhỏ hơn số phân hiệu được chọn.");
        if (request.ContractNote is not null)
        {
            if (request.ContractNote.Length > 4000)
                throw ApiValidationException.For("contract_note", "Ghi chú tối đa 4.000 ký tự.");
            contract.ContractNote = request.ContractNote.Trim();
        }
        if (request.MaintenanceFee.HasValue != request.SetupFee.HasValue)
            throw ApiValidationException.For("maintenance_fee", "Cần nhập đủ phí duy trì và phí khởi tạo.");
        if (request.MaintenanceFee.HasValue)
        {
            var maintenance = request.MaintenanceFee.Value;
            var setup = request.SetupFee!.Value;
            ChannelSalesValidation.WholeDong(maintenance, "maintenance_fee", positive: false);
            ChannelSalesValidation.WholeDong(setup, "setup_fee", positive: false);
            decimal updatedTotal;
            try { updatedTotal = checked(maintenance * (contract.ServicePlan == "MONTHLY_9" ? 9 : 1) + setup); }
            catch (OverflowException) { throw ApiValidationException.For("total_value", "Giá trị hợp đồng vượt giới hạn."); }
            if (updatedTotal <= 0) throw ApiValidationException.For("total_value", "Tổng hợp đồng phải lớn hơn 0.");
            if (await db.RevenueReceipts.AnyAsync(x => x.ContractId == id && x.Status == "COMPLETED", ct))
                throw new ApiConflictException("Hợp đồng đã có khoản thu; cần Kế toán điều chỉnh trước khi sửa phí.");
            var items = await db.SalesContractItems.Where(x => x.ContractId == id).ToListAsync(ct);
            if (items.Count == 0) throw new ApiConflictException("Hợp đồng chưa có dòng chi phí.");
            var packageId = items[0].ProductPackageId;
            db.SalesContractItems.RemoveRange(items);
            var qty = contract.ServicePlan == "MONTHLY_9" ? 9 : 1;
            db.SalesContractItems.Add(new SalesContractItem {
                ContractId = id, ProductPackageId = packageId, Description = qty == 9
                    ? "Phí duy trì mỗi tháng (9 tháng)" : "Phí duy trì năm học (9 tháng)",
                Quantity = qty, UnitPrice = maintenance, Amount = maintenance * qty,
                CreatedAt = now, UpdatedAt = now
            });
            if (setup > 0) db.SalesContractItems.Add(new SalesContractItem {
                ContractId = id, ProductPackageId = packageId, Description = "Phí khởi tạo (một lần)",
                Quantity = 1, UnitPrice = setup, Amount = setup, CreatedAt = now, UpdatedAt = now
            });
            var schedules = await db.RevenueSchedules.Where(x => x.ContractId == id).OrderBy(x => x.Id).ToListAsync(ct);
            if (schedules.Count != 1 || schedules[0].AmountReceived > 0)
                throw new ApiConflictException("Lịch thanh toán đã thay đổi; cần Kế toán xử lý trước khi sửa phí.");
            schedules[0].AmountDue = updatedTotal;
            schedules[0].UpdatedAt = now;
            contract.TotalValue = updatedTotal;
        }
        Audit.Add(db, http.UserId(), "EDIT_SCHOOL_CONTRACT_REVISION", nameof(SalesContract), id,
            before, new {
                contract.SignedOn, contract.ServicePlan, contract.StudentCount, contract.BranchCount,
                contract.SchoolUnitIdsJson, contract.ContractNote, contract.TotalValue
            }, http);
        evidence.ContractId = id;
        evidence.AttachedAt = now;
        evidence.UpdatedAt = now;
        contract.Status = "PENDING_REVIEW";
        contract.RevisionReason = null;
        contract.RevisionRequestedAt = null;
        contract.ManagerReviewedAt = null;
        contract.ManagerReviewedByUserId = null;
        contract.UpdatedAt = now;
        var reconciliation = await db.ReconciliationCases.SingleOrDefaultAsync(x => x.ContractId == id, ct);
        if (reconciliation is not null)
        {
            reconciliation.Status = "AWAITING_MANAGER";
            reconciliation.UpdatedAt = now;
            db.ReconciliationEvents.Add(new ReconciliationEvent { ReconciliationCaseId = reconciliation.Id,
                ActorUserId = http.UserId(), EventType = managerRecovery ? "MANAGER_RESUBMITTED" : "SALES_RESUBMITTED", CreatedAt = now, UpdatedAt = now });
        }
        Audit.Add(db, http.UserId(), "RESUBMIT_SCHOOL_CONTRACT", nameof(SalesContract), id,
            new { status = "NEEDS_REVISION" }, new { contract.Status, evidence_id = evidence.Id }, http);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Results.Ok(new { message = "Đã bổ sung hợp đồng, chuyển lại Quản lý kiểm tra." });
    }
}

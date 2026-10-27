using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Features;

public static class SchoolOperationsEndpoints
{
    public static void MapSchoolOperations(this RouteGroupBuilder group)
    {
        group.MapGet("/school-operations", WorkspacePage).RequireAuthorization(Permissions.ChannelSalesView);
        group.MapGet("/school-operations/report", Report).RequireAuthorization(Permissions.ChannelSalesView);
        group.MapGet("/school-operations/{kind}/{id:long}/history", History).RequireAuthorization(Permissions.ChannelSalesView);
        group.MapGet("/school-proposals/{id:long}/revisions", ProposalRevisions).RequireAuthorization(Permissions.SchoolDirectoryManage);
        group.MapGet("/school-units/{id:long}/history", UnitHistory).RequireAuthorization(Permissions.SchoolDirectoryManage);
        group.MapGet("/schools/{id:long}/rights", Rights).RequireAuthorization(Permissions.ChannelSalesView);
        group.MapPost("/school-proposals", async (CreateSchoolProposalRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.SubmitSchoolProposal(request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.SchoolProposalSubmit);
        group.MapPost("/school-proposals/{id:long}/manager-review", async (long id, ReviewSchoolProposalRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.ReviewSchoolProposal(id, request, false, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.ChannelSalesView);
        group.MapPatch("/school-proposals/{id:long}", async (long id, UpdateSchoolProposalRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.UpdateSchoolProposal(id, request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.SchoolDirectoryManage);
        group.MapPost("/school-proposals/{id:long}/admin-review", async (long id, ReviewSchoolProposalRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.ReviewSchoolProposal(id, request, true, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.SchoolDirectoryManage);
        group.MapPost("/school-invitations", async (CreateSchoolInvitationRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.InviteSchoolCollaborator(request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.SchoolAllocationManage);
        group.MapPost("/school-invitations/{id:long}/respond", async (long id, RespondSchoolInvitationRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.RespondSchoolInvitation(id, request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.ChannelSalesRegister);
        group.MapPost("/school-invitations/{id:long}/cancel", async (long id, ReconcileContractRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.CancelSchoolInvitation(id, request.Reason, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.SchoolAllocationManage);
        group.MapPost("/approaches/{id:long}/extension-requests", async (long id, RequestSchoolExtensionRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.RequestSchoolExtension(id, request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.ChannelSalesRegister);
        group.MapPost("/school-extensions/{id:long}/review", async (long id, ReviewSchoolExtensionRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.ReviewSchoolExtension(id, request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.ChannelSalesView);
        group.MapPost("/school-disputes", async (CreateSchoolDisputeRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.OpenSchoolDispute(request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.ChannelSalesView);
        group.MapPost("/school-disputes/{id:long}/resolve", async (long id, ResolveSchoolDisputeRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.ResolveSchoolDispute(id, request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.SchoolDisputeResolve);
        group.MapPost("/school-deferrals", async (DeferSchoolRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.DeferSchool(request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.SchoolAllocationManage);
        group.MapPost("/school-deferrals/{id:long}/complete", async (long id, ReconcileContractRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.CompleteSchoolDeferral(id, request.Reason, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.SchoolAllocationManage);
        group.MapPost("/school-handovers/{id:long}", async (long id, CompleteSchoolHandoverRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.CompleteSchoolHandover(id, request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.SchoolHandoverManage);
        group.MapPost("/school-team/{id:long}/reactivate", async (long id, ReactivateSchoolMembershipRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.ReactivateSchoolMembership(id, request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.SchoolHandoverManage);
        group.MapPatch("/school-units/{id:long}", async (long id, UpdateSchoolUnitRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.UpdateSchoolUnit(id, request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.SchoolDirectoryManage);
        group.MapPost("/school-workflow-policies", async (CreateSchoolWorkflowPolicyRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.CreateSchoolWorkflowPolicy(request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.SchoolWorkflowPolicyManage);
        group.MapPost("/contracts/{id:long}/care-handover", async (long id, AssignContractCareRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.AssignContractCare(id, request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.SchoolCareAssign);
        group.MapPost("/customer-support-cases", async (CreateCustomerSupportCaseRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.CreateCustomerSupportCase(request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.SchoolSupportManage);
        group.MapPost("/customer-support-cases/{id:long}/progress", async (long id, UpdateCustomerSupportCaseRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.UpdateCustomerSupportCase(id, request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.SchoolSupportManage);
        group.MapPost("/contracts/{id:long}/cancel", async (long id, CancelSalesContractRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.CancelSalesContract(id, request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.ChannelSalesContractCancel);
        group.MapPost("/receipts/{id:long}/refunds", async (long id, RecordRevenueRefundRequest request, HttpContext h, ChannelSalesActions a, CancellationToken ct) => Saved(await a.RecordRevenueRefund(id, request, h.UserId(), h, ct)))
            .RequireAuthorization(Permissions.ChannelSalesRevenueRefund);
    }

    private static IResult Saved(long id) => Results.Ok(new { data = new { id }, message = "Đã ghi nhận thay đổi." });

    private static IQueryable<SchoolProposal> Proposals(KidsfitDbContext db, ChannelSalesAccess a) => db.SchoolProposals.Where(x => a.All
        || (a.OrganizationIds.Contains(x.OrganizationId) && (x.SubmittedByUserId == a.UserId || (a.Has(Permissions.SchoolProposalReview) && x.ManagerUserId == a.UserId))));
    private static IQueryable<SchoolInvitation> Invitations(KidsfitDbContext db, ChannelSalesAccess a) => db.SchoolInvitations.Where(x => a.All
        || (a.OrganizationIds.Contains(x.OrganizationId) && (x.AssigneeUserId == a.UserId || (a.Organization && a.Has(Permissions.SchoolAllocationManage)))));
    private static IQueryable<SchoolExtensionRequest> Extensions(KidsfitDbContext db, ChannelSalesAccess a) => db.SchoolExtensionRequests.Where(x => a.All
        || (a.OrganizationIds.Contains(x.OrganizationId) && (x.RequestedByUserId == a.UserId || (a.Has(Permissions.SchoolExtensionReview) && x.ManagerUserId == a.UserId))));
    private static IQueryable<SchoolDispute> Disputes(KidsfitDbContext db, ChannelSalesAccess a) => db.SchoolDisputes.Where(x => a.All
        || (a.OrganizationIds.Contains(x.OrganizationId) && (x.OpenedByUserId == a.UserId || (a.Organization && a.Has(Permissions.SchoolAllocationManage)))));
    private static IQueryable<CustomerSupportCase> SupportCases(KidsfitDbContext db, ChannelSalesAccess a) => db.CustomerSupportCases.Where(x => a.All
        || (a.Has(Permissions.SchoolSupportManage) && db.SalesContracts.Any(c => c.Id == x.ContractId && c.CareUserId == a.UserId && c.CareOrganizationId.HasValue && a.OrganizationIds.Contains(c.CareOrganizationId.Value)))
        || (a.Has(Permissions.SchoolCareAssign) && a.Organization && (a.OrganizationIds.Contains(x.OrganizationId) || db.SalesContracts.Any(c => c.Id == x.ContractId && a.OrganizationIds.Contains(c.OwnerOrganizationId)))));

    public static Task<IResult> Workspace(HttpContext http, KidsfitDbContext db, CancellationToken ct) => WorkspacePage(http, db, null, null, ct);

    public static async Task<IResult> WorkspacePage(HttpContext http, KidsfitDbContext db, int? page, string? search, CancellationToken ct)
    {
        var a = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (a.OrganizationIds.Length == 0) throw new KeyNotFoundException();
        var now = DateTime.UtcNow;
        var organizations = db.Organizations.Where(x => x.Status == "ACTIVE" && (a.All || a.OrganizationIds.Contains(x.Id)));
        var contractIds = a.Contracts(db).Select(x => x.Id);
        var canMoney = a.Has(Permissions.ChannelSalesCommissionView) || a.Has(Permissions.ChannelSalesRecordRevenue);
        var canTeam = a.Has(Permissions.SchoolAllocationManage) || a.Has(Permissions.SchoolHandoverManage) || a.Has(Permissions.SchoolCareAssign);
        const int pageSize = 100;
        var selectedPage = Math.Clamp(page ?? 1, 1, 10000);
        var skip = (selectedPage - 1) * pageSize;
        var term = search?.Trim() ?? "";
        if (term.Length > 190) throw ApiValidationException.For("search", "Từ khóa tối đa 190 ký tự.");
        var matchingSchools = db.DirectorySchools.Where(s => s.SchoolCode.Contains(term)
            || db.SchoolUnits.Any(u => u.DirectorySchoolId == s.Id && (u.Name.Contains(term) || u.Province.Contains(term) || u.Ward.Contains(term)))).Select(s => s.Id);
        var matchingCustomers = db.ChannelCustomers.Where(c => c.DisplayName.Contains(term) || db.DirectorySchools.Any(s => s.CustomerId == c.Id && matchingSchools.Contains(s.Id))).Select(c => c.Id);
        var proposalQuery = Proposals(db, a).AsNoTracking().Where(x => term == "" || x.Name.Contains(term) || x.SchoolCode.Contains(term) || x.Reason.Contains(term));
        var invitationQuery = Invitations(db, a).AsNoTracking().Where(x => term == "" || matchingSchools.Contains(x.DirectorySchoolId) || x.Reason.Contains(term));
        var extensionQuery = Extensions(db, a).AsNoTracking().Where(x => term == "" || x.Progress.Contains(term) || db.ApproachRegistrations.Any(r => r.Id == x.ApproachRegistrationId && matchingCustomers.Contains(r.CustomerId)));
        var disputeQuery = Disputes(db, a).AsNoTracking().Where(x => term == "" || matchingCustomers.Contains(x.CustomerId) || x.Reason.Contains(term));
        var deferralQuery = db.SchoolDeferrals.AsNoTracking().Where(x => a.All || (a.Has(Permissions.SchoolAllocationManage) && a.Organization && a.OrganizationIds.Contains(x.OrganizationId)))
            .Where(x => term == "" || matchingSchools.Contains(x.DirectorySchoolId) || x.Reason.Contains(term));
        var handoverQuery = db.SchoolHandovers.AsNoTracking().Where(x => a.All || (a.Has(Permissions.SchoolHandoverManage) && a.Organization && a.OrganizationIds.Contains(x.OrganizationId)))
            .Where(x => term == "" || x.Reason.Contains(term) || x.Summary.Contains(term) || db.Users.Any(u => u.Id == x.UserId && u.Name.Contains(term)));
        var supportQuery = SupportCases(db, a).AsNoTracking().Where(x => term == "" || x.Subject.Contains(term) || x.Description.Contains(term) || db.ChannelCustomers.Any(c => c.Id == x.CustomerId && c.DisplayName.Contains(term)));
        var contractQuery = a.Contracts(db).AsNoTracking().Where(x => term == "" || x.ContractCode.Contains(term) || db.ChannelCustomers.Any(c => c.Id == x.CustomerId && c.DisplayName.Contains(term)));
        var receiptQuery = db.RevenueReceipts.AsNoTracking().Where(x => canMoney && contractIds.Contains(x.ContractId))
            .Where(x => term == "" || x.ReferenceCode.Contains(term) || db.SalesContracts.Any(c => c.Id == x.ContractId && (c.ContractCode.Contains(term) || matchingCustomers.Contains(c.CustomerId))));
        var refundQuery = db.RevenueRefunds.AsNoTracking().Where(x => canMoney && contractIds.Contains(x.ContractId))
            .Where(x => term == "" || x.ReferenceCode.Contains(term) || x.Reason.Contains(term) || db.SalesContracts.Any(c => c.Id == x.ContractId && (c.ContractCode.Contains(term) || matchingCustomers.Contains(c.CustomerId))));

        return Results.Ok(new
        {
            server_time = now, user_id = a.UserId,
            pagination = new { page = selectedPage, page_size = pageSize, totals = new {
                proposals = await proposalQuery.CountAsync(ct),
                invitations = Math.Max(await invitationQuery.CountAsync(ct), await deferralQuery.CountAsync(ct)),
                extensions = await extensionQuery.CountAsync(ct), disputes = await disputeQuery.CountAsync(ct),
                care = Math.Max(await supportQuery.CountAsync(ct), await contractQuery.CountAsync(ct)),
                handovers = await handoverQuery.CountAsync(ct),
                finance = Math.Max(await contractQuery.CountAsync(ct), Math.Max(await receiptQuery.CountAsync(ct), await refundQuery.CountAsync(ct))),
            } },
            organizations = await organizations.Select(x => new { x.Id, x.Name }).ToArrayAsync(ct),
            proposals = await proposalQuery.OrderByDescending(x => x.Status == "PENDING_MANAGER" || x.Status == "PENDING_ADMIN").ThenBy(x => x.Status == "PENDING_MANAGER" || x.Status == "PENDING_ADMIN" ? x.ReviewDueAt : DateTime.MaxValue).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).Skip(skip).Take(pageSize).Select(x => new
            {
                x.Id, x.OrganizationId, x.SchoolCode, x.Name, x.Province, x.Ward, x.Address, x.ContactName, x.ContactPosition, x.ContactPhone, x.Email,
                x.Reason, x.Status, x.ManagerUserId, x.SubmittedByUserId, x.ReviewDueAt, x.DecisionReason, x.DirectorySchoolId,
                submitted_by = db.Users.Where(u => u.Id == x.SubmittedByUserId).Select(u => u.Name).First(),
                manager_name = db.Users.Where(u => u.Id == x.ManagerUserId).Select(u => u.Name).First(),
                possible_duplicate = db.SchoolUnits.Any(u => u.UnitType == "MAIN" && (x.DirectorySchoolId == null || u.DirectorySchoolId != x.DirectorySchoolId) && u.Name == x.Name && u.Province == x.Province && u.Ward == x.Ward),
                is_overdue = (x.Status == "PENDING_MANAGER" || x.Status == "PENDING_ADMIN") && x.ReviewDueAt <= now,
                can_manager_review = x.Status == "PENDING_MANAGER" && x.SubmittedByUserId != a.UserId
                    && ((a.Has(Permissions.SchoolProposalReview) && (a.All || (a.Organization && x.ManagerUserId == a.UserId && a.OrganizationIds.Contains(x.OrganizationId))))
                        || (a.Has(Permissions.SchoolEscalationResolve) && x.ReviewDueAt <= now && (a.All || a.OrganizationIds.Contains(x.OrganizationId)))),
                can_admin_review = x.Status == "PENDING_ADMIN" && a.Has(Permissions.SchoolDirectoryManage),
            }).ToArrayAsync(ct),
            invitations = await invitationQuery.OrderByDescending(x => x.Status == "PENDING" && x.RespondBy > now).ThenBy(x => x.Status == "PENDING" && x.RespondBy > now ? x.RespondBy : DateTime.MaxValue).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).Skip(skip).Take(pageSize).Select(x => new
            {
                x.Id, x.DirectorySchoolId, x.OrganizationId, x.AssigneeUserId, x.AssignedByUserId, x.Status, x.RespondBy, x.RespondedAt, x.Reason, x.ResponseReason, x.ApproachRegistrationId,
                school_name = db.SchoolUnits.Where(u => u.DirectorySchoolId == x.DirectorySchoolId && u.UnitType == "MAIN").Select(u => u.Name).First(),
                assigned_by = db.Users.Where(u => u.Id == x.AssignedByUserId).Select(u => u.Name).First(),
                assignee_name = db.Users.Where(u => u.Id == x.AssigneeUserId).Select(u => u.Name).First(),
                is_expired = x.Status == "PENDING" && x.RespondBy <= now,
                can_respond = x.Status == "PENDING" && x.RespondBy > now && x.AssigneeUserId == a.UserId && a.Has(Permissions.ChannelSalesRegister),
                can_cancel = x.Status == "PENDING" && a.Has(Permissions.SchoolAllocationManage) && (a.All || (a.Organization && a.OrganizationIds.Contains(x.OrganizationId))),
            }).ToArrayAsync(ct),
            extensions = await extensionQuery.OrderByDescending(x => x.Status == "PENDING").ThenBy(x => x.Status == "PENDING" ? x.ReviewDueAt : DateTime.MaxValue).ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).Skip(skip).Take(pageSize).Select(x => new
            {
                x.Id, x.ApproachRegistrationId, x.OrganizationId, x.Status, x.RequestedByUserId, x.ManagerUserId, x.RequestedUntil, x.OriginalProtectedUntil,
                x.ReviewDueAt, x.NextAppointmentAt, x.Progress, x.EvidenceReference, x.ApprovedUntil, x.NextReviewAt, x.DecisionReason, x.PolicyVersionId,
                school_name = db.ChannelCustomers.Where(c => db.ApproachRegistrations.Any(r => r.Id == x.ApproachRegistrationId && r.CustomerId == c.Id)).Select(c => c.DisplayName).First(),
                requested_by = db.Users.Where(u => u.Id == x.RequestedByUserId).Select(u => u.Name).First(),
                is_overdue = x.Status == "PENDING" && x.ReviewDueAt <= now,
                is_expired = x.Status == "PENDING" && x.OriginalProtectedUntil <= now,
                can_review = x.Status == "PENDING" && x.RequestedByUserId != a.UserId && (a.All || (a.Organization && a.OrganizationIds.Contains(x.OrganizationId)))
                    && ((a.Has(Permissions.SchoolExtensionReview) && (x.ManagerUserId == a.UserId || a.All)) || (a.Has(Permissions.SchoolEscalationResolve) && x.ReviewDueAt <= now)),
            }).ToArrayAsync(ct),
            disputes = await disputeQuery.OrderByDescending(x => x.Status == "OPEN").ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).Skip(skip).Take(pageSize).Select(x => new
            {
                x.Id, x.CustomerId, x.OrganizationId, x.Reason, x.EvidenceReference, x.Status, x.Decision, x.DecisionReason, x.ResolvedAt,
                school_name = db.ChannelCustomers.Where(c => c.Id == x.CustomerId).Select(c => c.DisplayName).First(),
                opened_by = db.Users.Where(u => u.Id == x.OpenedByUserId).Select(u => u.Name).First(),
                can_resolve = x.Status == "OPEN" && a.Has(Permissions.SchoolDisputeResolve) && (a.All || (a.Organization && a.OrganizationIds.Contains(x.OrganizationId))),
            }).ToArrayAsync(ct),
            deferrals = await deferralQuery.OrderByDescending(x => x.Status == "OPEN").ThenBy(x => x.ReviewAt).ThenByDescending(x => x.Id).Skip(skip).Take(pageSize).Select(x => new { x.Id, x.DirectorySchoolId, x.OrganizationId, x.Reason, x.ReviewAt, x.Status,
                    school_name = db.SchoolUnits.Where(u => u.DirectorySchoolId == x.DirectorySchoolId && u.UnitType == "MAIN").Select(u => u.Name).First(),
                    can_complete = x.Status == "OPEN" && a.Has(Permissions.SchoolAllocationManage) }).ToArrayAsync(ct),
            handovers = await handoverQuery.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).Skip(skip).Take(pageSize).Select(x => new { x.Id, x.MembershipId, x.UserId, x.Reason, x.Summary, x.RevokedRegistrations, x.AccountSuspended, x.CreatedAt,
                    user_name = db.Users.Where(u => u.Id == x.UserId).Select(u => u.Name).First() }).ToArrayAsync(ct),
            support_cases = await supportQuery.OrderByDescending(x => x.Status != "RESOLVED").ThenByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).Skip(skip).Take(pageSize).Select(x => new
            {
                x.Id, x.ContractId, x.CustomerId, x.AssignedUserId, x.Subject, x.Description, x.Status, x.Outcome, x.ResolvedAt,
                customer_name = db.ChannelCustomers.Where(c => c.Id == x.CustomerId).Select(c => c.DisplayName).First(),
                assigned_name = db.Users.Where(u => u.Id == x.AssignedUserId).Select(u => u.Name).First(),
                can_update = x.Status != "RESOLVED" && a.Has(Permissions.SchoolSupportManage) && (a.All || db.SalesContracts.Any(c => c.Id == x.ContractId && c.CareUserId == a.UserId && c.CareOrganizationId.HasValue && a.OrganizationIds.Contains(c.CareOrganizationId.Value))),
                activities = db.CustomerActivities.Where(t => t.SupportCaseId == x.Id).OrderBy(t => t.CreatedAt).Select(t => new { t.Id, t.Content, t.OccurredAt, t.NextFollowUpAt }).ToArray(),
            }).ToArrayAsync(ct),
            team = await (from m in db.OrganizationMemberships join u in db.Users on m.UserId equals u.Id
                          where canTeam && (a.All || (a.Organization && a.OrganizationIds.Contains(m.OrganizationId)))
                          orderby u.Name select new { m.Id, m.UserId, m.OrganizationId, m.MembershipType, m.Status, u.Name, account_status = u.Status,
                              can_reactivate = (m.Status == "SUSPENDED" || u.Status == "SUSPENDED") && m.UserId != a.UserId && a.Has(Permissions.SchoolHandoverManage)
                                  && (a.All || (a.Organization && a.OrganizationIds.Contains(m.OrganizationId))) && (a.Has(Permissions.ChannelSalesIdentityManage) || m.MembershipType == "COLLABORATOR" || m.MembershipType == "PARTNER_COLLABORATOR")
                                  && (u.Status == "ACTIVE" || (a.All && a.Has(Permissions.ChannelSalesIdentityManage))),
                              can_receive_school = m.Status == "ACTIVE" && u.Status == "ACTIVE" && db.UserRoles.Any(ur => ur.UserId == u.Id
                                  && db.PermissionRoles.Any(pr => pr.RoleId == ur.RoleId && db.Permissions.Any(p => p.Id == pr.PermissionId && p.Code == Permissions.ChannelSalesRegister))),
                              can_receive_care = m.Status == "ACTIVE" && u.Status == "ACTIVE" && db.UserRoles.Any(ur => ur.UserId == u.Id
                                  && db.PermissionRoles.Any(pr => pr.RoleId == ur.RoleId && db.Permissions.Any(p => p.Id == pr.PermissionId && p.Code == Permissions.SchoolSupportManage))),
                              can_handover = m.UserId != a.UserId && a.Has(Permissions.SchoolHandoverManage) && (a.Has(Permissions.ChannelSalesIdentityManage) || m.MembershipType == "COLLABORATOR" || m.MembershipType == "PARTNER_COLLABORATOR") }).Take(200).ToArrayAsync(ct),
            contracts = await contractQuery.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id).Skip(skip).Take(pageSize).Select(x => new { x.Id, x.ContractCode, x.CustomerId, x.Status, x.CareUserId, x.CareOrganizationId, x.VerifiedAt,
                care_name = db.Users.Where(u => u.Id == x.CareUserId).Select(u => u.Name).FirstOrDefault(),
                can_create_support = x.Status == "ACTIVE" && x.CareUserId.HasValue && x.CareOrganizationId.HasValue && a.Has(Permissions.SchoolSupportManage)
                    && (a.All || (x.CareUserId == a.UserId && a.OrganizationIds.Contains(x.CareOrganizationId.Value))),
                customer_name = db.ChannelCustomers.Where(c => c.Id == x.CustomerId).Select(c => c.DisplayName).First(),
                can_assign_care = (x.Status == "ACTIVE" || (x.Status == "CANCELLED" && db.ContractCancellations.Any(c => c.ContractId == x.Id && c.PreviousStatus == "ACTIVE")))
                    && (!x.RequiresSchoolVerification || x.VerifiedAt != null) && a.Has(Permissions.SchoolCareAssign) && (a.All || (a.Organization && (a.OrganizationIds.Contains(x.OwnerOrganizationId) || (x.CareOrganizationId.HasValue && a.OrganizationIds.Contains(x.CareOrganizationId.Value))))),
                can_cancel = x.Status != "CANCELLED" && x.Status != "REJECTED" && a.Has(Permissions.ChannelSalesContractCancel) && (a.All || (a.Organization && a.OrganizationIds.Contains(x.OwnerOrganizationId))) }).ToArrayAsync(ct),
            policies = await db.SchoolWorkflowPolicies.AsNoTracking().Where(x => a.All || a.OrganizationIds.Contains(x.OrganizationId)).OrderByDescending(x => x.CreatedAt).Take(100)
                .Select(x => new { x.Id, x.OrganizationId, x.Version, x.Status, x.ManagerReviewHours, x.AdminReviewHours, x.InvitationHours, x.MaxExtensionDays, x.MaxExtensionCount, x.MaxTotalExtensionDays, x.DecisionReference }).ToArrayAsync(ct),
            receipts = await receiptQuery.OrderByDescending(x => x.ReceivedAt).ThenByDescending(x => x.Id).Skip(skip).Take(pageSize)
                .Select(x => new { x.Id, x.ContractId, x.ReferenceCode, x.Amount, x.ReceivedAt,
                    contract_code = db.SalesContracts.Where(c => c.Id == x.ContractId).Select(c => c.ContractCode).First(),
                    refunded = db.RevenueRefunds.Where(r => r.RevenueReceiptId == x.Id).Sum(r => (decimal?)r.Amount) ?? 0 }).ToArrayAsync(ct),
            refunds = await refundQuery.OrderByDescending(x => x.RefundedAt).ThenByDescending(x => x.Id).Skip(skip).Take(pageSize)
                .Select(x => new { x.Id, x.ContractId, x.RevenueReceiptId, x.Amount, x.RefundedAt, x.ReferenceCode, x.Reason, x.DecisionReference }).ToArrayAsync(ct),
            imports = await db.SchoolImportBatches.AsNoTracking().Where(x => a.All && a.Has(Permissions.SchoolDirectoryManage)).OrderByDescending(x => x.CreatedAt).Take(50)
                .Select(x => new { x.Id, x.CreatedAt, x.SchoolsCreated, x.UnitsCreated, actor_name = db.Users.Where(u => u.Id == x.ActorUserId).Select(u => u.Name).First() }).ToArrayAsync(ct),
        });
    }

    private static async Task<IResult> ProposalRevisions(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var a = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!a.All || !a.Has(Permissions.SchoolDirectoryManage)
            || !await db.Organizations.AnyAsync(x => x.Code == "KIDSFIT" && x.Status == "ACTIVE" && a.OrganizationIds.Contains(x.Id), ct))
            throw new KeyNotFoundException();
        if (!await db.SchoolProposals.AnyAsync(x => x.Id == id, ct)) throw new KeyNotFoundException();
        var data = await db.SchoolProposalRevisions.AsNoTracking().Where(x => x.SchoolProposalId == id)
            .OrderByDescending(x => x.Version).Take(100)
            .Select(x => new { x.Id, x.Version, x.Reason, x.BeforeValues, x.AfterValues, x.CreatedAt,
                x.ActorUserId, actor_name = db.Users.Where(u => u.Id == x.ActorUserId).Select(u => u.Name).First() })
            .ToArrayAsync(ct);
        return Results.Ok(new { data });
    }

    private static async Task<IResult> UnitHistory(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var a = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!a.All || !a.Has(Permissions.SchoolDirectoryManage) || !await db.Organizations.AnyAsync(x => x.Code == "KIDSFIT" && a.OrganizationIds.Contains(x.Id), ct)) throw new KeyNotFoundException();
        return Results.Ok(new { data = await db.SchoolUnitRevisions.AsNoTracking().Where(x => x.SchoolUnitId == id).OrderByDescending(x => x.Version).Take(100)
            .Select(x => new { x.Id, x.Version, x.Reason, x.BeforeValues, x.AfterValues, x.CreatedAt, actor_name = db.Users.Where(u => u.Id == x.ActorUserId).Select(u => u.Name).First() }).ToArrayAsync(ct) });
    }

    private static async Task<IResult> History(string kind, long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var a = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        var entity = kind switch
        {
            "proposal" when await Proposals(db, a).AnyAsync(x => x.Id == id, ct) => nameof(SchoolProposal),
            "invitation" when await Invitations(db, a).AnyAsync(x => x.Id == id, ct) => nameof(SchoolInvitation),
            "extension" when await Extensions(db, a).AnyAsync(x => x.Id == id, ct) => nameof(SchoolExtensionRequest),
            "dispute" when await Disputes(db, a).AnyAsync(x => x.Id == id, ct) => nameof(SchoolDispute),
            "support" when await SupportCases(db, a).AnyAsync(x => x.Id == id, ct) => nameof(CustomerSupportCase),
            _ => throw new KeyNotFoundException(),
        };
        return Results.Ok(new { data = await (from e in db.AuditLogs.AsNoTracking() join u in db.Users on e.UserId equals u.Id
            where e.EntityType == entity && e.EntityId == id orderby e.CreatedAt, e.Id
            select new { e.Id, e.Action, e.CreatedAt, e.OldValues, e.NewValues, actor_name = u.Name }).Take(100).ToArrayAsync(ct) });
    }

    private static async Task<IResult> Rights(long id, HttpContext http, KidsfitDbContext db, CancellationToken ct)
    {
        var a = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (a.OrganizationIds.Length == 0) throw new KeyNotFoundException();
        var school = await db.DirectorySchools.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException();
        if (!a.Has(Permissions.ChannelSalesRegister) && !a.All && !await a.Customers(db).AnyAsync(x => x.Id == school.CustomerId, ct)) throw new KeyNotFoundException();
        var now = DateTime.UtcNow;
        return Results.Ok(new { data = await db.ApproachRegistrations.AsNoTracking().Where(x => x.CustomerId == school.CustomerId).OrderByDescending(x => x.RegisteredAt).Take(100)
            .Select(x => new { id = a.All || (a.OrganizationIds.Contains(x.OwnerOrganizationId) && (a.Organization || x.OwnerUserId == a.UserId)) ? (long?)x.Id : null,
                owner_name = a.All || (a.OrganizationIds.Contains(x.OwnerOrganizationId) && (a.Organization || x.OwnerUserId == a.UserId)) ? db.Users.Where(u => u.Id == x.OwnerUserId).Select(u => u.Name).First() : "Nhân sự khác",
                x.RegisteredAt, x.ProtectedUntil, status = x.Status == "ACTIVE" && x.ProtectedUntil <= now ? "EXPIRED" : x.Status }).ToArrayAsync(ct),
            allocations = await Invitations(db, a).Where(x => x.DirectorySchoolId == id).OrderByDescending(x => x.CreatedAt).Take(100)
                .Select(x => new { x.Id, x.Status, x.Reason, x.ResponseReason, x.RespondBy, x.CreatedAt,
                    assigned_by = db.Users.Where(u => u.Id == x.AssignedByUserId).Select(u => u.Name).First(), assignee_name = db.Users.Where(u => u.Id == x.AssigneeUserId).Select(u => u.Name).First() }).ToArrayAsync(ct) });
    }

    public static async Task<IResult> Report(HttpContext http, KidsfitDbContext db, string? period, CancellationToken ct)
    {
        var a = await ChannelSalesAccess.Load(db, http.UserId(), ct);
        if (!a.Has(Permissions.SchoolAllocationManage) && !a.Has(Permissions.SchoolEscalationResolve) && !a.Has(Permissions.SchoolDisputeResolve)) throw new KeyNotFoundException();
        var selected = ChannelSalesValidation.Period(period ?? ChannelSalesValidation.BusinessPeriod(DateTime.UtcNow));
        var start = DateTime.SpecifyKind(DateTime.ParseExact(selected + "-01", "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture).AddHours(-7), DateTimeKind.Utc);
        var end = start.AddMonths(1); var now = DateTime.UtcNow;
        var registrations = db.ApproachRegistrations.Where(x => a.All || (a.Organization && a.OrganizationIds.Contains(x.OwnerOrganizationId)));
        var contracts = a.Contracts(db); var contractIds = contracts.Select(x => x.Id);
        var revenue = await db.RevenueReceipts.Where(x => contractIds.Contains(x.ContractId) && x.Status == "COMPLETED" && x.ReceivedAt >= start && x.ReceivedAt < end).SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
        var refunded = await db.RevenueRefunds.Where(x => contractIds.Contains(x.ContractId) && x.RefundedAt >= start && x.RefundedAt < end).SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
        var canMoney = a.Has(Permissions.ChannelSalesCommissionView);
        return Results.Ok(new
        {
            period = selected, server_time = now,
            available_schools = await db.DirectorySchools.CountAsync(s => !db.CustomerProtections.Any(p => p.CustomerId == s.CustomerId && p.Status == "ACTIVE" && p.EffectiveUntil > now), ct),
            expired_approaches = await registrations.CountAsync(x => x.ProtectedUntil <= now && x.RegisteredAt >= start && x.RegisteredAt < end && (x.Status == "ACTIVE" || x.Status == "EXPIRED"), ct),
            active_contracts = await contracts.CountAsync(x => x.Status == "ACTIVE", ct),
            collected_revenue = canMoney ? (decimal?)revenue : null, refunded_revenue = canMoney ? (decimal?)refunded : null, net_collected_revenue = canMoney ? (decimal?)(revenue - refunded) : null,
            overdue_proposals = await Proposals(db, a).CountAsync(x => (x.Status == "PENDING_MANAGER" || x.Status == "PENDING_ADMIN") && x.ReviewDueAt <= now, ct),
            overdue_extensions = await Extensions(db, a).CountAsync(x => x.Status == "PENDING" && x.ReviewDueAt <= now, ct),
            allocation_performance = await Invitations(db, a).Where(x => x.CreatedAt >= start && x.CreatedAt < end)
                .GroupBy(x => new { x.AssignedByUserId, x.AssigneeUserId }).Select(g => new
                {
                    g.Key.AssignedByUserId, g.Key.AssigneeUserId,
                    manager_name = db.Users.Where(u => u.Id == g.Key.AssignedByUserId).Select(u => u.Name).First(),
                    assignee_name = db.Users.Where(u => u.Id == g.Key.AssigneeUserId).Select(u => u.Name).First(),
                    invited = g.Count(), accepted = g.Count(x => x.Status == "ACCEPTED"), declined = g.Count(x => x.Status == "DECLINED"), cancelled = g.Count(x => x.Status == "CANCELLED"),
                }).Take(200).ToArrayAsync(ct),
        });
    }
}

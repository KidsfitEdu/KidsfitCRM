using KidsfitCRM.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Infrastructure;

/// <summary>Additional synthetic CRM scenarios. Invoked only by the explicit --seed-demo path.</summary>
internal static class CrmScenarioSeeder
{
    public static async Task SeedAsync(KidsfitDbContext db, DateTime now)
    {
        var kidsfit = await db.Organizations.SingleAsync(x => x.Code == "KIDSFIT");
        var partner = await db.Organizations.SingleAsync(x => x.Code == "PARTNER_AN_PHAT");
        var manager = await db.Users.SingleAsync(x => x.Code == "MANAGER001");
        var sales = await db.Users.SingleAsync(x => x.Code == "SALES001");
        var ctv = await db.Users.SingleAsync(x => x.Code == "CTV001");
        var partnerManager = await db.Users.SingleAsync(x => x.Code == "PARTNER001");

        // The Admin policy table needs representative demo versions; drafts must never control live SLA behavior.
        var admin = await db.Users.SingleAsync(x => x.Code == "ADMIN001");
        await SeedDraftSchoolPoliciesAsync(db, kidsfit.Id, admin.Id, now);

        var proposals = new[]
        {
            (Code:"SEED-SCH-PENDING", Name:"Trường Mầm non Sao Mai (demo)", Org:partner.Id, Owner:ctv.Id, Manager:partnerManager.Id, Status:"PENDING_MANAGER", Offset:-3),
            (Code:"SEED-SCH-ADMIN", Name:"Trường Mầm non Hoa Nắng (demo)", Org:kidsfit.Id, Owner:sales.Id, Manager:manager.Id, Status:"PENDING_ADMIN", Offset:8),
            (Code:"SEED-SCH-REJECT", Name:"Trường Mầm non Cầu Vồng (demo)", Org:partner.Id, Owner:ctv.Id, Manager:partnerManager.Id, Status:"REJECTED", Offset:-10),
        };
        foreach (var x in proposals)
        {
            if (await db.SchoolProposals.AnyAsync(p => p.SchoolCode == x.Code)) continue;
            db.SchoolProposals.Add(new SchoolProposal
            {
                OrganizationId=x.Org, SubmittedByUserId=x.Owner, ManagerUserId=x.Manager,
                SchoolCode=x.Code, Name=x.Name, Province="Thành phố Cần Thơ",
                Ward="Phường Ninh Kiều", Reason="Dữ liệu giả để kiểm thử quy trình đề xuất",
                Status=x.Status, ReviewDueAt=now.AddHours(x.Offset),
                DecisionReason=x.Status=="REJECTED"?"Thiếu căn cứ phù hợp (demo)":null,
                ManagerReviewedAt=x.Status=="PENDING_MANAGER"?null:now.AddHours(-4),
                ReviewedByUserId=x.Status=="PENDING_MANAGER"?null:x.Manager,
                IdempotencyKey="scenario-proposal-"+x.Code,
                RequestFingerprint="synthetic-"+x.Code,
                CreatedAt=now.AddDays(-2),UpdatedAt=now,
            });
        }
        // Additional independent proposal states. Stable codes keep repeated seeding idempotent.
        var supplementaryProposals = new[]
        {
            (Code: "SEED-SCH-APPROVED", Name: "Trường Mầm non Sen Hồng (demo)", Status: "APPROVED", Org: kidsfit.Id, Owner: sales.Id, Manager: manager.Id),
            (Code: "SEED-SCH-REJECT-MANAGER", Name: "Trường Mầm non Vườn Xanh (demo)", Status: "REJECTED", Org: partner.Id, Owner: ctv.Id, Manager: partnerManager.Id),
            (Code: "SEED-SCH-WAIT-MANAGER", Name: "Trường Mầm non Bồ Công Anh (demo)", Status: "PENDING_MANAGER", Org: kidsfit.Id, Owner: sales.Id, Manager: manager.Id),
        };
        foreach (var item in supplementaryProposals)
        {
            if (await db.SchoolProposals.AnyAsync(x => x.SchoolCode == item.Code)) continue;
            db.SchoolProposals.Add(new SchoolProposal
            {
                OrganizationId = item.Org, SubmittedByUserId = item.Owner, ManagerUserId = item.Manager,
                SchoolCode = item.Code, Name = item.Name,
                Province = "Khu vực minh họa", Ward = "Phường giả lập",
                Reason = "Tình huống thử nghiệm, không chứa dữ liệu trường hoặc liên hệ thật.",
                Status = item.Status, ReviewDueAt = now.AddDays(item.Status == "PENDING_MANAGER" ? 1 : -2),
                ManagerReviewedAt = item.Status == "PENDING_MANAGER" ? null : now.AddDays(-1),
                ReviewedByUserId = item.Status == "PENDING_MANAGER" ? null : item.Manager,
                DecisionReason = item.Status == "REJECTED" ? "Bằng chứng chưa đầy đủ (mẫu)" : null,
                IdempotencyKey = "scenario-proposal-" + item.Code,
                RequestFingerprint = "synthetic-" + item.Code,
                CreatedAt = now.AddDays(-3), UpdatedAt = now
            });
        }
        var approaching = await db.ChannelCustomers.SingleOrDefaultAsync(x => x.Code=="CUS-DEMO-APPROACH");
        if (approaching is not null)
        {
            var registration=await db.ApproachRegistrations.FirstOrDefaultAsync(x=>x.CustomerId==approaching.Id);
            if (registration is not null && !await db.SchoolExtensionRequests.AnyAsync(x=>x.IdempotencyKey=="scenario-extension-pending"))
                db.SchoolExtensionRequests.Add(new SchoolExtensionRequest
                {
                    ApproachRegistrationId=registration.Id,OrganizationId=kidsfit.Id,
                    RequestedByUserId=sales.Id,ManagerUserId=manager.Id,
                    RequestedUntil=registration.ProtectedUntil.AddDays(2),
                    OriginalProtectedUntil=registration.ProtectedUntil,
                    ReviewDueAt=now.AddHours(-1),NextAppointmentAt=now.AddHours(5),
                    Progress="Đã tư vấn, chờ lịch demo (demo)",
                    EvidenceReference="TEST-EVIDENCE-NO-FILE",Status="PENDING",
                    IdempotencyKey="scenario-extension-pending",
                    RequestFingerprint="synthetic-extension-pending",
                    CreatedAt=now.AddHours(-3),UpdatedAt=now,
                });
        }
        var contracted=await db.ChannelCustomers.SingleOrDefaultAsync(x=>x.Code=="CUS-DEMO-CONTRACT");
        if(contracted is not null)
        {
            var contract=await db.SalesContracts.SingleOrDefaultAsync(x=>x.CustomerId==contracted.Id);
            var care=await db.Users.SingleAsync(x=>x.Code=="CARE001");
            if(contract is not null&&!await db.CustomerSupportCases.AnyAsync(x=>x.IdempotencyKey=="scenario-support-open"))
            {
                db.CustomerSupportCases.Add(new CustomerSupportCase
                {
                    ContractId=contract.Id,CustomerId=contracted.Id,OrganizationId=kidsfit.Id,
                    AssignedUserId=care.Id,CreatedByUserId=care.Id,
                    Subject="Hỗ trợ triển khai tài khoản trường (demo)",
                    Description="Yêu cầu thử nghiệm CSKH, không có thông tin liên hệ thật.",
                    Status="OPEN",IdempotencyKey="scenario-support-open",
                    RequestFingerprint="synthetic-support-open",CreatedAt=now,UpdatedAt=now,
                });
            }
        }
        // Show a resolved case beside the open case, without changing financial or contract history.
        if (contracted is not null)
        {
            var contract = await db.SalesContracts.SingleOrDefaultAsync(x => x.CustomerId == contracted.Id);
            var care = await db.Users.SingleAsync(x => x.Code == "CARE001");
            if (contract is not null && !await db.CustomerSupportCases.AnyAsync(x => x.IdempotencyKey == "scenario-support-resolved"))
                db.CustomerSupportCases.Add(new CustomerSupportCase
                {
                    ContractId = contract.Id, CustomerId = contracted.Id, OrganizationId = kidsfit.Id,
                    AssignedUserId = care.Id, CreatedByUserId = care.Id,
                    Subject = "Hướng dẫn sử dụng CHECKEE đã hoàn tất (demo)",
                    Description = "Tình huống giả lập CSKH đã giải quyết, không có dữ liệu cá nhân.",
                    Status = "RESOLVED", Outcome = "Đã hướng dẫn thành công (demo)",
                    ResolvedAt = now.AddHours(-2),
                    IdempotencyKey = "scenario-support-resolved",
                    RequestFingerprint = "synthetic-support-resolved",
                    CreatedAt = now.AddDays(-1), UpdatedAt = now
                });
        }
        await db.SaveChangesAsync();
    }

    private static async Task SeedDraftSchoolPoliciesAsync(KidsfitDbContext db, long organizationId, long adminId, DateTime now)
    {
        // Illustrative manager review windows only; none of these versions is approved or activated.
        var examples = new[]
        {
            (Reference: "DEMO-KIDSFIT-WORKFLOW-24H", ManagerHours: 24),
            (Reference: "DEMO-KIDSFIT-WORKFLOW-48H", ManagerHours: 48),
            (Reference: "DEMO-KIDSFIT-WORKFLOW-72H", ManagerHours: 72),
        };
        var existing = await db.SchoolWorkflowPolicies.AsNoTracking()
            .Where(x => x.OrganizationId == organizationId)
            .Select(x => new { x.Version, x.DecisionReference })
            .ToListAsync();
        var nextVersion = (existing.Count == 0 ? 0 : existing.Max(x => x.Version)) + 1;

        foreach (var example in examples)
        {
            if (existing.Any(x => x.DecisionReference == example.Reference)) continue;
            db.SchoolWorkflowPolicies.Add(new SchoolWorkflowPolicyVersion
            {
                OrganizationId = organizationId,
                Version = nextVersion++,
                Status = "DRAFT",
                ManagerReviewHours = example.ManagerHours,
                AdminReviewHours = 72,
                InvitationHours = 24,
                MaxExtensionDays = 7,
                MaxExtensionCount = 3,
                MaxTotalExtensionDays = 21,
                DecisionReference = example.Reference,
                CreatedByUserId = adminId,
                RequestFingerprint = "synthetic-" + example.Reference,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
    }
}

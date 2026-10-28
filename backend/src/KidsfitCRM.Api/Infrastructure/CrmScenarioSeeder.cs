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
        await db.SaveChangesAsync();
    }
}

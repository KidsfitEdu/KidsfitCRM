using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Tests;

public sealed class AdminProposalProfileMySqlTests(ChannelMySqlFixture fixture) : IClassFixture<ChannelMySqlFixture>
{
    private static SchoolProposalUnitInput Unit(string kind,string name,string? ward="Phường thử nghiệm") =>
        new(kind,name,"Cần Thơ",ward,null,null,null,null,null,null,null,null);

    [MySqlFact]
    public async Task AdminEditsPendingMainAndBranchesWithoutChangingOfficialDirectory()
    {
        var nonce=Guid.NewGuid().ToString("N");
        long admin,other,id;
        await using(var db=fixture.Open())
        {
            admin=await db.Users.Where(x=>x.Email=="admin@kidsfit.vn").Select(x=>x.Id).SingleAsync();
            other=await db.Users.Where(x=>x.Email=="partner@kidsfit.vn").Select(x=>x.Id).SingleAsync();
            var organization=await db.Organizations.Where(x=>x.Code=="KIDSFIT").Select(x=>x.Id).SingleAsync();
            var now=DateTime.UtcNow;
            var proposal=new SchoolProposal {
                SchoolCode="DRAFT-"+nonce.ToUpperInvariant(), ProposalMode="NEW_MAIN",
                Name="Trường trước khi sửa "+nonce, Province="Cần Thơ", Ward="Phường thử nghiệm",
                OrganizationId=organization, SubmittedByUserId=other, ManagerUserId=admin,
                Status="PENDING_ADMIN", Version=1, Reason="Đề xuất kiểm thử", ReviewDueAt=now.AddHours(6),
                IdempotencyKey=nonce, RequestFingerprint=nonce, CreatedAt=now, UpdatedAt=now
            };
            db.SchoolProposals.Add(proposal);await db.SaveChangesAsync();
            id=proposal.Id;
            db.SchoolProposalUnits.Add(new SchoolProposalUnit {
                SchoolProposalId=id,UnitType="MAIN",SortOrder=0,Name=proposal.Name,
                Province=proposal.Province,Ward=proposal.Ward,CreatedAt=now,UpdatedAt=now
            });await db.SaveChangesAsync();
        }
        await using(var db=fixture.Open())
        {
            var action=new ChannelSalesActions(db);
            var update=new UpdateAdminProposalProfileRequest(1,[
                Unit("MAIN","Trường sau khi sửa "+nonce),
                Unit("BRANCH","Phân hiệu mới "+nonce)
            ],"Admin kiểm tra hồ sơ");
            await Assert.ThrowsAsync<KeyNotFoundException>(()=>action.UpdateAdminProposalProfile(id,update,other,new DefaultHttpContext(),CancellationToken.None));
            await Assert.ThrowsAsync<ApiValidationException>(()=>action.UpdateAdminProposalProfile(id,
                new UpdateAdminProposalProfileRequest(1,[Unit("MAIN","Hồ sơ lỗi",ward:null)],"Dữ liệu sai"),
                admin,new DefaultHttpContext(),CancellationToken.None));
            await action.UpdateAdminProposalProfile(id,update,admin,new DefaultHttpContext(),CancellationToken.None);
            await Assert.ThrowsAsync<ApiConflictException>(()=>action.UpdateAdminProposalProfile(id,update,admin,new DefaultHttpContext(),CancellationToken.None));
        }
        await using(var db=fixture.Open())
        {
            var proposal=await db.SchoolProposals.SingleAsync(x=>x.Id==id);
            Assert.Equal(2,proposal.Version);
            Assert.StartsWith("Trường sau khi sửa",proposal.Name);
            Assert.Equal(2,await db.SchoolProposalUnits.CountAsync(x=>x.SchoolProposalId==id));
            Assert.True(await db.SchoolProposalRevisions.AnyAsync(x=>x.SchoolProposalId==id && x.Version==2));
            Assert.False(await db.DirectorySchools.AnyAsync(x=>x.SchoolCode==proposal.SchoolCode));
            proposal.Status="APPROVED";
            await db.SaveChangesAsync();
        }
        await using(var db=fixture.Open())
        {
            await Assert.ThrowsAsync<ApiConflictException>(()=>new ChannelSalesActions(db).UpdateAdminProposalProfile(id,
                new UpdateAdminProposalProfileRequest(2,[Unit("MAIN","Không được đổi")],"Đã duyệt"),
                admin,new DefaultHttpContext(),CancellationToken.None));
        }
    }
}

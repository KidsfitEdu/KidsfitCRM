using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Tests;

public sealed class AdminProposalProfileMySqlTests(ChannelMySqlFixture fixture) : IClassFixture<ChannelMySqlFixture>
{
    private static SchoolProposalUnitInput Unit(string kind,string name,string? ward="Phường thử nghiệm") =>
        new(kind,name,"Cần Thơ",ward,null,null,null,null,null,null,null);

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

    [MySqlFact]
    public async Task AdminEditsBranchProposalWithoutChangingOfficialSchool()
    {
        var nonce=Guid.NewGuid().ToString("N");
        long admin,owner,schoolId,proposalId;
        await using(var db=fixture.Open())
        {
            admin=await db.Users.Where(x=>x.Email=="admin@kidsfit.vn").Select(x=>x.Id).SingleAsync();
            owner=await db.Users.Where(x=>x.Email=="partner@kidsfit.vn").Select(x=>x.Id).SingleAsync();
            var newSchool=new SaveSchoolRecordRequest("BR"+nonce[..14].ToUpperInvariant(), [
                new SchoolRecordUnitInput(null,null,"MAIN","Trường liên kết "+nonce,
                    "Cần Thơ","Phường thử nghiệm",null,null,null,null,null,null,null)
            ],null);
            schoolId=await new ChannelSalesActions(db).SaveSchoolRecord(null,newSchool,admin,new DefaultHttpContext(),CancellationToken.None);
        }
        await using(var db=fixture.Open())
        {
            var org=await db.Organizations.Where(x=>x.Code=="KIDSFIT").Select(x=>x.Id).SingleAsync();
            var school=await db.DirectorySchools.SingleAsync(x=>x.Id==schoolId);
            var now=DateTime.UtcNow;
            var proposal=new SchoolProposal {
                ProposalMode="ADD_BRANCHES", TargetDirectorySchoolId=schoolId,
                SchoolCode=school.SchoolCode,Name="Trường liên kết "+nonce,Province="Cần Thơ",
                Ward="Phường thử nghiệm",OrganizationId=org,SubmittedByUserId=owner,
                ManagerUserId=admin,Status="PENDING_ADMIN",Version=1,
                Reason="Đề xuất phân hiệu",ReviewDueAt=now.AddHours(6),
                IdempotencyKey=nonce,RequestFingerprint=nonce,CreatedAt=now,UpdatedAt=now
            };
            db.SchoolProposals.Add(proposal);await db.SaveChangesAsync();
            proposalId=proposal.Id;
        }
        await using(var db=fixture.Open())
        {
            await Assert.ThrowsAsync<ApiValidationException>(()=>new ChannelSalesActions(db).UpdateAdminProposalProfile(
                proposalId,new UpdateAdminProposalProfileRequest(1,[Unit("MAIN","Không được sửa chính")],"Không hợp lệ"),
                admin,new DefaultHttpContext(),CancellationToken.None));
            await new ChannelSalesActions(db).UpdateAdminProposalProfile(proposalId,
                new UpdateAdminProposalProfileRequest(1,[
                    Unit("BRANCH","Phân hiệu một "+nonce),Unit("BRANCH","Phân hiệu hai "+nonce)
                ],"Rà soát phân hiệu"),admin,new DefaultHttpContext(),CancellationToken.None);
        }
        await using(var db=fixture.Open())
        {
            Assert.Equal(2,await db.SchoolProposalUnits.CountAsync(x=>x.SchoolProposalId==proposalId));
            Assert.Single(await db.SchoolUnits.Where(x=>x.DirectorySchoolId==schoolId).ToArrayAsync());
            Assert.Equal("ADD_BRANCHES",await db.SchoolProposals.Where(x=>x.Id==proposalId).Select(x=>x.ProposalMode).SingleAsync());
        }
    }

    [MySqlFact]
    public async Task LegacyAdminEditKeepsCodeAndSchoolPhoneInProposalUnits()
    {
        var nonce=Guid.NewGuid().ToString("N");
        long admin,id;
        await using(var db=fixture.Open())
        {
            admin=await db.Users.Where(x=>x.Email=="admin@kidsfit.vn").Select(x=>x.Id).SingleAsync();
            var owner=await db.Users.Where(x=>x.Email=="partner@kidsfit.vn").Select(x=>x.Id).SingleAsync();
            var org=await db.Organizations.Where(x=>x.Code=="KIDSFIT").Select(x=>x.Id).SingleAsync();
            var now=DateTime.UtcNow;
            var proposal=new SchoolProposal {
                ProposalMode="LEGACY",SchoolCode="LEG"+nonce[..12].ToUpperInvariant(),
                Name="Trường cũ "+nonce,Province="Cần Thơ",Ward="Phường thử nghiệm",
                OrganizationId=org,SubmittedByUserId=owner,ManagerUserId=admin,
                Status="PENDING_ADMIN",Version=1,Reason="Hồ sơ cũ",
                ReviewDueAt=now.AddHours(6),IdempotencyKey=nonce,
                RequestFingerprint=nonce,CreatedAt=now,UpdatedAt=now
            };
            db.SchoolProposals.Add(proposal);await db.SaveChangesAsync();id=proposal.Id;
        }
        await using(var db=fixture.Open())
        {
            await new ChannelSalesActions(db).UpdateAdminProposalProfile(id,
                new UpdateAdminProposalProfileRequest(1,[
                    new SchoolProposalUnitInput("MAIN","Trường đã sửa "+nonce,"Cần Thơ","Phường thử nghiệm",
                        null,null,null,null,null,"02923887766","Ghi chú kiểm thử")
                ],"Cập nhật liên hệ"),admin,new DefaultHttpContext(),CancellationToken.None);
        }
        await using(var db=fixture.Open())
        {
            var proposal=await db.SchoolProposals.SingleAsync(x=>x.Id==id);
            Assert.StartsWith("LEG",proposal.SchoolCode);
            Assert.Equal("LEGACY",proposal.ProposalMode);
            Assert.Equal(2,proposal.Version);
            var unit=await db.SchoolProposalUnits.SingleAsync(x=>x.SchoolProposalId==id);
            Assert.Equal("02923887766",unit.SchoolPhone);
            Assert.Equal("Ghi chú kiểm thử",unit.Note);
        }
    }
}

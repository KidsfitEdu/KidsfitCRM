using KidsfitCRM.Api.Common;
using KidsfitCRM.Api.Domain;
using KidsfitCRM.Api.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace KidsfitCRM.Api.Tests;

public sealed class SchoolRecordMySqlTests(ChannelMySqlFixture fixture) : IClassFixture<ChannelMySqlFixture>
{
    private static SchoolRecordUnitInput Unit(string kind,string name,long? id=null,int? version=null,string? ward="Phường thử nghiệm")
        => new(id,version,kind,name,"Cần Thơ",ward,null,null,null,null,null,null,null);

    [MySqlFact]
    public async Task AdminCreatesAndUpdatesMainWithBranchesAtomically()
    {
        var code = "BULK" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant();
        long admin;
        long partner;
        await using (var db = fixture.Open())
        {
            admin = await db.Users.Where(x=>x.Email=="admin@kidsfit.vn").Select(x=>x.Id).SingleAsync();
            partner = await db.Users.Where(x=>x.Email=="partner@kidsfit.vn").Select(x=>x.Id).SingleAsync();
        }
        await using (var db=fixture.Open())
        {
            var action=new ChannelSalesActions(db);
            var request=new SaveSchoolRecordRequest(code,[Unit("MAIN","Trường thử "+code),Unit("BRANCH","Phân hiệu A "+code)],null);
            await Assert.ThrowsAsync<KeyNotFoundException>(()=>action.SaveSchoolRecord(null,request,partner,new DefaultHttpContext(),CancellationToken.None));
            await action.SaveSchoolRecord(null,request,admin,new DefaultHttpContext(),CancellationToken.None);
        }
        await using (var db=fixture.Open())
        {
            var school=await db.DirectorySchools.SingleAsync(x=>x.SchoolCode==code);
            var units=await db.SchoolUnits.Where(x=>x.DirectorySchoolId==school.Id).OrderBy(x=>x.UnitType).ToArrayAsync();
            Assert.Equal(2,units.Length);
            Assert.Single(units,x=>x.UnitType=="MAIN");
            var main=units.Single(x=>x.UnitType=="MAIN");
            var branch=units.Single(x=>x.UnitType=="BRANCH");
            var action=new ChannelSalesActions(db);
            var invalid=new SaveSchoolRecordRequest(code,[
                Unit("MAIN",main.Name,main.Id,main.Version),
                Unit("BRANCH",branch.Name,branch.Id,branch.Version),
                Unit("BRANCH","Thiếu phường",ward:null)
            ],null);
            await Assert.ThrowsAsync<ApiValidationException>(()=>action.SaveSchoolRecord(school.Id,invalid,admin,new DefaultHttpContext(),CancellationToken.None));
        }
        await using (var db=fixture.Open())
        {
            var school=await db.DirectorySchools.SingleAsync(x=>x.SchoolCode==code);
            var units=await db.SchoolUnits.Where(x=>x.DirectorySchoolId==school.Id).ToArrayAsync();
            Assert.Equal(2,units.Length);
            var main=units.Single(x=>x.UnitType=="MAIN");
            var branch=units.Single(x=>x.UnitType=="BRANCH");
            await new ChannelSalesActions(db).SaveSchoolRecord(school.Id,new SaveSchoolRecordRequest(code,[
                Unit("MAIN",main.Name+" cập nhật",main.Id,main.Version),
                Unit("BRANCH",branch.Name,branch.Id,branch.Version),
                Unit("BRANCH","Phân hiệu B "+code)
            ],null),admin,new DefaultHttpContext(),CancellationToken.None);
        }
        await using (var db=fixture.Open())
        {
            var school=await db.DirectorySchools.SingleAsync(x=>x.SchoolCode==code);
            var units=await db.SchoolUnits.Where(x=>x.DirectorySchoolId==school.Id).ToArrayAsync();
            Assert.Equal(3,units.Length);
            var main=units.Single(x=>x.UnitType=="MAIN");
            Assert.Equal(1,main.Version);
            Assert.Contains("cập nhật",main.Name);
            Assert.True(await db.SchoolUnitRevisions.AnyAsync(x=>x.SchoolUnitId==main.Id));
            Assert.Equal(main.Name,await db.ChannelCustomers.Where(x=>x.Id==school.CustomerId).Select(x=>x.DisplayName).SingleAsync());
            await Assert.ThrowsAsync<ApiConflictException>(()=>new ChannelSalesActions(db).SaveSchoolRecord(school.Id,
                new SaveSchoolRecordRequest(code,[Unit("MAIN",main.Name,main.Id,main.Version)],null),
                admin,new DefaultHttpContext(),CancellationToken.None));
        }
    }
}

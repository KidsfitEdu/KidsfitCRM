using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261105121000_WidenSchoolInvitationResponseReason")]
public sealed class WidenSchoolInvitationResponseReason : Migration
{
    protected override void Up(MigrationBuilder m)
    {
        m.AlterColumn<string>(name:"response_reason",table:"school_invitations",
            type:"text",nullable:true,
            oldClrType:typeof(string),oldType:"varchar(32)",oldMaxLength:32,oldNullable:true);
    }
    protected override void Down(MigrationBuilder m)
    {
        m.AlterColumn<string>(name:"response_reason",table:"school_invitations",
            type:"varchar(32)",maxLength:32,nullable:true,
            oldClrType:typeof(string),oldType:"text",oldNullable:true);
    }
}

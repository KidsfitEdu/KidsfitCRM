using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>Retire unfinished school allocation disputes without touching CHECKEE reconciliation.</summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261119160000_RemoveSchoolDisputes")]
public sealed class RemoveSchoolDisputes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DELETE pr FROM permission_role pr
            INNER JOIN permissions p ON pr.permission_id = p.id
            WHERE p.code = 'channel_sales.school.dispute.resolve'
            """);
        migrationBuilder.Sql("""
            DELETE FROM permissions WHERE code = 'channel_sales.school.dispute.resolve'
            """);
        migrationBuilder.DropTable(name: "school_disputes");
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        throw new NotSupportedException("Retired demo-only school disputes must not be recreated with fabricated records.");
}

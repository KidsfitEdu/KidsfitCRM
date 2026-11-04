using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261104190000_ContractRevisionDetails")]
public sealed class ContractRevisionDetails : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Nullable for historical contracts; no fabricated revision data.
        migrationBuilder.AddColumn<string>(
            name: "revision_reason", table: "sales_contracts",
            type: "varchar(2000)", maxLength: 2000, nullable: true);
        migrationBuilder.AddColumn<DateTime>(
            name: "revision_requested_at", table: "sales_contracts",
            type: "datetime(6)", nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "revision_requested_at", table: "sales_contracts");
        migrationBuilder.DropColumn(name: "revision_reason", table: "sales_contracts");
    }
}

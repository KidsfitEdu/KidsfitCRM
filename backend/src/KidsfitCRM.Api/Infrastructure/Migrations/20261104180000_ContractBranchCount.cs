using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261104180000_ContractBranchCount")]
public sealed class ContractBranchCount : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Existing agreements retain a null count: their submitted unit IDs
        // remain available, and historical counts are not guessed.
        migrationBuilder.AddColumn<int>(
            name: "branch_count", table: "sales_contracts",
            type: "int", nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "branch_count", table: "sales_contracts");
    }
}

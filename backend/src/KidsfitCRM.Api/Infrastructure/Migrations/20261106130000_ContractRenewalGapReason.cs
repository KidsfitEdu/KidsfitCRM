using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>Additive KC-02 justification; existing source contracts and financial/protection tables are untouched.</summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261106130000_ContractRenewalGapReason")]
public sealed class ContractRenewalGapReason : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "gap_reason", table: "contract_renewals",
            type: "varchar(1000)", maxLength: 1000, nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "gap_reason", table: "contract_renewals");
    }
}

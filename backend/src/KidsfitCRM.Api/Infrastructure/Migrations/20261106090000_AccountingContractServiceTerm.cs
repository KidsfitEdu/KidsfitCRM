using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>Nullable, independently evidenced one-year software service metadata; preserves historic 9-month plans.</summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261106090000_AccountingContractServiceTerm")]
public sealed class AccountingContractServiceTerm : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(name: "service_start_on", table: "sales_contracts",
            type: "date", nullable: true);
        migrationBuilder.AddColumn<DateTime>(name: "service_end_on", table: "sales_contracts",
            type: "date", nullable: true);
        migrationBuilder.AddColumn<string>(name: "payment_cycle", table: "sales_contracts",
            type: "varchar(16)", maxLength: 16, nullable: true);
        // No backfill: a signed date, an effective date and a 9-month plan cannot establish
        // a trustworthy service end date or a 12-month billing cycle.
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "payment_cycle", table: "sales_contracts");
        migrationBuilder.DropColumn(name: "service_end_on", table: "sales_contracts");
        migrationBuilder.DropColumn(name: "service_start_on", table: "sales_contracts");
    }
}

using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261112180000_CommissionManagerCeiling")]
public sealed class CommissionManagerCeiling : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Nullable for existing version rows; legacy rows inherit their total ceiling.
        migrationBuilder.AddColumn<decimal>(
            name: "manager_ceiling_percent",
            table: "commission_allocation_versions",
            type: "decimal(9,4)",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Do not silently discard manager-specific ceiling history.
        throw new NotSupportedException("Commission ceiling history must not be removed automatically.");
    }
}

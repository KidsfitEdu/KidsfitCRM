using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261112173000_CommissionAllocationVersions")]
public sealed class CommissionAllocationVersions : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "commission_allocation_versions",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("MySQL:ValueGenerationStrategy", MySQL.EntityFrameworkCore.Metadata.MySQLValueGenerationStrategy.IdentityColumn),
                organization_id = table.Column<long>(type: "bigint", nullable: false),
                manager_user_id = table.Column<long>(type: "bigint", nullable: true),
                sales_user_id = table.Column<long>(type: "bigint", nullable: true),
                scope = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false, collation: "utf8mb4_bin"),
                configured_by = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false, collation: "utf8mb4_bin"),
                sales_percent = table.Column<decimal>(type: "decimal(9,4)", nullable: false),
                manager_percent = table.Column<decimal>(type: "decimal(9,4)", nullable: false),
                ceiling_percent = table.Column<decimal>(type: "decimal(9,4)", nullable: false),
                effective_from = table.Column<DateOnly>(type: "date", nullable: false),
                status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                reason = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: false),
                created_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_commission_allocation_versions", x => x.id));
        migrationBuilder.CreateIndex(
            name: "IX_commission_allocation_versions_scope",
            table: "commission_allocation_versions",
            columns: new[] { "organization_id", "scope", "manager_user_id", "sales_user_id", "configured_by", "effective_from" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Rolling back a versioned configuration removes audit-relevant business history.
        // Require a reviewed archival procedure rather than silently dropping records.
        throw new NotSupportedException("Commission configuration history must not be dropped by automatic downgrade.");
    }
}

using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>
/// Independent BGĐ policy stream. Financial policy/ledger tables are unchanged.
/// Permission grant is idempotent for pre-existing DIRECTOR accounts.
/// </summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261113090000_BoardCommissionPolicies")]
public sealed class BoardCommissionPolicies : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "board_commission_policy_versions",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                scope = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false, collation: "utf8mb4_bin"),
                organization_id = table.Column<long>(type: "bigint", nullable: true),
                manager_user_id = table.Column<long>(type: "bigint", nullable: true),
                sales_user_id = table.Column<long>(type: "bigint", nullable: true),
                sales_percent = table.Column<decimal>(type: "decimal(9,4)", nullable: false),
                manager_percent = table.Column<decimal>(type: "decimal(9,4)", nullable: false),
                status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false, collation: "utf8mb4_bin"),
                created_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_board_commission_policy_versions", x => x.id));

        migrationBuilder.CreateIndex(
            name: "IX_board_commission_policy_versions_lookup",
            table: "board_commission_policy_versions",
            columns: new[] { "scope", "organization_id", "manager_user_id", "sales_user_id", "created_at" });

        migrationBuilder.Sql("""
            INSERT INTO permissions (code, name, `group`, created_at, updated_at)
            SELECT 'channel_sales.policy.manage', 'Quản lý cấu hình hoa hồng BGĐ',
                   'CHECKEE', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
            WHERE NOT EXISTS (
                SELECT 1 FROM permissions WHERE code = 'channel_sales.policy.manage'
            );
            """);
        migrationBuilder.Sql("""
            INSERT INTO permission_role (permission_id, role_id)
            SELECT p.id, r.id
            FROM permissions p
            JOIN roles r ON r.code = 'DIRECTOR'
            WHERE p.code = 'channel_sales.policy.manage'
              AND NOT EXISTS (
                  SELECT 1 FROM permission_role pr
                  WHERE pr.permission_id = p.id AND pr.role_id = r.id
              );
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // No automatic destructive rollback for append-only policy history.
        throw new NotSupportedException("Archive BGĐ policy history before any rollback.");
    }
}

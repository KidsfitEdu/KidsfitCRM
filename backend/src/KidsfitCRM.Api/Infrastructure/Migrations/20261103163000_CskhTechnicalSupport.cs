using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261103163000_CskhTechnicalSupport")]
public sealed class CskhTechnicalSupport : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "ticket_type", table: "customer_support_cases",
            type: "varchar(32)", maxLength: 32, nullable: false, defaultValue: "LEGACY");
        migrationBuilder.AddColumn<long>(name: "checkee_organization_id", table: "customer_support_cases",
            type: "bigint", nullable: true);
        migrationBuilder.AddColumn<DateTime>(name: "forwarded_at", table: "customer_support_cases",
            type: "datetime(6)", nullable: true);
        migrationBuilder.AddColumn<long>(name: "forwarded_by_user_id", table: "customer_support_cases",
            type: "bigint", nullable: true);
        migrationBuilder.AddColumn<DateTime>(name: "checkee_responded_at", table: "customer_support_cases",
            type: "datetime(6)", nullable: true);
        migrationBuilder.CreateIndex(name: "ix_support_checkee_status_created", table: "customer_support_cases",
            columns: new[] { "checkee_organization_id", "status", "created_at" });
        migrationBuilder.CreateIndex(name: "ix_support_forwarded_by", table: "customer_support_cases",
            column: "forwarded_by_user_id");
        migrationBuilder.AddForeignKey(name: "fk_support_checkee_org", table: "customer_support_cases",
            column: "checkee_organization_id", principalTable: "organizations", principalColumn: "id",
            onDelete: ReferentialAction.Restrict);
        migrationBuilder.AddForeignKey(name: "fk_support_forwarded_user", table: "customer_support_cases",
            column: "forwarded_by_user_id", principalTable: "users", principalColumn: "id",
            onDelete: ReferentialAction.Restrict);
        // Production RBAC: do not depend on --seed-demo. Preserve users and roles.
        migrationBuilder.Sql("""
            INSERT INTO `permissions` (`code`, `name`, `group`, `created_at`, `updated_at`)
            SELECT 'channel_sales.school.technical_support.handle', 'CHECKEE xử lý lỗi phần mềm',
                   'CHECKEE', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
            WHERE NOT EXISTS (SELECT 1 FROM `permissions`
                WHERE `code` = 'channel_sales.school.technical_support.handle');
            """);
        migrationBuilder.Sql("""
            INSERT INTO `permission_role` (`permission_id`, `role_id`)
            SELECT p.id, r.id FROM `permissions` p CROSS JOIN `roles` r
            WHERE p.code = 'channel_sales.school.technical_support.handle'
              AND r.code IN ('CHECKEE', 'ADMIN')
              AND NOT EXISTS (SELECT 1 FROM `permission_role` existing
                WHERE existing.permission_id = p.id AND existing.role_id = r.id);
            """);
        // Explicitly approved: Sales Managers can no longer allocate CSKH.
        // Action-level Admin-only checks remain in place for legacy tokens/grants.
        migrationBuilder.Sql("""
            DELETE pr FROM `permission_role` pr
            INNER JOIN `roles` r ON pr.role_id = r.id
            INNER JOIN `permissions` p ON pr.permission_id = p.id
            WHERE r.code = 'SALES_MANAGER' AND p.code = 'channel_sales.school.care.assign';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // These records contain support routing and audit history: require manual rollback review.
        throw new NotSupportedException("Không tự động xóa dữ liệu xử lý kỹ thuật đã ghi nhận.");
    }
}

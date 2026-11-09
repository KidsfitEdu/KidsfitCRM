using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261109110000_ProtectionRenewalCasesV2")]
public sealed class ProtectionRenewalCasesV2 : Migration
{
    protected override void Up(MigrationBuilder b)
    {
        b.CreateTable(name: "protection_renewal_cases",
            columns: t => new
            {
                id = t.Column<long>("bigint", nullable: false).Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                contract_id = t.Column<long>("bigint", nullable: false),
                customer_id = t.Column<long>("bigint", nullable: false),
                owner_user_id = t.Column<long>("bigint", nullable: false),
                owner_organization_id = t.Column<long>("bigint", nullable: false),
                previous_protection_until = t.Column<DateTime>("datetime(6)", nullable: false),
                priority_until = t.Column<DateTime>("datetime(6)", nullable: false),
                status = t.Column<string>("varchar(32)", maxLength: 32, nullable: false),
                source = t.Column<string>("varchar(16)", maxLength: 16, nullable: false),
                note = t.Column<string>("varchar(1000)", maxLength: 1000, nullable: true),
                decision_reason = t.Column<string>("varchar(1000)", maxLength: 1000, nullable: true),
                reviewed_by_user_id = t.Column<long>("bigint", nullable: true),
                reviewed_at = t.Column<DateTime>("datetime(6)", nullable: true),
                new_protection_from = t.Column<DateTime>("datetime(6)", nullable: true),
                new_protection_until = t.Column<DateTime>("datetime(6)", nullable: true),
                deduplication_key = t.Column<string>("varchar(160)", maxLength: 160, collation: "utf8mb4_bin", nullable: false),
                created_at = t.Column<DateTime>("datetime(6)", nullable: false),
                updated_at = t.Column<DateTime>("datetime(6)", nullable: false)
            },
            constraints: t =>
            {
                t.PrimaryKey("PK_protection_renewal_cases", x => x.id);
                t.ForeignKey("FK_protection_renewal_cases_sales_contracts_contract_id", x => x.contract_id, "sales_contracts", "id", onDelete: ReferentialAction.Restrict);
                t.ForeignKey("FK_protection_renewal_cases_channel_customers_customer_id", x => x.customer_id, "channel_customers", "id", onDelete: ReferentialAction.Restrict);
                t.ForeignKey("FK_protection_renewal_cases_users_owner_user_id", x => x.owner_user_id, "users", "id", onDelete: ReferentialAction.Restrict);
                t.ForeignKey("FK_protection_renewal_cases_users_reviewed_by_user_id", x => x.reviewed_by_user_id, "users", "id", onDelete: ReferentialAction.Restrict);
            });
        b.CreateIndex("IX_protection_renewal_cases_deduplication_key", "protection_renewal_cases", "deduplication_key", unique: true);
        b.CreateIndex("IX_protection_renewal_cases_owner_user_id_status", "protection_renewal_cases", new[] { "owner_user_id", "status" });
        b.CreateIndex("IX_protection_renewal_cases_customer_id_status", "protection_renewal_cases", new[] { "customer_id", "status" });
        b.CreateIndex("IX_protection_renewal_cases_contract_id", "protection_renewal_cases", "contract_id");
        b.CreateIndex("IX_protection_renewal_cases_reviewed_by_user_id", "protection_renewal_cases", "reviewed_by_user_id");
        // Existing non-demo databases must receive the RBAC permission as well as the table.
        // Endpoints additionally require an active KIDSFIT manager membership and role.
        b.Sql(@"INSERT INTO permissions (code, name, `group`, created_at, updated_at)
                SELECT 'channel_sales.protection.renewal.approve',
                       'Duyệt chu kỳ bảo vệ Sales 5 năm tại KIDSFIT', 'CHECKEE', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
                WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code='channel_sales.protection.renewal.approve');");
        b.Sql(@"INSERT IGNORE INTO permission_role (permission_id, role_id)
                SELECT p.id, r.id FROM permissions p CROSS JOIN roles r
                WHERE p.code='channel_sales.protection.renewal.approve' AND r.code='SALES_MANAGER';");

    }

    protected override void Down(MigrationBuilder b)
    {
        b.DropTable("protection_renewal_cases");
        b.Sql("DELETE FROM permission_role WHERE permission_id IN (SELECT id FROM permissions WHERE code='channel_sales.protection.renewal.approve');");
        b.Sql("DELETE FROM permissions WHERE code='channel_sales.protection.renewal.approve';");
    }
}

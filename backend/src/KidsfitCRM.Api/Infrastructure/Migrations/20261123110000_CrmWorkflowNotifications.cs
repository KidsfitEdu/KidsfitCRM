using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>Additive persistent notification inbox. Never rewrites historic NT-01 or proposal alerts.</summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261123110000_CrmWorkflowNotifications")]
public sealed class CrmWorkflowNotifications : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "crm_notifications",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                organization_id = table.Column<long>(type: "bigint", nullable: false),
                recipient_user_id = table.Column<long>(type: "bigint", nullable: false),
                kind = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false),
                entity_type = table.Column<string>(type: "varchar(48)", maxLength: 48, nullable: false),
                entity_id = table.Column<long>(type: "bigint", nullable: false),
                title = table.Column<string>(type: "varchar(180)", maxLength: 180, nullable: false),
                message = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: false),
                target_view = table.Column<string>(type: "varchar(96)", maxLength: 96, nullable: false),
                deduplication_key = table.Column<string>(type: "varchar(180)", maxLength: 180, nullable: false, collation: "utf8mb4_bin"),
                status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                read_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                resolved_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_crm_notifications", x => x.id);
                table.ForeignKey("FK_crm_notifications_organizations_organization_id", x => x.organization_id,
                    "organizations", "id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_crm_notifications_users_recipient_user_id", x => x.recipient_user_id,
                    "users", "id", onDelete: ReferentialAction.Restrict);
            });
        migrationBuilder.CreateIndex("IX_crm_notifications_deduplication_key", "crm_notifications", "deduplication_key", unique: true);
        migrationBuilder.CreateIndex("IX_crm_notifications_recipient_user_id_status_created_at", "crm_notifications",
            new[] { "recipient_user_id", "status", "created_at" });
        migrationBuilder.CreateIndex("IX_crm_notifications_entity_type_entity_id", "crm_notifications",
            new[] { "entity_type", "entity_id" });
        migrationBuilder.CreateIndex("IX_crm_notifications_organization_id", "crm_notifications", "organization_id");
    }

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable("crm_notifications");
}

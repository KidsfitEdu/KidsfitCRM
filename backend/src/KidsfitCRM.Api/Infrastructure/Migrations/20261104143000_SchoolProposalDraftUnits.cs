using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261104143000_SchoolProposalDraftUnits")]
public sealed class SchoolProposalDraftUnits : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>("proposal_mode", "school_proposals", type: "varchar(32)",
            maxLength: 32, nullable: false, defaultValue: "LEGACY");
        migrationBuilder.AddColumn<long>("target_directory_school_id", "school_proposals",
            type: "bigint", nullable: true);
        migrationBuilder.AddColumn<bool>("is_deleted", "school_proposals",
            type: "tinyint(1)", nullable: false, defaultValue: false);
        migrationBuilder.AddColumn<DateTime>("deleted_at", "school_proposals",
            type: "datetime(6)", nullable: true);
        migrationBuilder.AddColumn<long>("deleted_by_user_id", "school_proposals",
            type: "bigint", nullable: true);
        migrationBuilder.CreateIndex("IX_school_proposals_target_directory_school_id",
            "school_proposals", "target_directory_school_id");
        migrationBuilder.CreateIndex("IX_school_proposals_deleted_by_user_id",
            "school_proposals", "deleted_by_user_id");
        migrationBuilder.CreateIndex("IX_school_proposals_submitted_by_user_id_status_is_deleted",
            "school_proposals", new[] { "submitted_by_user_id", "status", "is_deleted" });
        migrationBuilder.AddForeignKey("FK_school_proposals_directory_schools_target_directory_school_id",
            "school_proposals", "target_directory_school_id", "directory_schools", "id",
            onDelete: ReferentialAction.Restrict);
        migrationBuilder.AddForeignKey("FK_school_proposals_users_deleted_by_user_id",
            "school_proposals", "deleted_by_user_id", "users", "id",
            onDelete: ReferentialAction.Restrict);
        migrationBuilder.CreateTable(
            name: "school_proposal_units",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                school_proposal_id = table.Column<long>(type: "bigint", nullable: false),
                unit_type = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                sort_order = table.Column<int>(type: "int", nullable: false),
                name = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false),
                province = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                ward = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                address = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true),
                contact_name = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true),
                contact_position = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: true),
                contact_phone = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true),
                email = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: true),
                school_phone = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true),
                note = table.Column<string>(type: "text", nullable: true),
                created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_school_proposal_units", x => x.id);
                table.ForeignKey("FK_school_proposal_units_school_proposals_school_proposal_id",
                    x => x.school_proposal_id, "school_proposals", "id", onDelete: ReferentialAction.Restrict);
            }).Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");
        migrationBuilder.CreateIndex("IX_school_proposal_units_school_proposal_id_sort_order",
            "school_proposal_units", new[] { "school_proposal_id", "sort_order" }, unique: true);
        // Existing proposals remain LEGACY and continue using their original single-unit columns.
        // No destructive backfill or seed changes are performed.
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // A rollback must not silently erase multi-unit proposals and their histories.
        throw new NotSupportedException("Review proposal units and export data before a manual rollback.");
    }
}

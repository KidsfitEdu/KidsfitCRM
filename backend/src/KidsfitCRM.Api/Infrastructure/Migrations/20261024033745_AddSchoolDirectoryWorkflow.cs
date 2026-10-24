using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSchoolDirectoryWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "manager_reviewed_at",
                table: "sales_contracts",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "manager_reviewed_by_user_id",
                table: "sales_contracts",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "requires_school_verification",
                table: "sales_contracts",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "verified_at",
                table: "sales_contracts",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "school_approach_limit",
                table: "organization_memberships",
                type: "int",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.CreateTable(
                name: "directory_schools",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    school_code = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    customer_id = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_directory_schools", x => x.id);
                    table.ForeignKey(
                        name: "FK_directory_schools_channel_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "channel_customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "school_capacity_changes",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    membership_id = table.Column<long>(type: "bigint", nullable: false),
                    actor_user_id = table.Column<long>(type: "bigint", nullable: false),
                    previous_limit = table.Column<int>(type: "int", nullable: false),
                    new_limit = table.Column<int>(type: "int", nullable: false),
                    reason = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_capacity_changes", x => x.id);
                    table.ForeignKey(
                        name: "FK_school_capacity_changes_organization_memberships_membership_~",
                        column: x => x.membership_id,
                        principalTable: "organization_memberships",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_capacity_changes_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "school_import_batches",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    file_hash = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    actor_user_id = table.Column<long>(type: "bigint", nullable: false),
                    organization_id = table.Column<long>(type: "bigint", nullable: false),
                    schools_created = table.Column<int>(type: "int", nullable: false),
                    units_created = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_import_batches", x => x.id);
                    table.ForeignKey(
                        name: "FK_school_import_batches_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_import_batches_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "school_units",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    directory_school_id = table.Column<long>(type: "bigint", nullable: false),
                    content_hash = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    unit_type = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
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
                    source_row = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_units", x => x.id);
                    table.ForeignKey(
                        name: "FK_school_units_directory_schools_directory_school_id",
                        column: x => x.directory_school_id,
                        principalTable: "directory_schools",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateIndex(
                name: "IX_sales_contracts_manager_reviewed_by_user_id",
                table: "sales_contracts",
                column: "manager_reviewed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_directory_schools_customer_id",
                table: "directory_schools",
                column: "customer_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_directory_schools_school_code",
                table: "directory_schools",
                column: "school_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_school_capacity_changes_actor_user_id",
                table: "school_capacity_changes",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_capacity_changes_membership_id",
                table: "school_capacity_changes",
                column: "membership_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_import_batches_actor_user_id",
                table: "school_import_batches",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_import_batches_idempotency_key",
                table: "school_import_batches",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_school_import_batches_organization_id",
                table: "school_import_batches",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_units_directory_school_id_content_hash",
                table: "school_units",
                columns: new[] { "directory_school_id", "content_hash" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_sales_contracts_users_manager_reviewed_by_user_id",
                table: "sales_contracts",
                column: "manager_reviewed_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_sales_contracts_users_manager_reviewed_by_user_id",
                table: "sales_contracts");

            migrationBuilder.DropTable(
                name: "school_capacity_changes");

            migrationBuilder.DropTable(
                name: "school_import_batches");

            migrationBuilder.DropTable(
                name: "school_units");

            migrationBuilder.DropTable(
                name: "directory_schools");

            migrationBuilder.DropIndex(
                name: "IX_sales_contracts_manager_reviewed_by_user_id",
                table: "sales_contracts");

            migrationBuilder.DropColumn(
                name: "manager_reviewed_at",
                table: "sales_contracts");

            migrationBuilder.DropColumn(
                name: "manager_reviewed_by_user_id",
                table: "sales_contracts");

            migrationBuilder.DropColumn(
                name: "requires_school_verification",
                table: "sales_contracts");

            migrationBuilder.DropColumn(
                name: "verified_at",
                table: "sales_contracts");

            migrationBuilder.DropColumn(
                name: "school_approach_limit",
                table: "organization_memberships");
        }
    }
}

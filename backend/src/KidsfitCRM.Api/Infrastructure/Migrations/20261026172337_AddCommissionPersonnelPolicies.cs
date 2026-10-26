using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCommissionPersonnelPolicies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "owner_personnel_type",
                table: "sales_contracts",
                type: "varchar(32)",
                maxLength: 32,
                nullable: true,
                collation: "utf8mb4_bin");

            migrationBuilder.AddColumn<string>(
                name: "personnel_type",
                table: "commission_policy_versions",
                type: "varchar(32)",
                maxLength: 32,
                nullable: true,
                collation: "utf8mb4_bin");

            migrationBuilder.CreateIndex(
                name: "IX_commission_policy_versions_organization_id_personnel_type_st~",
                table: "commission_policy_versions",
                columns: new[] { "organization_id", "personnel_type", "status", "effective_from" });
            migrationBuilder.Sql("ALTER TABLE sales_contracts MODIFY owner_personnel_type varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;");
            migrationBuilder.Sql("ALTER TABLE commission_policy_versions MODIFY personnel_type varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
            => throw new NotSupportedException("Personnel and financial policy snapshots must be preserved. Use a reviewed forward repair migration.");
    }
}

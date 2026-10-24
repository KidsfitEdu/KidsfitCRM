using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AppendCommissionCorrections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "idempotency_key",
                table: "commission_ledger_entries",
                type: "varchar(120)",
                maxLength: 120,
                nullable: true,
                collation: "utf8mb4_bin");

            migrationBuilder.AddColumn<string>(
                name: "reason",
                table: "commission_ledger_entries",
                type: "varchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "related_entry_id",
                table: "commission_ledger_entries",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "request_fingerprint",
                table: "commission_ledger_entries",
                type: "varchar(64)",
                maxLength: 64,
                nullable: true,
                collation: "utf8mb4_bin");

            migrationBuilder.CreateIndex(
                name: "IX_commission_ledger_entries_idempotency_key",
                table: "commission_ledger_entries",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_commission_ledger_entries_related_entry_id",
                table: "commission_ledger_entries",
                column: "related_entry_id");

            migrationBuilder.AddForeignKey(
                name: "FK_commission_ledger_entries_commission_ledger_entries_related_~",
                table: "commission_ledger_entries",
                column: "related_entry_id",
                principalTable: "commission_ledger_entries",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_commission_ledger_entries_commission_ledger_entries_related_~",
                table: "commission_ledger_entries");

            migrationBuilder.DropIndex(
                name: "IX_commission_ledger_entries_idempotency_key",
                table: "commission_ledger_entries");

            migrationBuilder.DropIndex(
                name: "IX_commission_ledger_entries_related_entry_id",
                table: "commission_ledger_entries");

            migrationBuilder.DropColumn(
                name: "idempotency_key",
                table: "commission_ledger_entries");

            migrationBuilder.DropColumn(
                name: "reason",
                table: "commission_ledger_entries");

            migrationBuilder.DropColumn(
                name: "related_entry_id",
                table: "commission_ledger_entries");

            migrationBuilder.DropColumn(
                name: "request_fingerprint",
                table: "commission_ledger_entries");
        }
    }
}

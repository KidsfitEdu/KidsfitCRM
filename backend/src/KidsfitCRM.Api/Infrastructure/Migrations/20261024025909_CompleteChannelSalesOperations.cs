using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CompleteChannelSalesOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "request_fingerprint",
                table: "sales_contracts",
                type: "varchar(64)",
                maxLength: 64,
                nullable: true,
                collation: "utf8mb4_bin");

            migrationBuilder.AddColumn<string>(
                name: "request_fingerprint",
                table: "revenue_receipts",
                type: "varchar(64)",
                maxLength: 64,
                nullable: true,
                collation: "utf8mb4_bin");

            migrationBuilder.AddColumn<DateTime>(
                name: "approved_at",
                table: "payouts",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "approved_by_user_id",
                table: "payouts",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "beneficiary_user_id",
                table: "payouts",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "idempotency_key",
                table: "payouts",
                type: "varchar(120)",
                maxLength: 120,
                nullable: true,
                collation: "utf8mb4_bin");

            migrationBuilder.AddColumn<long>(
                name: "paid_by_user_id",
                table: "payouts",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payment_reference",
                table: "payouts",
                type: "varchar(120)",
                maxLength: 120,
                nullable: true,
                collation: "utf8mb4_bin");

            migrationBuilder.AddColumn<string>(
                name: "request_fingerprint",
                table: "payouts",
                type: "varchar(64)",
                maxLength: 64,
                nullable: true,
                collation: "utf8mb4_bin");

            migrationBuilder.AddColumn<string>(
                name: "withholding_reason",
                table: "payouts",
                type: "varchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "commission_rate_ceiling",
                table: "organizations",
                type: "decimal(9,4)",
                precision: 9,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "request_fingerprint",
                table: "approach_registrations",
                type: "varchar(64)",
                maxLength: 64,
                nullable: true,
                collation: "utf8mb4_bin");

            migrationBuilder.CreateTable(
                name: "payout_events",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    payout_id = table.Column<long>(type: "bigint", nullable: false),
                    actor_user_id = table.Column<long>(type: "bigint", nullable: false),
                    event_type = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    reason = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payout_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_payout_events_payouts_payout_id",
                        column: x => x.payout_id,
                        principalTable: "payouts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payout_events_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateIndex(
                name: "IX_payouts_approved_by_user_id",
                table: "payouts",
                column: "approved_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_payouts_beneficiary_user_id",
                table: "payouts",
                column: "beneficiary_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_payouts_idempotency_key",
                table: "payouts",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payouts_paid_by_user_id",
                table: "payouts",
                column: "paid_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_payouts_payment_reference",
                table: "payouts",
                column: "payment_reference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payout_events_actor_user_id",
                table: "payout_events",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_payout_events_payout_id_created_at",
                table: "payout_events",
                columns: new[] { "payout_id", "created_at" });

            migrationBuilder.AddForeignKey(
                name: "FK_payouts_users_approved_by_user_id",
                table: "payouts",
                column: "approved_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_payouts_users_beneficiary_user_id",
                table: "payouts",
                column: "beneficiary_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_payouts_users_paid_by_user_id",
                table: "payouts",
                column: "paid_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_payouts_users_approved_by_user_id",
                table: "payouts");

            migrationBuilder.DropForeignKey(
                name: "FK_payouts_users_beneficiary_user_id",
                table: "payouts");

            migrationBuilder.DropForeignKey(
                name: "FK_payouts_users_paid_by_user_id",
                table: "payouts");

            migrationBuilder.DropTable(
                name: "payout_events");

            migrationBuilder.DropIndex(
                name: "IX_payouts_approved_by_user_id",
                table: "payouts");

            migrationBuilder.DropIndex(
                name: "IX_payouts_beneficiary_user_id",
                table: "payouts");

            migrationBuilder.DropIndex(
                name: "IX_payouts_idempotency_key",
                table: "payouts");

            migrationBuilder.DropIndex(
                name: "IX_payouts_paid_by_user_id",
                table: "payouts");

            migrationBuilder.DropIndex(
                name: "IX_payouts_payment_reference",
                table: "payouts");

            migrationBuilder.DropColumn(
                name: "request_fingerprint",
                table: "sales_contracts");

            migrationBuilder.DropColumn(
                name: "request_fingerprint",
                table: "revenue_receipts");

            migrationBuilder.DropColumn(
                name: "approved_at",
                table: "payouts");

            migrationBuilder.DropColumn(
                name: "approved_by_user_id",
                table: "payouts");

            migrationBuilder.DropColumn(
                name: "beneficiary_user_id",
                table: "payouts");

            migrationBuilder.DropColumn(
                name: "idempotency_key",
                table: "payouts");

            migrationBuilder.DropColumn(
                name: "paid_by_user_id",
                table: "payouts");

            migrationBuilder.DropColumn(
                name: "payment_reference",
                table: "payouts");

            migrationBuilder.DropColumn(
                name: "request_fingerprint",
                table: "payouts");

            migrationBuilder.DropColumn(
                name: "withholding_reason",
                table: "payouts");

            migrationBuilder.DropColumn(
                name: "commission_rate_ceiling",
                table: "organizations");

            migrationBuilder.DropColumn(
                name: "request_fingerprint",
                table: "approach_registrations");
        }
    }
}

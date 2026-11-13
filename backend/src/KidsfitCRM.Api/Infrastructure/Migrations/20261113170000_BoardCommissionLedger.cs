using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>Preserve historical ledger amounts and policy codes before retiring the redundant policy table.</summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261113170000_BoardCommissionLedger")]
public sealed class BoardCommissionLedger : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<long>("board_policy_version_id", "commission_ledger_entries", type:"bigint", nullable:true);
        migrationBuilder.AddColumn<string>("policy_source", "commission_ledger_entries", type:"varchar(24)", maxLength:24,
            nullable:false, defaultValue:"LEGACY", collation:"utf8mb4_bin");
        migrationBuilder.AddColumn<string>("legacy_policy_code", "commission_ledger_entries", type:"varchar(48)",
            maxLength:48, nullable:true);
        migrationBuilder.AddColumn<string>("beneficiary_role", "commission_ledger_entries", type:"varchar(16)",
            maxLength:16, nullable:false, defaultValue:"SALES", collation:"utf8mb4_bin");
        migrationBuilder.AddColumn<string>("beneficiary_role", "payouts", type:"varchar(16)",
            maxLength:16, nullable:false, defaultValue:"SALES", collation:"utf8mb4_bin");

        migrationBuilder.Sql("""
            UPDATE commission_ledger_entries AS e
            INNER JOIN commission_policy_versions AS p ON e.policy_version_id = p.id
            SET e.legacy_policy_code = p.code, e.policy_source = 'LEGACY'
            """);
        migrationBuilder.DropForeignKey("FK_commission_ledger_entries_commission_policy_versions_policy_~",
            "commission_ledger_entries");
        migrationBuilder.DropIndex("IX_commission_ledger_entries_policy_version_id", "commission_ledger_entries");
        migrationBuilder.DropForeignKey(
            "FK_commission_ledger_entries_revenue_receipts_revenue_receipt_id",
            "commission_ledger_entries");
        migrationBuilder.DropIndex("IX_commission_ledger_entries_revenue_receipt_id", "commission_ledger_entries");
        migrationBuilder.CreateIndex("IX_commission_ledger_entries_revenue_receipt_id_beneficiary_role",
            "commission_ledger_entries", new[] { "revenue_receipt_id", "beneficiary_role" }, unique:true);
        migrationBuilder.AddForeignKey(
            "FK_commission_ledger_entries_revenue_receipts_revenue_receipt_id",
            "commission_ledger_entries", "revenue_receipt_id", "revenue_receipts", "id",
            onDelete:ReferentialAction.Restrict);
        migrationBuilder.DropColumn("policy_version_id", "commission_ledger_entries");
        migrationBuilder.CreateIndex("IX_commission_ledger_entries_board_policy_version_id",
            "commission_ledger_entries", "board_policy_version_id");
        migrationBuilder.AddForeignKey(
            "FK_commission_ledger_entries_board_commission_policy_versions_~",
            "commission_ledger_entries", "board_policy_version_id", "board_commission_policy_versions", "id",
            onDelete:ReferentialAction.Restrict);
        migrationBuilder.DropTable("commission_policy_versions");
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        throw new NotSupportedException("Legacy financial policy metadata needs a backup and explicit reversal.");
}

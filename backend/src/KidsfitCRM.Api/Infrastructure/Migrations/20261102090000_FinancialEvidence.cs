using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>Private immutable financial image/PDF evidence. Additive; no legacy data removed.</summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261102090000_FinancialEvidence")]
public sealed class FinancialEvidenceMigration : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "financial_evidences",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false).Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                kind = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                contract_id = table.Column<long>(type: "bigint", nullable: true),
                revenue_receipt_id = table.Column<long>(type: "bigint", nullable: true),
                payout_id = table.Column<long>(type: "bigint", nullable: true),
                uploaded_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                file_name = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: false),
                mime_type = table.Column<string>(type: "varchar(48)", maxLength: 48, nullable: false),
                sha256 = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                bytes = table.Column<byte[]>(type: "longblob", nullable: false),
                attached_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_financial_evidences", x => x.id));
        migrationBuilder.CreateIndex(name: "IX_financial_evidences_contract_id", table: "financial_evidences", column: "contract_id");
        migrationBuilder.CreateIndex(name: "IX_financial_evidences_payout_id", table: "financial_evidences", column: "payout_id");
        migrationBuilder.CreateIndex(name: "IX_financial_evidences_revenue_receipt_id", table: "financial_evidences", column: "revenue_receipt_id", unique: true);
        migrationBuilder.CreateIndex(name: "IX_financial_evidences_uploaded_by_user_id_created_at",
            table: "financial_evidences", columns: new[] { "uploaded_by_user_id", "created_at" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // No silent deletion of bank transfer evidence on rollback.
        throw new NotSupportedException("Financial evidence must be archived according to retention policy before reverting this migration.");
    }
}

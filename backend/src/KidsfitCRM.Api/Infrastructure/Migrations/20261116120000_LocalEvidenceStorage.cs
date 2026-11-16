using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>
/// Development-only storage cutover: old DB-backed evidence files are intentionally discarded.
/// Does not modify contracts, receipts, payouts or their audit/ledger history.
/// </summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261116120000_LocalEvidenceStorage")]
public sealed class LocalEvidenceStorageMigration : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Approved for the development database only. Uploaded sample evidence
        // cannot be accessed after removal of the bytes column.
        migrationBuilder.Sql("DELETE FROM financial_evidences");

        migrationBuilder.DropColumn(name: "bytes", table: "financial_evidences");
        migrationBuilder.AddColumn<string>(
            name: "storage_key", table: "financial_evidences",
            type: "varchar(64)", maxLength: 64, nullable: false,
            collation: "utf8mb4_bin");
        migrationBuilder.AddColumn<long>(
            name: "file_size", table: "financial_evidences",
            type: "bigint", nullable: false);
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        throw new NotSupportedException("Discarded development evidence bytes cannot be reconstructed.");
}

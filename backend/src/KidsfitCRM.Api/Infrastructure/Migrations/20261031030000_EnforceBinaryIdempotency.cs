using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>
/// MySQL 8.4 provider may ignore the per-column collation specified in generated
/// CreateTable; enforce it explicitly for keys whose case matters for idempotency.
/// This migration is additive and intentionally leaves InitialCRM unchanged.
/// </summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261031030000_EnforceBinaryIdempotency")]
public sealed class EnforceBinaryIdempotency : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Keep the current lengths/nullability and unique indexes; no data is removed.
        foreach (var table in new[]
        {
            "school_proposals",
            "school_invitations",
            "school_extension_requests",
            "revenue_refunds",
            "approach_registrations",
            "sales_contracts",
            "revenue_receipts",
        })
        {
            migrationBuilder.Sql($"ALTER TABLE `{table}` MODIFY COLUMN `idempotency_key` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;");
        }
        migrationBuilder.Sql("ALTER TABLE `payouts` MODIFY COLUMN `idempotency_key` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;");
        migrationBuilder.Sql("ALTER TABLE `school_proposal_alerts` MODIFY COLUMN `deduplication_key` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Downgrading case-sensitive unique keys can collapse previously distinct IDs.
        throw new NotSupportedException("Binary idempotency keys cannot safely be downgraded.");
    }
}

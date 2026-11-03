using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261103163000_CskhTechnicalSupport")]
public sealed class CskhTechnicalSupport : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "ticket_type", table: "customer_support_cases",
            type: "varchar(32)", maxLength: 32, nullable: false, defaultValue: "LEGACY");
        migrationBuilder.AddColumn<long>(name: "checkee_organization_id", table: "customer_support_cases",
            type: "bigint", nullable: true);
        migrationBuilder.AddColumn<DateTime>(name: "forwarded_at", table: "customer_support_cases",
            type: "datetime(6)", nullable: true);
        migrationBuilder.AddColumn<long>(name: "forwarded_by_user_id", table: "customer_support_cases",
            type: "bigint", nullable: true);
        migrationBuilder.AddColumn<DateTime>(name: "checkee_responded_at", table: "customer_support_cases",
            type: "datetime(6)", nullable: true);
        migrationBuilder.CreateIndex(name: "ix_support_checkee_status_created", table: "customer_support_cases",
            columns: new[] { "checkee_organization_id", "status", "created_at" });
        migrationBuilder.CreateIndex(name: "ix_support_forwarded_by", table: "customer_support_cases",
            column: "forwarded_by_user_id");
        migrationBuilder.AddForeignKey(name: "fk_support_checkee_org", table: "customer_support_cases",
            column: "checkee_organization_id", principalTable: "organizations", principalColumn: "id",
            onDelete: ReferentialAction.Restrict);
        migrationBuilder.AddForeignKey(name: "fk_support_forwarded_user", table: "customer_support_cases",
            column: "forwarded_by_user_id", principalTable: "users", principalColumn: "id",
            onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // These records contain support routing and audit history: require manual rollback review.
        throw new NotSupportedException("Không tự động xóa dữ liệu xử lý kỹ thuật đã ghi nhận.");
    }
}

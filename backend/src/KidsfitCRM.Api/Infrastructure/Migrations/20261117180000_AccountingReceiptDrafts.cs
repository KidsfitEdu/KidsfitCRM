using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>Receipt drafts never affect collected cash, receivables or commission until posted.</summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261117180000_AccountingReceiptDrafts")]
public sealed class AccountingReceiptDrafts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "revenue_receipt_drafts",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("MySQL:ValueGenerationStrategy",
                        MySql.EntityFrameworkCore.Metadata.MySQLValueGenerationStrategy.IdentityColumn),
                contract_id = table.Column<long>(type: "bigint", nullable: false),
                revenue_schedule_id = table.Column<long>(type: "bigint", nullable: true),
                amount = table.Column<decimal>(type: "decimal(19,0)", nullable: true),
                received_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                reference_code = table.Column<string>(type: "varchar(64)", maxLength: 64,
                    collation: "utf8mb4_bin", nullable: true),
                payment_method = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                posted_receipt_id = table.Column<long>(type: "bigint", nullable: true),
                created_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_revenue_receipt_drafts", x => x.id);
                table.ForeignKey("FK_revenue_receipt_drafts_sales_contracts_contract_id",
                    x => x.contract_id, "sales_contracts", "id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_revenue_receipt_drafts_revenue_schedules_revenue_schedule_id",
                    x => x.revenue_schedule_id, "revenue_schedules", "id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_revenue_receipt_drafts_revenue_receipts_posted_receipt_id",
                    x => x.posted_receipt_id, "revenue_receipts", "id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_revenue_receipt_drafts_users_created_by_user_id",
                    x => x.created_by_user_id, "users", "id", onDelete: ReferentialAction.Restrict);
            });
        migrationBuilder.CreateIndex(
            name: "IX_revenue_receipt_drafts_created_by_user_id_status_updated_at",
            table: "revenue_receipt_drafts", columns: new[]{"created_by_user_id","status","updated_at"});
        migrationBuilder.CreateIndex(name:"IX_revenue_receipt_drafts_contract_id",
            table:"revenue_receipt_drafts",column:"contract_id");
        migrationBuilder.CreateIndex(name:"IX_revenue_receipt_drafts_revenue_schedule_id",
            table:"revenue_receipt_drafts",column:"revenue_schedule_id");
        migrationBuilder.CreateIndex(name:"IX_revenue_receipt_drafts_posted_receipt_id",
            table:"revenue_receipt_drafts",column:"posted_receipt_id",unique:true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("revenue_receipt_drafts");
    }
}

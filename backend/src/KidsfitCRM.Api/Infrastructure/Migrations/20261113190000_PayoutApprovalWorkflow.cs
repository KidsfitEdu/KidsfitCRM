using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261113190000_PayoutApprovalWorkflow")]
public sealed class PayoutApprovalWorkflow : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<decimal>("suggested_rate_percent", "payouts", type: "decimal(9,4)", nullable: false, defaultValue: 0m);
        migrationBuilder.AddColumn<decimal>("requested_rate_percent", "payouts", type: "decimal(9,4)", nullable: false, defaultValue: 0m);
        migrationBuilder.AddColumn<decimal>("suggested_amount", "payouts", type: "decimal(19,0)", nullable: false, defaultValue: 0m);
        migrationBuilder.AddColumn<decimal>("requested_amount", "payouts", type: "decimal(19,0)", nullable: false, defaultValue: 0m);
        migrationBuilder.AddColumn<string>("adjustment_reason", "payouts", type: "varchar(1000)", maxLength:1000, nullable: true);
        migrationBuilder.AddColumn<DateTime>("submitted_at", "payouts", type: "datetime(6)", nullable: true);
        // Keep existing financial amounts and payout history unchanged.
        migrationBuilder.Sql("""
            UPDATE payouts
            SET suggested_amount = gross_amount,
                requested_amount = gross_amount,
                requested_rate_percent = 0,
                suggested_rate_percent = 0,
                submitted_at = CASE WHEN status IN ('APPROVED', 'PAID') THEN approved_at ELSE NULL END
            """);
        // Previously-approved payouts remain APPROVED/PAID. Existing DRAFT payouts
        // must be explicitly submitted before they can be approved under the new workflow.
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn("suggested_rate_percent", "payouts");
        migrationBuilder.DropColumn("requested_rate_percent", "payouts");
        migrationBuilder.DropColumn("suggested_amount", "payouts");
        migrationBuilder.DropColumn("requested_amount", "payouts");
        migrationBuilder.DropColumn("adjustment_reason", "payouts");
        migrationBuilder.DropColumn("submitted_at", "payouts");
    }
}

using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
#nullable disable
namespace KidsfitCRM.Api.Infrastructure.Migrations;
/// <summary>
/// Development-only consolidation approved by product owner. Previous applied
/// migration history is preserved; only disposable legacy alert rows are dropped.
/// </summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261123123000_UnifiedCrmNotifications")]
public sealed class UnifiedCrmNotifications : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>("due_at", "crm_notifications", type: "datetime(6)", nullable: true);
        migrationBuilder.AddColumn<DateOnly>("due_on", "crm_notifications", type: "date", nullable: true);
        migrationBuilder.AddColumn<DateOnly>("milestone_on", "crm_notifications", type: "date", nullable: true);
        migrationBuilder.DropTable("contract_expiry_alerts");
        migrationBuilder.DropTable("school_proposal_alerts");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Historical rows were intentionally discarded. A rollback cannot restore
        // these notifications; restore the isolated pre-migration backup if required.
        migrationBuilder.Sql("SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unified notifications migration is not reversible; restore backup.'");
    }
}

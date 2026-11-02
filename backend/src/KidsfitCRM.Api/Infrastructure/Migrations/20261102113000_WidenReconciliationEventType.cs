using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>
/// Allow descriptive audit event names for manager-to-CHECKEE handoffs.
/// Additive, non-destructive: preserves all existing reconciliation events.
/// </summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261102113000_WidenReconciliationEventType")]
public sealed class WidenReconciliationEventType : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<string>(
            name: "event_type", table: "reconciliation_events",
            type: "varchar(64)", maxLength: 64, nullable: false,
            oldClrType: typeof(string), oldType: "varchar(24)", oldMaxLength: 24);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Older schemas can truncate audit event names; never silently lose history.
        throw new NotSupportedException("Reconciliation history cannot safely be reduced to 24 characters.");
    }
}

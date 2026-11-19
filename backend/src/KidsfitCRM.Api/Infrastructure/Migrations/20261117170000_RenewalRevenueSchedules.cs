using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>Bind new scheduled receivables to a confirmed renewal; preserve original cash and schedules.</summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261117170000_RenewalRevenueSchedules")]
public sealed class RenewalRevenueSchedules : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<long>(
            name: "contract_renewal_id",
            table: "revenue_schedules",
            type: "bigint",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_revenue_schedules_contract_renewal_id_due_on",
            table: "revenue_schedules",
            columns: new[] { "contract_renewal_id", "due_on" },
            unique: true);

        migrationBuilder.AddForeignKey(
            name: "FK_revenue_schedules_contract_renewals_contract_renewal_id",
            table: "revenue_schedules",
            column: "contract_renewal_id",
            principalTable: "contract_renewals",
            principalColumn: "id",
            onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_revenue_schedules_contract_renewals_contract_renewal_id",
            table: "revenue_schedules");
        migrationBuilder.DropIndex(
            name: "IX_revenue_schedules_contract_renewal_id_due_on",
            table: "revenue_schedules");
        migrationBuilder.DropColumn(
            name: "contract_renewal_id",
            table: "revenue_schedules");
    }
}

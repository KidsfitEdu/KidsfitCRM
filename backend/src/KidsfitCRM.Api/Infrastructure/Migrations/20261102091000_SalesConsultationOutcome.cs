using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>Add optional structured consultation fields while preserving all historical notes.</summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261102091000_SalesConsultationOutcome")]
public sealed class SalesConsultationOutcome : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "outcome", table: "customer_activities",
            type: "varchar(40)", maxLength: 40, nullable: true);
        migrationBuilder.AddColumn<string>(name: "evidence_reference", table: "customer_activities",
            type: "varchar(500)", maxLength: 500, nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "outcome", table: "customer_activities");
        migrationBuilder.DropColumn(name: "evidence_reference", table: "customer_activities");
    }
}

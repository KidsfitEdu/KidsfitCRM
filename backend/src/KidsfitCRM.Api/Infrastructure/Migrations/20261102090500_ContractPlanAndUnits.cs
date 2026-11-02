using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>Store the package and participating branch snapshot without repricing signed agreements.</summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261102090500_ContractPlanAndUnits")]
public sealed class ContractPlanAndUnits : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "service_plan", table: "sales_contracts",
            type: "varchar(32)", maxLength: 32, nullable: true);
        migrationBuilder.AddColumn<int>(name: "student_count", table: "sales_contracts",
            type: "int", nullable: true);
        migrationBuilder.AddColumn<string>(name: "school_unit_ids_json", table: "sales_contracts",
            type: "json", nullable: true);
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "service_plan", table: "sales_contracts");
        migrationBuilder.DropColumn(name: "student_count", table: "sales_contracts");
        migrationBuilder.DropColumn(name: "school_unit_ids_json", table: "sales_contracts");
    }
}

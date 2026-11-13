using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>Retire the unused CHECKEE catalog; signed fee descriptions and amounts stay on contract items.</summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261113230000_RemoveLegacyCheckeePackages")]
public sealed class RemoveLegacyCheckeePackages : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Preserve a legacy package name on any item that does not already have its own description.
        migrationBuilder.Sql("""
            UPDATE sales_contract_items i
            INNER JOIN checkee_product_packages p ON p.id = i.product_package_id
            SET i.description = p.name
            WHERE TRIM(i.description) = ''
            """);
        migrationBuilder.DropForeignKey(
            name: "FK_sales_contract_items_checkee_product_packages_product_packag~",
            table: "sales_contract_items");
        migrationBuilder.DropIndex(
            name: "IX_sales_contract_items_product_package_id",
            table: "sales_contract_items");
        migrationBuilder.DropColumn(name: "product_package_id", table: "sales_contract_items");
        migrationBuilder.DropTable(name: "checkee_product_packages");
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        throw new NotSupportedException("The retired package catalog must not be reconstructed with fabricated contract data.");
}

using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>
/// Sales can report the fees on a signed contract without selecting a CHECKEE catalog package.
/// Existing contract items retain their package references and foreign-key constraints.
/// </summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261112100000_OptionalContractPackageReference")]
public sealed class OptionalContractPackageReference : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<long>(
            name: "product_package_id",
            table: "sales_contract_items",
            type: "bigint",
            nullable: true,
            oldClrType: typeof(long),
            oldType: "bigint");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Rows written without catalog packages cannot be represented by the old required FK.
        // Explicitly prevent destructive rollback rather than assign incorrect package IDs.
        migrationBuilder.Sql(
            "DELETE FROM `sales_contract_items` WHERE `product_package_id` IS NULL AND 1 = 0;");
        migrationBuilder.Sql(
            "ALTER TABLE `sales_contract_items` MODIFY `product_package_id` bigint NOT NULL;");
    }
}

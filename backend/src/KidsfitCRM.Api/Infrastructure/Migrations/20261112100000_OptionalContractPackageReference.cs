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
        migrationBuilder.DropForeignKey(
            name: "FK_sales_contract_items_checkee_product_packages_product_packag~",
            table: "sales_contract_items");
        migrationBuilder.AlterColumn<long>(
            name: "product_package_id",
            table: "sales_contract_items",
            type: "bigint",
            nullable: true,
            oldClrType: typeof(long),
            oldType: "bigint");
        migrationBuilder.AddForeignKey(
            name: "FK_sales_contract_items_checkee_product_packages_product_packag~",
            table: "sales_contract_items",
            column: "product_package_id",
            principalTable: "checkee_product_packages",
            principalColumn: "id",
            onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // MySQL rejects this rollback if manual-fee items have NULL package IDs.
        // Never delete or assign artificial package IDs to make the downgrade pass.
        migrationBuilder.DropForeignKey(
            name: "FK_sales_contract_items_checkee_product_packages_product_packag~",
            table: "sales_contract_items");
        migrationBuilder.AlterColumn<long>(
            name: "product_package_id",
            table: "sales_contract_items",
            type: "bigint",
            nullable: false,
            oldClrType: typeof(long),
            oldType: "bigint",
            oldNullable: true);
        migrationBuilder.AddForeignKey(
            name: "FK_sales_contract_items_checkee_product_packages_product_packag~",
            table: "sales_contract_items",
            column: "product_package_id",
            principalTable: "checkee_product_packages",
            principalColumn: "id",
            onDelete: ReferentialAction.Restrict);
    }
}

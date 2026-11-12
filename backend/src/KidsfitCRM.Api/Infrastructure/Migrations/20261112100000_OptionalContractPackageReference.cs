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
        // MySQL rejects this rollback when manual-fee items have NULL package IDs.
        // It intentionally does not delete or misassign historical contract items.
        migrationBuilder.AlterColumn<long>(
            name: "product_package_id",
            table: "sales_contract_items",
            type: "bigint",
            nullable: false,
            oldClrType: typeof(long),
            oldType: "bigint",
            oldNullable: true);
    }
}

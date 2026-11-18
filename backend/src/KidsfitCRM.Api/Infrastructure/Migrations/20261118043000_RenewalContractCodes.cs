using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>Store an independent contract code for new renewals; preserve legacy rows.</summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261118043000_RenewalContractCodes")]
public sealed class RenewalContractCodes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "contract_code",
            table: "contract_renewals",
            type: "varchar(64)",
            maxLength: 64,
            nullable: true,
            collation: "utf8mb4_bin");

        migrationBuilder.CreateIndex(
            name: "IX_contract_renewals_contract_code",
            table: "contract_renewals",
            column: "contract_code",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_contract_renewals_contract_code", table: "contract_renewals");
        migrationBuilder.DropColumn(name: "contract_code", table: "contract_renewals");
    }
}

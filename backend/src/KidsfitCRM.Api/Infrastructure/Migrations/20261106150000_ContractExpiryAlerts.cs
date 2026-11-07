using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>NT-01 standalone durable alerts; unrelated proposal notices remain unchanged.</summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261106150000_ContractExpiryAlerts")]
public sealed class ContractExpiryAlerts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "contract_expiry_alerts",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                contract_id = table.Column<long>(type: "bigint", nullable: false),
                recipient_user_id = table.Column<long>(type: "bigint", nullable: false),
                kind = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                deduplication_key = table.Column<string>(type: "varchar(180)", maxLength: 180, nullable: false, collation: "utf8mb4_bin"),
                status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                due_on = table.Column<DateOnly>(type: "date", nullable: false),
                milestone_on = table.Column<DateOnly>(type: "date", nullable: false),
                read_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                resolved_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_contract_expiry_alerts", x => x.id);
                table.ForeignKey("FK_contract_expiry_alerts_sales_contracts_contract_id", x => x.contract_id,
                    "sales_contracts", "id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_contract_expiry_alerts_users_recipient_user_id", x => x.recipient_user_id,
                    "users", "id", onDelete: ReferentialAction.Restrict);
            });
        migrationBuilder.CreateIndex("IX_contract_expiry_alerts_deduplication_key", "contract_expiry_alerts",
            "deduplication_key", unique: true);
        migrationBuilder.CreateIndex("IX_contract_expiry_alerts_recipient_user_id_status_created_at", "contract_expiry_alerts",
            new[] { "recipient_user_id", "status", "created_at" });
        migrationBuilder.CreateIndex("IX_contract_expiry_alerts_contract_id_status", "contract_expiry_alerts",
            new[] { "contract_id", "status" });
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.DropTable("contract_expiry_alerts");
}

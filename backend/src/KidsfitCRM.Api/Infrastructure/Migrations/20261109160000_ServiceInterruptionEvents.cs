using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261109160000_ServiceInterruptionEvents")]
public sealed class ServiceInterruptionEvents : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "service_interruption_events",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                customer_id = table.Column<long>(type: "bigint", nullable: false),
                contract_id = table.Column<long>(type: "bigint", nullable: false),
                protection_id = table.Column<long>(type: "bigint", nullable: true),
                gap_start_on = table.Column<DateOnly>(type: "date", nullable: false),
                threshold_on = table.Column<DateOnly>(type: "date", nullable: false),
                status = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                reason = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: false),
                deduplication_key = table.Column<string>(type: "varchar(180)", maxLength: 180, nullable: false,
                    collation: "utf8mb4_bin"),
                processed_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_service_interruption_events", x => x.id);
                table.ForeignKey("FK_gi01_customers", x => x.customer_id, "channel_customers", "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_gi01_contracts", x => x.contract_id, "sales_contracts", "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_gi01_protections", x => x.protection_id, "customer_protections", "id",
                    onDelete: ReferentialAction.Restrict);
            });
        migrationBuilder.CreateIndex("IX_gi01_deduplication_key", "service_interruption_events",
            "deduplication_key", unique: true);
        migrationBuilder.CreateIndex("IX_gi01_customer_status", "service_interruption_events",
            new[] { "customer_id", "status" });
        migrationBuilder.CreateIndex("IX_gi01_contract_threshold", "service_interruption_events",
            new[] { "contract_id", "threshold_on" });
    }
    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.DropTable("service_interruption_events");
}

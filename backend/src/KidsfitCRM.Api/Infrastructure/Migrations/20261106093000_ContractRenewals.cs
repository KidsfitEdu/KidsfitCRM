using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>Append-only yearly renewal cases, independent of source contract protection and money.</summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261106093000_ContractRenewals")]
public sealed class ContractRenewals : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "contract_renewals",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false).Annotation("MySQL:ValueGenerationStrategy", MySql.EntityFrameworkCore.Metadata.MySQLValueGenerationStrategy.IdentityColumn),
                contract_id = table.Column<long>(type: "bigint", nullable: false),
                renewal_no = table.Column<int>(type: "int", nullable: false),
                idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, collation: "utf8mb4_bin", nullable: false),
                request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, collation: "utf8mb4_bin", nullable: false),
                submitted_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                signed_on = table.Column<DateTime>(type: "date", nullable: false),
                service_start_on = table.Column<DateTime>(type: "date", nullable: false),
                service_end_on = table.Column<DateTime>(type: "date", nullable: false),
                payment_cycle = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                total_value = table.Column<decimal>(type: "decimal(19,0)", nullable: false),
                status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                submitted_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                reviewed_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                reviewed_by_user_id = table.Column<long>(type: "bigint", nullable: true),
                decision_reason = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true),
                created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_contract_renewals", x => x.id);
                table.ForeignKey("FK_contract_renewals_sales_contracts_contract_id", x => x.contract_id, "sales_contracts", "id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_contract_renewals_users_submitted_by_user_id", x => x.submitted_by_user_id, "users", "id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_contract_renewals_users_reviewed_by_user_id", x => x.reviewed_by_user_id, "users", "id", onDelete: ReferentialAction.Restrict);
            });
        migrationBuilder.CreateIndex(name: "IX_contract_renewals_contract_id_renewal_no", table: "contract_renewals", columns: new[] { "contract_id", "renewal_no" }, unique: true);
        migrationBuilder.CreateIndex(name: "IX_contract_renewals_idempotency_key", table: "contract_renewals", column: "idempotency_key", unique: true);
        migrationBuilder.CreateIndex(name: "IX_contract_renewals_status_submitted_at", table: "contract_renewals", columns: new[] { "status", "submitted_at" });
        migrationBuilder.CreateIndex(name: "IX_contract_renewals_submitted_by_user_id", table: "contract_renewals", column: "submitted_by_user_id");
        migrationBuilder.CreateIndex(name: "IX_contract_renewals_reviewed_by_user_id", table: "contract_renewals", column: "reviewed_by_user_id");

        migrationBuilder.CreateTable(
            name: "contract_renewal_events",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false).Annotation("MySQL:ValueGenerationStrategy", MySql.EntityFrameworkCore.Metadata.MySQLValueGenerationStrategy.IdentityColumn),
                contract_renewal_id = table.Column<long>(type: "bigint", nullable: false),
                actor_user_id = table.Column<long>(type: "bigint", nullable: false),
                event_type = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                reason = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true),
                created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_contract_renewal_events", x => x.id);
                table.ForeignKey("FK_contract_renewal_events_contract_renewals_contract_renewal_id", x => x.contract_renewal_id, "contract_renewals", "id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("FK_contract_renewal_events_users_actor_user_id", x => x.actor_user_id, "users", "id", onDelete: ReferentialAction.Restrict);
            });
        migrationBuilder.CreateIndex(name: "IX_contract_renewal_events_contract_renewal_id_created_at", table: "contract_renewal_events", columns: new[] { "contract_renewal_id", "created_at" });
        migrationBuilder.CreateIndex(name: "IX_contract_renewal_events_actor_user_id", table: "contract_renewal_events", column: "actor_user_id");

        migrationBuilder.AddColumn<long>(name: "contract_renewal_id", table: "financial_evidences", type: "bigint", nullable: true);
        migrationBuilder.CreateIndex(name: "IX_financial_evidences_contract_renewal_id", table: "financial_evidences", column: "contract_renewal_id");
        migrationBuilder.AddForeignKey(name: "FK_financial_evidences_contract_renewals_contract_renewal_id",
            table: "financial_evidences", column: "contract_renewal_id", principalTable: "contract_renewals", principalColumn: "id", onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(name: "FK_financial_evidences_contract_renewals_contract_renewal_id", table: "financial_evidences");
        migrationBuilder.DropIndex(name: "IX_financial_evidences_contract_renewal_id", table: "financial_evidences");
        migrationBuilder.DropColumn(name: "contract_renewal_id", table: "financial_evidences");
        migrationBuilder.DropTable(name: "contract_renewal_events");
        migrationBuilder.DropTable(name: "contract_renewals");
    }
}

using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

/// <summary>Non-destructive CSKH/CHECKEE support routing. Existing support cases default to usage guidance.</summary>
[DbContext(typeof(KidsfitDbContext))]
[Migration("20261103110000_CustomerCareSupportRouting")]
public sealed class CustomerCareSupportRouting : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>("ticket_type", "customer_support_cases", type: "varchar(32)",
            maxLength: 32, nullable: false, defaultValue: "USAGE_GUIDANCE");
        migrationBuilder.AddColumn<long>("checkee_organization_id", "customer_support_cases", type: "bigint", nullable: true);
        migrationBuilder.AddColumn<long>("forwarded_by_user_id", "customer_support_cases", type: "bigint", nullable: true);
        migrationBuilder.AddColumn<DateTime>("forwarded_at", "customer_support_cases", type: "datetime(6)", nullable: true);
        migrationBuilder.AddColumn<DateTime>("checkee_responded_at", "customer_support_cases", type: "datetime(6)", nullable: true);

        migrationBuilder.AddColumn<string>("acceptance_status", "contract_care_handovers", type: "varchar(32)",
            maxLength: 32, nullable: false, defaultValue: "ACCEPTED");
        migrationBuilder.AddColumn<DateTime>("accepted_at", "contract_care_handovers", type: "datetime(6)", nullable: true);
        migrationBuilder.AddColumn<long>("accepted_by_user_id", "contract_care_handovers", type: "bigint", nullable: true);
        migrationBuilder.AddColumn<string>("acceptance_note", "contract_care_handovers", type: "text", nullable: true);

        migrationBuilder.CreateIndex("ix_support_checkee_status_created",
            "customer_support_cases", new[] { "checkee_organization_id", "status", "created_at" });
        migrationBuilder.CreateIndex("IX_customer_support_cases_forwarded_by_user_id",
            "customer_support_cases", "forwarded_by_user_id");
        migrationBuilder.CreateIndex("IX_contract_care_handovers_accepted_by_user_id",
            "contract_care_handovers", "accepted_by_user_id");

        migrationBuilder.AddForeignKey("FK_customer_support_cases_organizations_checkee_organization_id",
            "customer_support_cases", "checkee_organization_id", "organizations", principalColumn: "id", onDelete: ReferentialAction.Restrict);
        migrationBuilder.AddForeignKey("FK_customer_support_cases_users_forwarded_by_user_id",
            "customer_support_cases", "forwarded_by_user_id", "users", principalColumn: "id", onDelete: ReferentialAction.Restrict);
        migrationBuilder.AddForeignKey("FK_contract_care_handovers_users_accepted_by_user_id",
            "contract_care_handovers", "accepted_by_user_id", "users", principalColumn: "id", onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        throw new NotSupportedException("Không tự động xóa dữ liệu phân luồng hỗ trợ và lịch sử tiếp nhận.");
    }
}

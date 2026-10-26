using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSchoolOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "version",
                table: "school_units",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<long>(
                name: "care_organization_id",
                table: "sales_contracts",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "care_user_id",
                table: "sales_contracts",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "commitment",
                table: "customer_activities",
                type: "varchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "contact_name",
                table: "customer_activities",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "contact_position",
                table: "customer_activities",
                type: "varchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "feedback",
                table: "customer_activities",
                type: "varchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "occurred_at",
                table: "customer_activities",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "support_case_id",
                table: "customer_activities",
                type: "bigint",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "display_name",
                table: "channel_customers",
                type: "varchar(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(190)",
                oldMaxLength: 190);

            migrationBuilder.AlterColumn<string>(
                name: "contact_name",
                table: "channel_customers",
                type: "varchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "varchar(190)",
                oldMaxLength: 190,
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "contract_cancellations",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    contract_id = table.Column<long>(type: "bigint", nullable: false),
                    actor_user_id = table.Column<long>(type: "bigint", nullable: false),
                    reason = table.Column<string>(type: "text", nullable: false),
                    decision_reference = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false),
                    previous_status = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contract_cancellations", x => x.id);
                    table.ForeignKey(
                        name: "FK_contract_cancellations_sales_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "sales_contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_contract_cancellations_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "contract_care_handovers",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    contract_id = table.Column<long>(type: "bigint", nullable: false),
                    previous_user_id = table.Column<long>(type: "bigint", nullable: true),
                    assigned_user_id = table.Column<long>(type: "bigint", nullable: false),
                    care_organization_id = table.Column<long>(type: "bigint", nullable: false),
                    actor_user_id = table.Column<long>(type: "bigint", nullable: false),
                    reason = table.Column<string>(type: "text", nullable: false),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contract_care_handovers", x => x.id);
                    table.ForeignKey(
                        name: "FK_contract_care_handovers_organizations_care_organization_id",
                        column: x => x.care_organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_contract_care_handovers_sales_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "sales_contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_contract_care_handovers_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_contract_care_handovers_users_assigned_user_id",
                        column: x => x.assigned_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_contract_care_handovers_users_previous_user_id",
                        column: x => x.previous_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "customer_support_cases",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    contract_id = table.Column<long>(type: "bigint", nullable: false),
                    customer_id = table.Column<long>(type: "bigint", nullable: false),
                    organization_id = table.Column<long>(type: "bigint", nullable: false),
                    assigned_user_id = table.Column<long>(type: "bigint", nullable: false),
                    created_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                    subject = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    outcome = table.Column<string>(type: "text", nullable: true),
                    resolved_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_support_cases", x => x.id);
                    table.ForeignKey(
                        name: "FK_customer_support_cases_channel_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "channel_customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_support_cases_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_support_cases_sales_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "sales_contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_support_cases_users_assigned_user_id",
                        column: x => x.assigned_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_support_cases_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "revenue_refunds",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    revenue_receipt_id = table.Column<long>(type: "bigint", nullable: false),
                    contract_id = table.Column<long>(type: "bigint", nullable: false),
                    recorded_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                    amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    refunded_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    reference_code = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    reason = table.Column<string>(type: "text", nullable: false),
                    decision_reference = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_revenue_refunds", x => x.id);
                    table.ForeignKey(
                        name: "FK_revenue_refunds_revenue_receipts_revenue_receipt_id",
                        column: x => x.revenue_receipt_id,
                        principalTable: "revenue_receipts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_revenue_refunds_sales_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "sales_contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_revenue_refunds_users_recorded_by_user_id",
                        column: x => x.recorded_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "school_deferrals",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    directory_school_id = table.Column<long>(type: "bigint", nullable: false),
                    organization_id = table.Column<long>(type: "bigint", nullable: false),
                    manager_user_id = table.Column<long>(type: "bigint", nullable: false),
                    reason = table.Column<string>(type: "text", nullable: false),
                    review_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    status = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_deferrals", x => x.id);
                    table.ForeignKey(
                        name: "FK_school_deferrals_directory_schools_directory_school_id",
                        column: x => x.directory_school_id,
                        principalTable: "directory_schools",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_deferrals_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_deferrals_users_manager_user_id",
                        column: x => x.manager_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "school_disputes",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    customer_id = table.Column<long>(type: "bigint", nullable: false),
                    organization_id = table.Column<long>(type: "bigint", nullable: false),
                    opened_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                    reason = table.Column<string>(type: "text", nullable: false),
                    evidence_reference = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false),
                    status = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    decision = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: true),
                    decision_reason = table.Column<string>(type: "text", nullable: true),
                    resolved_by_user_id = table.Column<long>(type: "bigint", nullable: true),
                    resolved_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_disputes", x => x.id);
                    table.ForeignKey(
                        name: "FK_school_disputes_channel_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "channel_customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_disputes_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_disputes_users_opened_by_user_id",
                        column: x => x.opened_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_disputes_users_resolved_by_user_id",
                        column: x => x.resolved_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "school_handovers",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    membership_id = table.Column<long>(type: "bigint", nullable: false),
                    organization_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    completed_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                    reason = table.Column<string>(type: "text", nullable: false),
                    summary = table.Column<string>(type: "text", nullable: false),
                    revoked_registrations = table.Column<int>(type: "int", nullable: false),
                    account_suspended = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_handovers", x => x.id);
                    table.ForeignKey(
                        name: "FK_school_handovers_organization_memberships_membership_id",
                        column: x => x.membership_id,
                        principalTable: "organization_memberships",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_handovers_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_handovers_users_completed_by_user_id",
                        column: x => x.completed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_handovers_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "school_invitations",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    directory_school_id = table.Column<long>(type: "bigint", nullable: false),
                    organization_id = table.Column<long>(type: "bigint", nullable: false),
                    assigned_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                    assignee_user_id = table.Column<long>(type: "bigint", nullable: false),
                    status = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    respond_by = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    responded_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    reason = table.Column<string>(type: "text", nullable: false),
                    response_reason = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: true),
                    approach_registration_id = table.Column<long>(type: "bigint", nullable: true),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_invitations", x => x.id);
                    table.ForeignKey(
                        name: "FK_school_invitations_approach_registrations_approach_registrat~",
                        column: x => x.approach_registration_id,
                        principalTable: "approach_registrations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_invitations_directory_schools_directory_school_id",
                        column: x => x.directory_school_id,
                        principalTable: "directory_schools",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_invitations_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_invitations_users_assigned_by_user_id",
                        column: x => x.assigned_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_invitations_users_assignee_user_id",
                        column: x => x.assignee_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "school_proposals",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    organization_id = table.Column<long>(type: "bigint", nullable: false),
                    submitted_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                    manager_user_id = table.Column<long>(type: "bigint", nullable: false),
                    school_code = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    name = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false),
                    province = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                    ward = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                    address = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true),
                    contact_name = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true),
                    contact_position = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: true),
                    contact_phone = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true),
                    email = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: true),
                    reason = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    review_due_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    manager_reviewed_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    reviewed_by_user_id = table.Column<long>(type: "bigint", nullable: true),
                    decision_reason = table.Column<string>(type: "text", nullable: true),
                    directory_school_id = table.Column<long>(type: "bigint", nullable: true),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_proposals", x => x.id);
                    table.ForeignKey(
                        name: "FK_school_proposals_directory_schools_directory_school_id",
                        column: x => x.directory_school_id,
                        principalTable: "directory_schools",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_proposals_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_proposals_users_manager_user_id",
                        column: x => x.manager_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_proposals_users_reviewed_by_user_id",
                        column: x => x.reviewed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_proposals_users_submitted_by_user_id",
                        column: x => x.submitted_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "school_unit_revisions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    school_unit_id = table.Column<long>(type: "bigint", nullable: false),
                    actor_user_id = table.Column<long>(type: "bigint", nullable: false),
                    version = table.Column<int>(type: "int", nullable: false),
                    reason = table.Column<string>(type: "text", nullable: false),
                    before_values = table.Column<string>(type: "json", nullable: false),
                    after_values = table.Column<string>(type: "json", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_unit_revisions", x => x.id);
                    table.ForeignKey(
                        name: "FK_school_unit_revisions_school_units_school_unit_id",
                        column: x => x.school_unit_id,
                        principalTable: "school_units",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_unit_revisions_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "school_workflow_policies",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    organization_id = table.Column<long>(type: "bigint", nullable: false),
                    version = table.Column<int>(type: "int", nullable: false),
                    status = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    manager_review_hours = table.Column<int>(type: "int", nullable: false),
                    admin_review_hours = table.Column<int>(type: "int", nullable: false),
                    invitation_hours = table.Column<int>(type: "int", nullable: false),
                    max_extension_days = table.Column<int>(type: "int", nullable: false),
                    max_extension_count = table.Column<int>(type: "int", nullable: false),
                    max_total_extension_days = table.Column<int>(type: "int", nullable: false),
                    decision_reference = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    created_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_workflow_policies", x => x.id);
                    table.ForeignKey(
                        name: "FK_school_workflow_policies_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_workflow_policies_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "school_extension_requests",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    approach_registration_id = table.Column<long>(type: "bigint", nullable: false),
                    organization_id = table.Column<long>(type: "bigint", nullable: false),
                    requested_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                    manager_user_id = table.Column<long>(type: "bigint", nullable: false),
                    requested_until = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    original_protected_until = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    review_due_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    next_appointment_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    progress = table.Column<string>(type: "text", nullable: false),
                    evidence_reference = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false),
                    status = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    approved_until = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    next_review_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    reviewed_by_user_id = table.Column<long>(type: "bigint", nullable: true),
                    reviewed_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    decision_reason = table.Column<string>(type: "text", nullable: true),
                    policy_version_id = table.Column<long>(type: "bigint", nullable: true),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_extension_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_school_extension_requests_approach_registrations_approach_re~",
                        column: x => x.approach_registration_id,
                        principalTable: "approach_registrations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_extension_requests_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_extension_requests_school_workflow_policies_policy_ve~",
                        column: x => x.policy_version_id,
                        principalTable: "school_workflow_policies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_extension_requests_users_manager_user_id",
                        column: x => x.manager_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_extension_requests_users_requested_by_user_id",
                        column: x => x.requested_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_extension_requests_users_reviewed_by_user_id",
                        column: x => x.reviewed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateIndex(
                name: "IX_sales_contracts_care_organization_id",
                table: "sales_contracts",
                column: "care_organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_contracts_care_user_id",
                table: "sales_contracts",
                column: "care_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_activities_support_case_id",
                table: "customer_activities",
                column: "support_case_id");

            migrationBuilder.CreateIndex(
                name: "IX_contract_cancellations_actor_user_id",
                table: "contract_cancellations",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_contract_cancellations_contract_id",
                table: "contract_cancellations",
                column: "contract_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_contract_cancellations_idempotency_key",
                table: "contract_cancellations",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_contract_care_handovers_actor_user_id",
                table: "contract_care_handovers",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_contract_care_handovers_assigned_user_id",
                table: "contract_care_handovers",
                column: "assigned_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_contract_care_handovers_care_organization_id",
                table: "contract_care_handovers",
                column: "care_organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_contract_care_handovers_contract_id",
                table: "contract_care_handovers",
                column: "contract_id");

            migrationBuilder.CreateIndex(
                name: "IX_contract_care_handovers_idempotency_key",
                table: "contract_care_handovers",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_contract_care_handovers_previous_user_id",
                table: "contract_care_handovers",
                column: "previous_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_support_cases_assigned_user_id",
                table: "customer_support_cases",
                column: "assigned_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_support_cases_contract_id",
                table: "customer_support_cases",
                column: "contract_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_support_cases_created_by_user_id",
                table: "customer_support_cases",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_support_cases_customer_id",
                table: "customer_support_cases",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_support_cases_idempotency_key",
                table: "customer_support_cases",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_customer_support_cases_organization_id",
                table: "customer_support_cases",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_revenue_refunds_contract_id",
                table: "revenue_refunds",
                column: "contract_id");

            migrationBuilder.CreateIndex(
                name: "IX_revenue_refunds_idempotency_key",
                table: "revenue_refunds",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_revenue_refunds_recorded_by_user_id",
                table: "revenue_refunds",
                column: "recorded_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_revenue_refunds_reference_code",
                table: "revenue_refunds",
                column: "reference_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_revenue_refunds_revenue_receipt_id",
                table: "revenue_refunds",
                column: "revenue_receipt_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_deferrals_directory_school_id",
                table: "school_deferrals",
                column: "directory_school_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_deferrals_idempotency_key",
                table: "school_deferrals",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_school_deferrals_manager_user_id",
                table: "school_deferrals",
                column: "manager_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_deferrals_organization_id",
                table: "school_deferrals",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_disputes_customer_id",
                table: "school_disputes",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_disputes_idempotency_key",
                table: "school_disputes",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_school_disputes_opened_by_user_id",
                table: "school_disputes",
                column: "opened_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_disputes_organization_id",
                table: "school_disputes",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_disputes_resolved_by_user_id",
                table: "school_disputes",
                column: "resolved_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_extension_requests_approach_registration_id_status",
                table: "school_extension_requests",
                columns: new[] { "approach_registration_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_school_extension_requests_idempotency_key",
                table: "school_extension_requests",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_school_extension_requests_manager_user_id_status_review_due_~",
                table: "school_extension_requests",
                columns: new[] { "manager_user_id", "status", "review_due_at" });

            migrationBuilder.CreateIndex(
                name: "IX_school_extension_requests_organization_id",
                table: "school_extension_requests",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_extension_requests_policy_version_id",
                table: "school_extension_requests",
                column: "policy_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_extension_requests_requested_by_user_id",
                table: "school_extension_requests",
                column: "requested_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_extension_requests_reviewed_by_user_id",
                table: "school_extension_requests",
                column: "reviewed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_handovers_completed_by_user_id",
                table: "school_handovers",
                column: "completed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_handovers_idempotency_key",
                table: "school_handovers",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_school_handovers_membership_id",
                table: "school_handovers",
                column: "membership_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_handovers_organization_id",
                table: "school_handovers",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_handovers_user_id",
                table: "school_handovers",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_invitations_approach_registration_id",
                table: "school_invitations",
                column: "approach_registration_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_invitations_assigned_by_user_id",
                table: "school_invitations",
                column: "assigned_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_invitations_assignee_user_id_status",
                table: "school_invitations",
                columns: new[] { "assignee_user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_school_invitations_directory_school_id_status_respond_by",
                table: "school_invitations",
                columns: new[] { "directory_school_id", "status", "respond_by" });

            migrationBuilder.CreateIndex(
                name: "IX_school_invitations_idempotency_key",
                table: "school_invitations",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_school_invitations_organization_id",
                table: "school_invitations",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_proposals_directory_school_id",
                table: "school_proposals",
                column: "directory_school_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_proposals_idempotency_key",
                table: "school_proposals",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_school_proposals_manager_user_id_status_review_due_at",
                table: "school_proposals",
                columns: new[] { "manager_user_id", "status", "review_due_at" });

            migrationBuilder.CreateIndex(
                name: "IX_school_proposals_organization_id",
                table: "school_proposals",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_proposals_reviewed_by_user_id",
                table: "school_proposals",
                column: "reviewed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_proposals_status_review_due_at",
                table: "school_proposals",
                columns: new[] { "status", "review_due_at" });

            migrationBuilder.CreateIndex(
                name: "IX_school_proposals_submitted_by_user_id",
                table: "school_proposals",
                column: "submitted_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_unit_revisions_actor_user_id",
                table: "school_unit_revisions",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_unit_revisions_school_unit_id_version",
                table: "school_unit_revisions",
                columns: new[] { "school_unit_id", "version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_school_workflow_policies_created_by_user_id",
                table: "school_workflow_policies",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_workflow_policies_organization_id_decision_reference",
                table: "school_workflow_policies",
                columns: new[] { "organization_id", "decision_reference" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_school_workflow_policies_organization_id_version",
                table: "school_workflow_policies",
                columns: new[] { "organization_id", "version" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_customer_activities_customer_support_cases_support_case_id",
                table: "customer_activities",
                column: "support_case_id",
                principalTable: "customer_support_cases",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_sales_contracts_organizations_care_organization_id",
                table: "sales_contracts",
                column: "care_organization_id",
                principalTable: "organizations",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_sales_contracts_users_care_user_id",
                table: "sales_contracts",
                column: "care_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            // Add capabilities to existing installations without enabling fixtures or draft policies.
            migrationBuilder.Sql("""
                INSERT INTO permissions (code, name, `group`, created_at, updated_at)
                SELECT s.code, s.name, 'CHECKEE', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
                FROM (
                    SELECT 'channel_sales.school.proposal.submit' AS code, 'Submit school proposals' AS name
                    UNION ALL SELECT 'channel_sales.school.proposal.review', 'Review school proposals'
                    UNION ALL SELECT 'channel_sales.school.allocation.manage', 'Manage school allocations'
                    UNION ALL SELECT 'channel_sales.school.extension.review', 'Review approach extensions'
                    UNION ALL SELECT 'channel_sales.school.dispute.resolve', 'Resolve school disputes'
                    UNION ALL SELECT 'channel_sales.school.escalation.resolve', 'Resolve overdue school work'
                    UNION ALL SELECT 'channel_sales.school.handover.manage', 'Manage personnel handovers'
                    UNION ALL SELECT 'channel_sales.school.care.assign', 'Assign customer care'
                    UNION ALL SELECT 'channel_sales.school.support.manage', 'Manage customer support cases'
                    UNION ALL SELECT 'channel_sales.school.workflow_policy.manage', 'Approve workflow policy versions'
                    UNION ALL SELECT 'channel_sales.contract.cancel', 'Record contract cancellation'
                    UNION ALL SELECT 'channel_sales.revenue.refund', 'Record actual revenue refunds'
                ) AS s
                WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.code = s.code);
                """);
            migrationBuilder.Sql("""
                INSERT INTO permission_role (permission_id, role_id)
                SELECT p.id, r.id FROM permissions p CROSS JOIN roles r
                WHERE p.code IN (
                    'channel_sales.school.proposal.submit', 'channel_sales.school.proposal.review',
                    'channel_sales.school.allocation.manage', 'channel_sales.school.extension.review',
                    'channel_sales.school.dispute.resolve', 'channel_sales.school.escalation.resolve',
                    'channel_sales.school.handover.manage', 'channel_sales.school.care.assign',
                    'channel_sales.school.support.manage', 'channel_sales.school.workflow_policy.manage',
                    'channel_sales.contract.cancel', 'channel_sales.revenue.refund')
                AND (r.code = 'ADMIN'
                    OR (r.code = 'BOARD' AND p.code IN ('channel_sales.school.dispute.resolve', 'channel_sales.school.escalation.resolve'))
                    OR (r.code IN ('SALES_MANAGER', 'PARTNER_ADMIN') AND p.code IN ('channel_sales.school.proposal.review', 'channel_sales.school.allocation.manage', 'channel_sales.school.extension.review', 'channel_sales.school.handover.manage', 'channel_sales.school.care.assign'))
                    OR (r.code IN ('SALES', 'CHANNEL_SALES', 'PARTNER_COLLABORATOR') AND p.code = 'channel_sales.school.proposal.submit')
                    OR (r.code = 'ACCOUNTANT' AND p.code IN ('channel_sales.contract.cancel', 'channel_sales.revenue.refund'))
                    OR (r.code = 'CUSTOMER_CARE' AND p.code = 'channel_sales.school.support.manage'))
                AND NOT EXISTS (SELECT 1 FROM permission_role pr WHERE pr.permission_id = p.id AND pr.role_id = r.id);
                """);

            // Connector/NET 10.0.12 omits relational column collations in generated SQL.
            // Enforce declared binary semantics on records used by these workflows.
            // This does not rewrite stored identifiers or remove historical records.
            foreach (var table in new[] { "contract_cancellations", "contract_care_handovers", "customer_support_cases",
                "revenue_refunds", "school_deferrals", "school_disputes", "school_extension_requests", "school_handovers",
                "school_invitations", "school_proposals" })
            {
                migrationBuilder.Sql($"ALTER TABLE {table} MODIFY idempotency_key varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL, MODIFY request_fingerprint varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;");
            }
            migrationBuilder.Sql("""
                ALTER TABLE school_workflow_policies MODIFY decision_reference varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL, MODIFY request_fingerprint varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
                ALTER TABLE school_proposals MODIFY school_code varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
                ALTER TABLE revenue_refunds MODIFY reference_code varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
                ALTER TABLE directory_schools MODIFY school_code varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
                ALTER TABLE school_units MODIFY content_hash varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
                ALTER TABLE school_import_batches MODIFY idempotency_key varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL, MODIFY file_hash varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
                ALTER TABLE customer_identifiers MODIFY normalized_value varchar(190) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
                ALTER TABLE approach_registrations MODIFY idempotency_key varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL, MODIFY request_fingerprint varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;
                ALTER TABLE sales_contracts MODIFY contract_code varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL, MODIFY idempotency_key varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL, MODIFY request_fingerprint varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;
                ALTER TABLE revenue_receipts MODIFY reference_code varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL, MODIFY idempotency_key varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL, MODIFY request_fingerprint varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;
                ALTER TABLE commission_ledger_entries MODIFY idempotency_key varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL, MODIFY request_fingerprint varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;
                ALTER TABLE payouts MODIFY idempotency_key varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL, MODIFY request_fingerprint varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL, MODIFY payment_reference varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
            => throw new NotSupportedException("This migration preserves financial and audit history. Roll forward with a reviewed repair migration; automatic downgrade is disabled.");
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChannelSales : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "checkee_product_packages",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    code = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    name = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: false),
                    description = table.Column<string>(type: "longtext", nullable: true),
                    list_price = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_checkee_product_packages", x => x.id);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "organizations",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    code = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    name = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: false),
                    organization_type = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organizations", x => x.id);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "channel_customers",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    code = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    customer_type = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    display_name = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: false),
                    legal_name = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: true),
                    tax_code = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: true),
                    phone = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true),
                    phone_normalized = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: true),
                    email = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: true),
                    website = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: true),
                    checkee_customer_code = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true),
                    province = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true),
                    district = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true),
                    address = table.Column<string>(type: "longtext", nullable: true),
                    contact_name = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: true),
                    contact_position = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: true),
                    source = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: true),
                    note = table.Column<string>(type: "longtext", nullable: true),
                    lifecycle_status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    verification_status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    created_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                    organization_id = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_channel_customers", x => x.id);
                    table.ForeignKey(
                        name: "FK_channel_customers_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_channel_customers_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "commission_policy_versions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    organization_id = table.Column<long>(type: "bigint", nullable: true),
                    code = table.Column<string>(type: "varchar(48)", maxLength: 48, nullable: false),
                    name = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: false),
                    rate_percent = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    effective_from = table.Column<DateTime>(type: "date", nullable: false),
                    effective_until = table.Column<DateTime>(type: "date", nullable: true),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    created_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_commission_policy_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_commission_policy_versions_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_commission_policy_versions_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "organization_memberships",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    organization_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    manager_user_id = table.Column<long>(type: "bigint", nullable: true),
                    membership_type = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    is_primary = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_memberships", x => x.id);
                    table.ForeignKey(
                        name: "FK_organization_memberships_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_memberships_users_manager_user_id",
                        column: x => x.manager_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_organization_memberships_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "payouts",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    organization_id = table.Column<long>(type: "bigint", nullable: false),
                    code = table.Column<string>(type: "varchar(48)", maxLength: 48, nullable: false),
                    period = table.Column<string>(type: "varchar(7)", maxLength: 7, nullable: false),
                    gross_amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    withholding_amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    net_amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    paid_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    created_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payouts", x => x.id);
                    table.ForeignKey(
                        name: "FK_payouts_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payouts_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "approach_registrations",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    customer_id = table.Column<long>(type: "bigint", nullable: false),
                    owner_user_id = table.Column<long>(type: "bigint", nullable: false),
                    owner_organization_id = table.Column<long>(type: "bigint", nullable: false),
                    created_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    registered_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    protected_until = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    expired_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    source = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: true),
                    note = table.Column<string>(type: "longtext", nullable: true),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_approach_registrations", x => x.id);
                    table.ForeignKey(
                        name: "FK_approach_registrations_channel_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "channel_customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_approach_registrations_organizations_owner_organization_id",
                        column: x => x.owner_organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_approach_registrations_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_approach_registrations_users_owner_user_id",
                        column: x => x.owner_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "customer_identifiers",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    customer_id = table.Column<long>(type: "bigint", nullable: false),
                    identifier_type = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    normalized_value = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: false, collation: "utf8mb4_bin"),
                    display_value = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: false),
                    is_verified = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_identifiers", x => x.id);
                    table.ForeignKey(
                        name: "FK_customer_identifiers_channel_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "channel_customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "customer_activities",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    customer_id = table.Column<long>(type: "bigint", nullable: false),
                    approach_registration_id = table.Column<long>(type: "bigint", nullable: true),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    activity_type = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    content = table.Column<string>(type: "longtext", nullable: false),
                    next_follow_up_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_activities", x => x.id);
                    table.ForeignKey(
                        name: "FK_customer_activities_approach_registrations_approach_registra~",
                        column: x => x.approach_registration_id,
                        principalTable: "approach_registrations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_activities_channel_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "channel_customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_activities_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "sales_contracts",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    customer_id = table.Column<long>(type: "bigint", nullable: false),
                    approach_registration_id = table.Column<long>(type: "bigint", nullable: false),
                    owner_user_id = table.Column<long>(type: "bigint", nullable: false),
                    owner_organization_id = table.Column<long>(type: "bigint", nullable: false),
                    reported_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                    contract_code = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    signed_on = table.Column<DateTime>(type: "date", nullable: false),
                    effective_on = table.Column<DateTime>(type: "date", nullable: true),
                    total_value = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    currency = table.Column<string>(type: "varchar(3)", maxLength: 3, nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    protection_starts_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    protection_until = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    evidence_reference = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sales_contracts", x => x.id);
                    table.ForeignKey(
                        name: "FK_sales_contracts_approach_registrations_approach_registration~",
                        column: x => x.approach_registration_id,
                        principalTable: "approach_registrations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_contracts_channel_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "channel_customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_contracts_organizations_owner_organization_id",
                        column: x => x.owner_organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_contracts_users_owner_user_id",
                        column: x => x.owner_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_contracts_users_reported_by_user_id",
                        column: x => x.reported_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "customer_protections",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    customer_id = table.Column<long>(type: "bigint", nullable: false),
                    owner_user_id = table.Column<long>(type: "bigint", nullable: false),
                    owner_organization_id = table.Column<long>(type: "bigint", nullable: false),
                    approach_registration_id = table.Column<long>(type: "bigint", nullable: true),
                    contract_id = table.Column<long>(type: "bigint", nullable: true),
                    source_type = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    effective_from = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    effective_until = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_protections", x => x.id);
                    table.ForeignKey(
                        name: "FK_customer_protections_approach_registrations_approach_registr~",
                        column: x => x.approach_registration_id,
                        principalTable: "approach_registrations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_protections_channel_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "channel_customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_protections_organizations_owner_organization_id",
                        column: x => x.owner_organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_protections_sales_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "sales_contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_customer_protections_users_owner_user_id",
                        column: x => x.owner_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "reconciliation_cases",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    customer_id = table.Column<long>(type: "bigint", nullable: false),
                    contract_id = table.Column<long>(type: "bigint", nullable: false),
                    checkee_organization_id = table.Column<long>(type: "bigint", nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    dispute_reason = table.Column<string>(type: "longtext", nullable: true),
                    opened_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    resolved_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reconciliation_cases", x => x.id);
                    table.ForeignKey(
                        name: "FK_reconciliation_cases_channel_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "channel_customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reconciliation_cases_organizations_checkee_organization_id",
                        column: x => x.checkee_organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reconciliation_cases_sales_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "sales_contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "revenue_schedules",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    contract_id = table.Column<long>(type: "bigint", nullable: false),
                    amount_due = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    amount_received = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    due_on = table.Column<DateTime>(type: "date", nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_revenue_schedules", x => x.id);
                    table.ForeignKey(
                        name: "FK_revenue_schedules_sales_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "sales_contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "sales_contract_items",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    contract_id = table.Column<long>(type: "bigint", nullable: false),
                    product_package_id = table.Column<long>(type: "bigint", nullable: false),
                    description = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false),
                    quantity = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    unit_price = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sales_contract_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_sales_contract_items_checkee_product_packages_product_packag~",
                        column: x => x.product_package_id,
                        principalTable: "checkee_product_packages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_contract_items_sales_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "sales_contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "reconciliation_events",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    reconciliation_case_id = table.Column<long>(type: "bigint", nullable: false),
                    actor_user_id = table.Column<long>(type: "bigint", nullable: false),
                    event_type = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    reason = table.Column<string>(type: "longtext", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reconciliation_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_reconciliation_events_reconciliation_cases_reconciliation_ca~",
                        column: x => x.reconciliation_case_id,
                        principalTable: "reconciliation_cases",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reconciliation_events_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "revenue_receipts",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    contract_id = table.Column<long>(type: "bigint", nullable: false),
                    revenue_schedule_id = table.Column<long>(type: "bigint", nullable: true),
                    amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    received_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    reference_code = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    payment_method = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    recorded_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_revenue_receipts", x => x.id);
                    table.ForeignKey(
                        name: "FK_revenue_receipts_revenue_schedules_revenue_schedule_id",
                        column: x => x.revenue_schedule_id,
                        principalTable: "revenue_schedules",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_revenue_receipts_sales_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "sales_contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_revenue_receipts_users_recorded_by_user_id",
                        column: x => x.recorded_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "commission_ledger_entries",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    contract_id = table.Column<long>(type: "bigint", nullable: false),
                    revenue_receipt_id = table.Column<long>(type: "bigint", nullable: true),
                    policy_version_id = table.Column<long>(type: "bigint", nullable: false),
                    beneficiary_user_id = table.Column<long>(type: "bigint", nullable: false),
                    beneficiary_organization_id = table.Column<long>(type: "bigint", nullable: false),
                    entry_type = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    calculation_base = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    rate_percent = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    period = table.Column<string>(type: "varchar(7)", maxLength: 7, nullable: false),
                    occurred_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    created_by_user_id = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_commission_ledger_entries", x => x.id);
                    table.ForeignKey(
                        name: "FK_commission_ledger_entries_commission_policy_versions_policy_~",
                        column: x => x.policy_version_id,
                        principalTable: "commission_policy_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_commission_ledger_entries_organizations_beneficiary_organiza~",
                        column: x => x.beneficiary_organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_commission_ledger_entries_revenue_receipts_revenue_receipt_id",
                        column: x => x.revenue_receipt_id,
                        principalTable: "revenue_receipts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_commission_ledger_entries_sales_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "sales_contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_commission_ledger_entries_users_beneficiary_user_id",
                        column: x => x.beneficiary_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_commission_ledger_entries_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "payout_items",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    payout_id = table.Column<long>(type: "bigint", nullable: false),
                    commission_ledger_entry_id = table.Column<long>(type: "bigint", nullable: false),
                    amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payout_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_payout_items_commission_ledger_entries_commission_ledger_ent~",
                        column: x => x.commission_ledger_entry_id,
                        principalTable: "commission_ledger_entries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payout_items_payouts_payout_id",
                        column: x => x.payout_id,
                        principalTable: "payouts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateIndex(
                name: "IX_approach_registrations_created_by_user_id",
                table: "approach_registrations",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_approach_registrations_customer_id_status_protected_until",
                table: "approach_registrations",
                columns: new[] { "customer_id", "status", "protected_until" });

            migrationBuilder.CreateIndex(
                name: "IX_approach_registrations_idempotency_key",
                table: "approach_registrations",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_approach_registrations_owner_organization_id",
                table: "approach_registrations",
                column: "owner_organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_approach_registrations_owner_user_id_status_protected_until",
                table: "approach_registrations",
                columns: new[] { "owner_user_id", "status", "protected_until" });

            migrationBuilder.CreateIndex(
                name: "IX_channel_customers_code",
                table: "channel_customers",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_channel_customers_created_by_user_id",
                table: "channel_customers",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_channel_customers_organization_id_lifecycle_status",
                table: "channel_customers",
                columns: new[] { "organization_id", "lifecycle_status" });

            migrationBuilder.CreateIndex(
                name: "IX_channel_customers_phone_normalized",
                table: "channel_customers",
                column: "phone_normalized");

            migrationBuilder.CreateIndex(
                name: "IX_checkee_product_packages_code",
                table: "checkee_product_packages",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_commission_ledger_entries_beneficiary_organization_id",
                table: "commission_ledger_entries",
                column: "beneficiary_organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_commission_ledger_entries_beneficiary_user_id_period_status",
                table: "commission_ledger_entries",
                columns: new[] { "beneficiary_user_id", "period", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_commission_ledger_entries_contract_id",
                table: "commission_ledger_entries",
                column: "contract_id");

            migrationBuilder.CreateIndex(
                name: "IX_commission_ledger_entries_created_by_user_id",
                table: "commission_ledger_entries",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_commission_ledger_entries_policy_version_id",
                table: "commission_ledger_entries",
                column: "policy_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_commission_ledger_entries_revenue_receipt_id",
                table: "commission_ledger_entries",
                column: "revenue_receipt_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_commission_policy_versions_code",
                table: "commission_policy_versions",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_commission_policy_versions_created_by_user_id",
                table: "commission_policy_versions",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_commission_policy_versions_organization_id_status_effective_~",
                table: "commission_policy_versions",
                columns: new[] { "organization_id", "status", "effective_from" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_activities_approach_registration_id",
                table: "customer_activities",
                column: "approach_registration_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_activities_customer_id_created_at",
                table: "customer_activities",
                columns: new[] { "customer_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_activities_user_id",
                table: "customer_activities",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_identifiers_customer_id",
                table: "customer_identifiers",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_identifiers_identifier_type_normalized_value",
                table: "customer_identifiers",
                columns: new[] { "identifier_type", "normalized_value" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_customer_protections_approach_registration_id",
                table: "customer_protections",
                column: "approach_registration_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_protections_contract_id",
                table: "customer_protections",
                column: "contract_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_protections_customer_id_status_effective_until",
                table: "customer_protections",
                columns: new[] { "customer_id", "status", "effective_until" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_protections_owner_organization_id",
                table: "customer_protections",
                column: "owner_organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_protections_owner_user_id_status_effective_until",
                table: "customer_protections",
                columns: new[] { "owner_user_id", "status", "effective_until" });

            migrationBuilder.CreateIndex(
                name: "IX_organization_memberships_manager_user_id",
                table: "organization_memberships",
                column: "manager_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_organization_memberships_organization_id_user_id",
                table: "organization_memberships",
                columns: new[] { "organization_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_organization_memberships_user_id_status",
                table: "organization_memberships",
                columns: new[] { "user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_organizations_code",
                table: "organizations",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payout_items_commission_ledger_entry_id",
                table: "payout_items",
                column: "commission_ledger_entry_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payout_items_payout_id",
                table: "payout_items",
                column: "payout_id");

            migrationBuilder.CreateIndex(
                name: "IX_payouts_code",
                table: "payouts",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payouts_created_by_user_id",
                table: "payouts",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_payouts_organization_id_period",
                table: "payouts",
                columns: new[] { "organization_id", "period" });

            migrationBuilder.CreateIndex(
                name: "IX_reconciliation_cases_checkee_organization_id_status",
                table: "reconciliation_cases",
                columns: new[] { "checkee_organization_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_reconciliation_cases_contract_id",
                table: "reconciliation_cases",
                column: "contract_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_reconciliation_cases_customer_id",
                table: "reconciliation_cases",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "IX_reconciliation_events_actor_user_id",
                table: "reconciliation_events",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_reconciliation_events_reconciliation_case_id_created_at",
                table: "reconciliation_events",
                columns: new[] { "reconciliation_case_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_revenue_receipts_contract_id_received_at",
                table: "revenue_receipts",
                columns: new[] { "contract_id", "received_at" });

            migrationBuilder.CreateIndex(
                name: "IX_revenue_receipts_idempotency_key",
                table: "revenue_receipts",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_revenue_receipts_recorded_by_user_id",
                table: "revenue_receipts",
                column: "recorded_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_revenue_receipts_reference_code",
                table: "revenue_receipts",
                column: "reference_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_revenue_receipts_revenue_schedule_id",
                table: "revenue_receipts",
                column: "revenue_schedule_id");

            migrationBuilder.CreateIndex(
                name: "IX_revenue_schedules_contract_id_status_due_on",
                table: "revenue_schedules",
                columns: new[] { "contract_id", "status", "due_on" });

            migrationBuilder.CreateIndex(
                name: "IX_sales_contract_items_contract_id",
                table: "sales_contract_items",
                column: "contract_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_contract_items_product_package_id",
                table: "sales_contract_items",
                column: "product_package_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_contracts_approach_registration_id",
                table: "sales_contracts",
                column: "approach_registration_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_contracts_contract_code",
                table: "sales_contracts",
                column: "contract_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sales_contracts_customer_id_status_protection_until",
                table: "sales_contracts",
                columns: new[] { "customer_id", "status", "protection_until" });

            migrationBuilder.CreateIndex(
                name: "IX_sales_contracts_idempotency_key",
                table: "sales_contracts",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sales_contracts_owner_organization_id",
                table: "sales_contracts",
                column: "owner_organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_contracts_owner_user_id",
                table: "sales_contracts",
                column: "owner_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_contracts_reported_by_user_id",
                table: "sales_contracts",
                column: "reported_by_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "customer_activities");

            migrationBuilder.DropTable(
                name: "customer_identifiers");

            migrationBuilder.DropTable(
                name: "customer_protections");

            migrationBuilder.DropTable(
                name: "organization_memberships");

            migrationBuilder.DropTable(
                name: "payout_items");

            migrationBuilder.DropTable(
                name: "reconciliation_events");

            migrationBuilder.DropTable(
                name: "sales_contract_items");

            migrationBuilder.DropTable(
                name: "commission_ledger_entries");

            migrationBuilder.DropTable(
                name: "payouts");

            migrationBuilder.DropTable(
                name: "reconciliation_cases");

            migrationBuilder.DropTable(
                name: "checkee_product_packages");

            migrationBuilder.DropTable(
                name: "commission_policy_versions");

            migrationBuilder.DropTable(
                name: "revenue_receipts");

            migrationBuilder.DropTable(
                name: "revenue_schedules");

            migrationBuilder.DropTable(
                name: "sales_contracts");

            migrationBuilder.DropTable(
                name: "approach_registrations");

            migrationBuilder.DropTable(
                name: "channel_customers");

            migrationBuilder.DropTable(
                name: "organizations");
        }
    }
}

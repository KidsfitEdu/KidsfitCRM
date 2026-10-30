using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCRM : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: true),
                    action = table.Column<string>(type: "longtext", nullable: false),
                    entity_type = table.Column<string>(type: "longtext", nullable: false),
                    entity_id = table.Column<long>(type: "bigint", nullable: false),
                    old_values = table.Column<string>(type: "json", nullable: true),
                    new_values = table.Column<string>(type: "json", nullable: true),
                    ip_address = table.Column<string>(type: "longtext", nullable: true),
                    user_agent = table.Column<string>(type: "longtext", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.id);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

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
                    commission_rate_ceiling = table.Column<decimal>(type: "decimal(9,4)", precision: 9, scale: 4, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organizations", x => x.id);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "permissions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    code = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: false),
                    name = table.Column<string>(type: "varchar(160)", maxLength: 160, nullable: false),
                    group = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_permissions", x => x.id);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    code = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    name = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.id);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    code = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    name = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: false),
                    email = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: false),
                    phone = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true),
                    email_verified_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    password = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    last_login_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "permission_role",
                columns: table => new
                {
                    permission_id = table.Column<long>(type: "bigint", nullable: false),
                    role_id = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_permission_role", x => new { x.permission_id, x.role_id });
                    table.ForeignKey(
                        name: "FK_permission_role_permissions_permission_id",
                        column: x => x.permission_id,
                        principalTable: "permissions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_permission_role_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
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
                    display_name = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false),
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
                    contact_name = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true),
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
                    personnel_type = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: true, collation: "utf8mb4_bin"),
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
                    school_approach_limit = table.Column<int>(type: "int", nullable: false, defaultValue: 10),
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
                    beneficiary_user_id = table.Column<long>(type: "bigint", nullable: true),
                    code = table.Column<string>(type: "varchar(48)", maxLength: 48, nullable: false),
                    period = table.Column<string>(type: "varchar(7)", maxLength: 7, nullable: false),
                    gross_amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    withholding_amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    net_amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    paid_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    approved_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    approved_by_user_id = table.Column<long>(type: "bigint", nullable: true),
                    paid_by_user_id = table.Column<long>(type: "bigint", nullable: true),
                    payment_reference = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: true, collation: "utf8mb4_bin"),
                    withholding_reason = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: true, collation: "utf8mb4_bin"),
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true, collation: "utf8mb4_bin"),
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
                        name: "FK_payouts_users_approved_by_user_id",
                        column: x => x.approved_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payouts_users_beneficiary_user_id",
                        column: x => x.beneficiary_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payouts_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payouts_users_paid_by_user_id",
                        column: x => x.paid_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "role_user",
                columns: table => new
                {
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    role_id = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role_user", x => new { x.role_id, x.user_id });
                    table.ForeignKey(
                        name: "FK_role_user_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_role_user_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "school_import_batches",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    file_hash = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    actor_user_id = table.Column<long>(type: "bigint", nullable: false),
                    organization_id = table.Column<long>(type: "bigint", nullable: false),
                    schools_created = table.Column<int>(type: "int", nullable: false),
                    units_created = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_import_batches", x => x.id);
                    table.ForeignKey(
                        name: "FK_school_import_batches_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_import_batches_users_actor_user_id",
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
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true, collation: "utf8mb4_bin"),
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
                name: "directory_schools",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    school_code = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    customer_id = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_directory_schools", x => x.id);
                    table.ForeignKey(
                        name: "FK_directory_schools_channel_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "channel_customers",
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
                name: "school_capacity_changes",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    membership_id = table.Column<long>(type: "bigint", nullable: false),
                    actor_user_id = table.Column<long>(type: "bigint", nullable: false),
                    previous_limit = table.Column<int>(type: "int", nullable: false),
                    new_limit = table.Column<int>(type: "int", nullable: false),
                    reason = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_capacity_changes", x => x.id);
                    table.ForeignKey(
                        name: "FK_school_capacity_changes_organization_memberships_membership_~",
                        column: x => x.membership_id,
                        principalTable: "organization_memberships",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_capacity_changes_users_actor_user_id",
                        column: x => x.actor_user_id,
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
                name: "payout_events",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    payout_id = table.Column<long>(type: "bigint", nullable: false),
                    actor_user_id = table.Column<long>(type: "bigint", nullable: false),
                    event_type = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    reason = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payout_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_payout_events_payouts_payout_id",
                        column: x => x.payout_id,
                        principalTable: "payouts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payout_events_users_actor_user_id",
                        column: x => x.actor_user_id,
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
                    owner_personnel_type = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: true, collation: "utf8mb4_bin"),
                    care_user_id = table.Column<long>(type: "bigint", nullable: true),
                    care_organization_id = table.Column<long>(type: "bigint", nullable: true),
                    requires_school_verification = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    manager_reviewed_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    manager_reviewed_by_user_id = table.Column<long>(type: "bigint", nullable: true),
                    verified_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
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
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true, collation: "utf8mb4_bin"),
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
                        name: "FK_sales_contracts_organizations_care_organization_id",
                        column: x => x.care_organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_contracts_organizations_owner_organization_id",
                        column: x => x.owner_organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_contracts_users_care_user_id",
                        column: x => x.care_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sales_contracts_users_manager_reviewed_by_user_id",
                        column: x => x.manager_reviewed_by_user_id,
                        principalTable: "users",
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
                    version = table.Column<int>(type: "int", nullable: false),
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
                name: "school_units",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    version = table.Column<int>(type: "int", nullable: false),
                    directory_school_id = table.Column<long>(type: "bigint", nullable: false),
                    content_hash = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false, collation: "utf8mb4_bin"),
                    unit_type = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                    name = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false),
                    province = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                    ward = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                    address = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true),
                    contact_name = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true),
                    contact_position = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: true),
                    contact_phone = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true),
                    email = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: true),
                    school_phone = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    source_row = table.Column<int>(type: "int", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_school_units", x => x.id);
                    table.ForeignKey(
                        name: "FK_school_units_directory_schools_directory_school_id",
                        column: x => x.directory_school_id,
                        principalTable: "directory_schools",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

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
                name: "school_proposal_revisions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    school_proposal_id = table.Column<long>(type: "bigint", nullable: false),
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
                    table.PrimaryKey("PK_school_proposal_revisions", x => x.id);
                    table.ForeignKey(
                        name: "FK_school_proposal_revisions_school_proposals_school_proposal_id",
                        column: x => x.school_proposal_id,
                        principalTable: "school_proposals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_school_proposal_revisions_users_actor_user_id",
                        column: x => x.actor_user_id,
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
                name: "customer_activities",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    support_case_id = table.Column<long>(type: "bigint", nullable: true),
                    occurred_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    contact_name = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true),
                    contact_position = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: true),
                    feedback = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true),
                    commitment = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true),
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
                        name: "FK_customer_activities_customer_support_cases_support_case_id",
                        column: x => x.support_case_id,
                        principalTable: "customer_support_cases",
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
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true, collation: "utf8mb4_bin"),
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
                    related_entry_id = table.Column<long>(type: "bigint", nullable: true),
                    reason = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: true, collation: "utf8mb4_bin"),
                    request_fingerprint = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true, collation: "utf8mb4_bin"),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_commission_ledger_entries", x => x.id);
                    table.ForeignKey(
                        name: "FK_commission_ledger_entries_commission_ledger_entries_related_~",
                        column: x => x.related_entry_id,
                        principalTable: "commission_ledger_entries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
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
                name: "IX_commission_ledger_entries_idempotency_key",
                table: "commission_ledger_entries",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_commission_ledger_entries_policy_version_id",
                table: "commission_ledger_entries",
                column: "policy_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_commission_ledger_entries_related_entry_id",
                table: "commission_ledger_entries",
                column: "related_entry_id");

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
                name: "IX_commission_policy_versions_organization_id_personnel_type_st~",
                table: "commission_policy_versions",
                columns: new[] { "organization_id", "personnel_type", "status", "effective_from" });

            migrationBuilder.CreateIndex(
                name: "IX_commission_policy_versions_organization_id_status_effective_~",
                table: "commission_policy_versions",
                columns: new[] { "organization_id", "status", "effective_from" });

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
                name: "IX_customer_activities_approach_registration_id",
                table: "customer_activities",
                column: "approach_registration_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_activities_customer_id_created_at",
                table: "customer_activities",
                columns: new[] { "customer_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_customer_activities_support_case_id",
                table: "customer_activities",
                column: "support_case_id");

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
                name: "IX_directory_schools_customer_id",
                table: "directory_schools",
                column: "customer_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_directory_schools_school_code",
                table: "directory_schools",
                column: "school_code",
                unique: true);

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
                name: "IX_payout_events_actor_user_id",
                table: "payout_events",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_payout_events_payout_id_created_at",
                table: "payout_events",
                columns: new[] { "payout_id", "created_at" });

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
                name: "IX_payouts_approved_by_user_id",
                table: "payouts",
                column: "approved_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_payouts_beneficiary_user_id",
                table: "payouts",
                column: "beneficiary_user_id");

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
                name: "IX_payouts_idempotency_key",
                table: "payouts",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payouts_organization_id_period",
                table: "payouts",
                columns: new[] { "organization_id", "period" });

            migrationBuilder.CreateIndex(
                name: "IX_payouts_paid_by_user_id",
                table: "payouts",
                column: "paid_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_payouts_payment_reference",
                table: "payouts",
                column: "payment_reference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_permission_role_role_id",
                table: "permission_role",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "IX_permissions_code",
                table: "permissions",
                column: "code",
                unique: true);

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
                name: "IX_revenue_schedules_contract_id_status_due_on",
                table: "revenue_schedules",
                columns: new[] { "contract_id", "status", "due_on" });

            migrationBuilder.CreateIndex(
                name: "IX_role_user_user_id",
                table: "role_user",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_roles_code",
                table: "roles",
                column: "code",
                unique: true);

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
                name: "IX_sales_contracts_care_organization_id",
                table: "sales_contracts",
                column: "care_organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_sales_contracts_care_user_id",
                table: "sales_contracts",
                column: "care_user_id");

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
                name: "IX_sales_contracts_manager_reviewed_by_user_id",
                table: "sales_contracts",
                column: "manager_reviewed_by_user_id");

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

            migrationBuilder.CreateIndex(
                name: "IX_school_capacity_changes_actor_user_id",
                table: "school_capacity_changes",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_capacity_changes_membership_id",
                table: "school_capacity_changes",
                column: "membership_id");

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
                name: "IX_school_import_batches_actor_user_id",
                table: "school_import_batches",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_import_batches_idempotency_key",
                table: "school_import_batches",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_school_import_batches_organization_id",
                table: "school_import_batches",
                column: "organization_id");

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
                name: "IX_school_proposal_revisions_actor_user_id",
                table: "school_proposal_revisions",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_school_proposal_revisions_school_proposal_id_version",
                table: "school_proposal_revisions",
                columns: new[] { "school_proposal_id", "version" },
                unique: true);

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
                name: "IX_school_units_directory_school_id_content_hash",
                table: "school_units",
                columns: new[] { "directory_school_id", "content_hash" },
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

            migrationBuilder.CreateIndex(
                name: "IX_users_code",
                table: "users",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "contract_cancellations");

            migrationBuilder.DropTable(
                name: "contract_care_handovers");

            migrationBuilder.DropTable(
                name: "customer_activities");

            migrationBuilder.DropTable(
                name: "customer_identifiers");

            migrationBuilder.DropTable(
                name: "customer_protections");

            migrationBuilder.DropTable(
                name: "payout_events");

            migrationBuilder.DropTable(
                name: "payout_items");

            migrationBuilder.DropTable(
                name: "permission_role");

            migrationBuilder.DropTable(
                name: "reconciliation_events");

            migrationBuilder.DropTable(
                name: "revenue_refunds");

            migrationBuilder.DropTable(
                name: "role_user");

            migrationBuilder.DropTable(
                name: "sales_contract_items");

            migrationBuilder.DropTable(
                name: "school_capacity_changes");

            migrationBuilder.DropTable(
                name: "school_deferrals");

            migrationBuilder.DropTable(
                name: "school_disputes");

            migrationBuilder.DropTable(
                name: "school_extension_requests");

            migrationBuilder.DropTable(
                name: "school_handovers");

            migrationBuilder.DropTable(
                name: "school_import_batches");

            migrationBuilder.DropTable(
                name: "school_invitations");

            migrationBuilder.DropTable(
                name: "school_proposal_revisions");

            migrationBuilder.DropTable(
                name: "school_unit_revisions");

            migrationBuilder.DropTable(
                name: "customer_support_cases");

            migrationBuilder.DropTable(
                name: "commission_ledger_entries");

            migrationBuilder.DropTable(
                name: "payouts");

            migrationBuilder.DropTable(
                name: "permissions");

            migrationBuilder.DropTable(
                name: "reconciliation_cases");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.DropTable(
                name: "checkee_product_packages");

            migrationBuilder.DropTable(
                name: "school_workflow_policies");

            migrationBuilder.DropTable(
                name: "organization_memberships");

            migrationBuilder.DropTable(
                name: "school_proposals");

            migrationBuilder.DropTable(
                name: "school_units");

            migrationBuilder.DropTable(
                name: "commission_policy_versions");

            migrationBuilder.DropTable(
                name: "revenue_receipts");

            migrationBuilder.DropTable(
                name: "directory_schools");

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

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}

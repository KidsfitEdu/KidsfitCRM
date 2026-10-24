using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "courses",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    code = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    name = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: false),
                    description = table.Column<string>(type: "longtext", nullable: true),
                    number_of_sessions = table.Column<int>(type: "int", nullable: false),
                    tuition_fee = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_courses", x => x.id);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "lead_sources",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    code = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    name = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false),
                    color = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lead_sources", x => x.id);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "lead_statuses",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    code = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    name = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false),
                    color = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                    sort_order = table.Column<int>(type: "int", nullable: false),
                    is_terminal = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lead_statuses", x => x.id);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "parents",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    code = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    full_name = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: false),
                    phone = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    phone_normalized = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    email = table.Column<string>(type: "longtext", nullable: true),
                    address = table.Column<string>(type: "longtext", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_parents", x => x.id);
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
                name: "students",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    code = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    full_name = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: false),
                    date_of_birth = table.Column<DateOnly>(type: "date", nullable: true),
                    gender = table.Column<string>(type: "longtext", nullable: true),
                    school_name = table.Column<string>(type: "longtext", nullable: true),
                    school_grade = table.Column<string>(type: "longtext", nullable: true),
                    status = table.Column<string>(type: "longtext", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_students", x => x.id);
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
                name: "parent_student",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    parent_id = table.Column<long>(type: "bigint", nullable: false),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    relationship = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    is_primary_contact = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_parent_student", x => x.id);
                    table.ForeignKey(
                        name: "FK_parent_student_parents_parent_id",
                        column: x => x.parent_id,
                        principalTable: "parents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_parent_student_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

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
                    table.ForeignKey(
                        name: "FK_audit_logs_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "classes",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    course_id = table.Column<long>(type: "bigint", nullable: false),
                    code = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    name = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: false),
                    teacher_id = table.Column<long>(type: "bigint", nullable: true),
                    start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    capacity = table.Column<int>(type: "int", nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_classes", x => x.id);
                    table.ForeignKey(
                        name: "FK_classes_courses_course_id",
                        column: x => x.course_id,
                        principalTable: "courses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_classes_users_teacher_id",
                        column: x => x.teacher_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "leads",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    code = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    full_name = table.Column<string>(type: "varchar(190)", maxLength: 190, nullable: false),
                    phone = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    phone_normalized = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    email = table.Column<string>(type: "longtext", nullable: true),
                    source_id = table.Column<long>(type: "bigint", nullable: false),
                    status_id = table.Column<long>(type: "bigint", nullable: false),
                    interested_course_id = table.Column<long>(type: "bigint", nullable: true),
                    assigned_user_id = table.Column<long>(type: "bigint", nullable: true),
                    converted_parent_id = table.Column<long>(type: "bigint", nullable: true),
                    note = table.Column<string>(type: "longtext", nullable: true),
                    next_follow_up_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_leads", x => x.id);
                    table.ForeignKey(
                        name: "FK_leads_courses_interested_course_id",
                        column: x => x.interested_course_id,
                        principalTable: "courses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_leads_lead_sources_source_id",
                        column: x => x.source_id,
                        principalTable: "lead_sources",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_leads_lead_statuses_status_id",
                        column: x => x.status_id,
                        principalTable: "lead_statuses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_leads_parents_converted_parent_id",
                        column: x => x.converted_parent_id,
                        principalTable: "parents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_leads_users_assigned_user_id",
                        column: x => x.assigned_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    type = table.Column<string>(type: "longtext", nullable: false),
                    title = table.Column<string>(type: "longtext", nullable: false),
                    content = table.Column<string>(type: "longtext", nullable: false),
                    data = table.Column<string>(type: "json", nullable: true),
                    read_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notifications", x => x.id);
                    table.ForeignKey(
                        name: "FK_notifications_users_user_id",
                        column: x => x.user_id,
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
                name: "tasks",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    related_type = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    related_id = table.Column<long>(type: "bigint", nullable: false),
                    assigned_to = table.Column<long>(type: "bigint", nullable: false),
                    title = table.Column<string>(type: "longtext", nullable: false),
                    due_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    priority = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tasks", x => x.id);
                    table.ForeignKey(
                        name: "FK_tasks_users_assigned_to",
                        column: x => x.assigned_to,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "class_schedules",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    class_id = table.Column<long>(type: "bigint", nullable: false),
                    day_of_week = table.Column<int>(type: "int", nullable: false),
                    start_time = table.Column<TimeOnly>(type: "time", nullable: false),
                    end_time = table.Column<TimeOnly>(type: "time", nullable: false),
                    room = table.Column<string>(type: "longtext", nullable: true),
                    teacher_id = table.Column<long>(type: "bigint", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_class_schedules", x => x.id);
                    table.ForeignKey(
                        name: "FK_class_schedules_classes_class_id",
                        column: x => x.class_id,
                        principalTable: "classes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_class_schedules_users_teacher_id",
                        column: x => x.teacher_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "enrollments",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    class_id = table.Column<long>(type: "bigint", nullable: false),
                    registered_by = table.Column<long>(type: "bigint", nullable: false),
                    registration_date = table.Column<DateOnly>(type: "date", nullable: false),
                    original_fee = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    discount_amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    final_fee = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_enrollments", x => x.id);
                    table.ForeignKey(
                        name: "FK_enrollments_classes_class_id",
                        column: x => x.class_id,
                        principalTable: "classes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_enrollments_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_enrollments_users_registered_by",
                        column: x => x.registered_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "lead_activities",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    lead_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: true),
                    activity_type = table.Column<string>(type: "longtext", nullable: false),
                    content = table.Column<string>(type: "longtext", nullable: false),
                    metadata = table.Column<string>(type: "json", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lead_activities", x => x.id);
                    table.ForeignKey(
                        name: "FK_lead_activities_leads_lead_id",
                        column: x => x.lead_id,
                        principalTable: "leads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lead_activities_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "lead_assignments",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    lead_id = table.Column<long>(type: "bigint", nullable: false),
                    assigned_to = table.Column<long>(type: "bigint", nullable: false),
                    assigned_by = table.Column<long>(type: "bigint", nullable: false),
                    assigned_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lead_assignments", x => x.id);
                    table.ForeignKey(
                        name: "FK_lead_assignments_leads_lead_id",
                        column: x => x.lead_id,
                        principalTable: "leads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lead_assignments_users_assigned_by",
                        column: x => x.assigned_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lead_assignments_users_assigned_to",
                        column: x => x.assigned_to,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "lead_notes",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    lead_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    content = table.Column<string>(type: "longtext", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lead_notes", x => x.id);
                    table.ForeignKey(
                        name: "FK_lead_notes_leads_lead_id",
                        column: x => x.lead_id,
                        principalTable: "leads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lead_notes_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "trial_sessions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    lead_id = table.Column<long>(type: "bigint", nullable: false),
                    student_id = table.Column<long>(type: "bigint", nullable: true),
                    course_id = table.Column<long>(type: "bigint", nullable: false),
                    class_id = table.Column<long>(type: "bigint", nullable: true),
                    scheduled_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    attendance_status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    result = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true),
                    note = table.Column<string>(type: "longtext", nullable: true),
                    staff_id = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trial_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_trial_sessions_classes_class_id",
                        column: x => x.class_id,
                        principalTable: "classes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_sessions_courses_course_id",
                        column: x => x.course_id,
                        principalTable: "courses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_sessions_leads_lead_id",
                        column: x => x.lead_id,
                        principalTable: "leads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_sessions_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_trial_sessions_users_staff_id",
                        column: x => x.staff_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "invoices",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    parent_id = table.Column<long>(type: "bigint", nullable: false),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    enrollment_id = table.Column<long>(type: "bigint", nullable: false),
                    invoice_code = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false),
                    total_amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    discount_amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    final_amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    paid_amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    remaining_amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    issued_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    due_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoices", x => x.id);
                    table.ForeignKey(
                        name: "FK_invoices_enrollments_enrollment_id",
                        column: x => x.enrollment_id,
                        principalTable: "enrollments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_invoices_parents_parent_id",
                        column: x => x.parent_id,
                        principalTable: "parents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_invoices_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "invoice_items",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    invoice_id = table.Column<long>(type: "bigint", nullable: false),
                    item_type = table.Column<string>(type: "longtext", nullable: false),
                    item_id = table.Column<long>(type: "bigint", nullable: true),
                    description = table.Column<string>(type: "longtext", nullable: false),
                    quantity = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    unit_price = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoice_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_invoice_items_invoices_invoice_id",
                        column: x => x.invoice_id,
                        principalTable: "invoices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "lead_conversions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    lead_id = table.Column<long>(type: "bigint", nullable: false),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false, collation: "utf8mb4_bin"),
                    parent_id = table.Column<long>(type: "bigint", nullable: false),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    enrollment_id = table.Column<long>(type: "bigint", nullable: false),
                    invoice_id = table.Column<long>(type: "bigint", nullable: false),
                    converted_by = table.Column<long>(type: "bigint", nullable: false),
                    converted_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lead_conversions", x => x.id);
                    table.ForeignKey(
                        name: "FK_lead_conversions_enrollments_enrollment_id",
                        column: x => x.enrollment_id,
                        principalTable: "enrollments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lead_conversions_invoices_invoice_id",
                        column: x => x.invoice_id,
                        principalTable: "invoices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lead_conversions_leads_lead_id",
                        column: x => x.lead_id,
                        principalTable: "leads",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lead_conversions_parents_parent_id",
                        column: x => x.parent_id,
                        principalTable: "parents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lead_conversions_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lead_conversions_users_converted_by",
                        column: x => x.converted_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateTable(
                name: "payments",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                    invoice_id = table.Column<long>(type: "bigint", nullable: false),
                    parent_id = table.Column<long>(type: "bigint", nullable: false),
                    student_id = table.Column<long>(type: "bigint", nullable: false),
                    payment_method = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                    amount = table.Column<decimal>(type: "decimal(19,0)", precision: 19, scale: 0, nullable: false),
                    payment_date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    reference_code = table.Column<string>(type: "varchar(48)", maxLength: 48, nullable: false),
                    idempotency_key = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: true, collation: "utf8mb4_bin"),
                    status = table.Column<string>(type: "varchar(24)", maxLength: 24, nullable: false),
                    created_by = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payments", x => x.id);
                    table.ForeignKey(
                        name: "FK_payments_invoices_invoice_id",
                        column: x => x.invoice_id,
                        principalTable: "invoices",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_parents_parent_id",
                        column: x => x.parent_id,
                        principalTable: "parents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_students_student_id",
                        column: x => x.student_id,
                        principalTable: "students",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_users_created_by",
                        column: x => x.created_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("Relational:Collation", "utf8mb4_0900_ai_ci");

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_user_id",
                table: "audit_logs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_class_schedules_class_id",
                table: "class_schedules",
                column: "class_id");

            migrationBuilder.CreateIndex(
                name: "IX_class_schedules_teacher_id",
                table: "class_schedules",
                column: "teacher_id");

            migrationBuilder.CreateIndex(
                name: "IX_classes_code",
                table: "classes",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_classes_course_id_status",
                table: "classes",
                columns: new[] { "course_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_classes_teacher_id",
                table: "classes",
                column: "teacher_id");

            migrationBuilder.CreateIndex(
                name: "IX_courses_code",
                table: "courses",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_enrollments_class_id_status",
                table: "enrollments",
                columns: new[] { "class_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_enrollments_registered_by",
                table: "enrollments",
                column: "registered_by");

            migrationBuilder.CreateIndex(
                name: "IX_enrollments_student_id",
                table: "enrollments",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_invoice_items_invoice_id",
                table: "invoice_items",
                column: "invoice_id");

            migrationBuilder.CreateIndex(
                name: "IX_invoices_enrollment_id",
                table: "invoices",
                column: "enrollment_id");

            migrationBuilder.CreateIndex(
                name: "IX_invoices_invoice_code",
                table: "invoices",
                column: "invoice_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoices_parent_id",
                table: "invoices",
                column: "parent_id");

            migrationBuilder.CreateIndex(
                name: "IX_invoices_status_due_at",
                table: "invoices",
                columns: new[] { "status", "due_at" });

            migrationBuilder.CreateIndex(
                name: "IX_invoices_student_id",
                table: "invoices",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_lead_activities_lead_id",
                table: "lead_activities",
                column: "lead_id");

            migrationBuilder.CreateIndex(
                name: "IX_lead_activities_user_id",
                table: "lead_activities",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lead_assignments_assigned_by",
                table: "lead_assignments",
                column: "assigned_by");

            migrationBuilder.CreateIndex(
                name: "IX_lead_assignments_assigned_to",
                table: "lead_assignments",
                column: "assigned_to");

            migrationBuilder.CreateIndex(
                name: "IX_lead_assignments_lead_id",
                table: "lead_assignments",
                column: "lead_id");

            migrationBuilder.CreateIndex(
                name: "IX_lead_conversions_converted_by",
                table: "lead_conversions",
                column: "converted_by");

            migrationBuilder.CreateIndex(
                name: "IX_lead_conversions_enrollment_id",
                table: "lead_conversions",
                column: "enrollment_id");

            migrationBuilder.CreateIndex(
                name: "IX_lead_conversions_idempotency_key",
                table: "lead_conversions",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lead_conversions_invoice_id",
                table: "lead_conversions",
                column: "invoice_id");

            migrationBuilder.CreateIndex(
                name: "IX_lead_conversions_lead_id",
                table: "lead_conversions",
                column: "lead_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lead_conversions_parent_id",
                table: "lead_conversions",
                column: "parent_id");

            migrationBuilder.CreateIndex(
                name: "IX_lead_conversions_student_id",
                table: "lead_conversions",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_lead_notes_lead_id",
                table: "lead_notes",
                column: "lead_id");

            migrationBuilder.CreateIndex(
                name: "IX_lead_notes_user_id",
                table: "lead_notes",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_lead_sources_code",
                table: "lead_sources",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lead_statuses_code",
                table: "lead_statuses",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_leads_assigned_user_id",
                table: "leads",
                column: "assigned_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_leads_code",
                table: "leads",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_leads_converted_parent_id",
                table: "leads",
                column: "converted_parent_id");

            migrationBuilder.CreateIndex(
                name: "IX_leads_interested_course_id",
                table: "leads",
                column: "interested_course_id");

            migrationBuilder.CreateIndex(
                name: "IX_leads_phone_normalized",
                table: "leads",
                column: "phone_normalized");

            migrationBuilder.CreateIndex(
                name: "IX_leads_source_id",
                table: "leads",
                column: "source_id");

            migrationBuilder.CreateIndex(
                name: "IX_leads_status_id_assigned_user_id_next_follow_up_at",
                table: "leads",
                columns: new[] { "status_id", "assigned_user_id", "next_follow_up_at" });

            migrationBuilder.CreateIndex(
                name: "IX_notifications_user_id",
                table: "notifications",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_parent_student_parent_id_student_id",
                table: "parent_student",
                columns: new[] { "parent_id", "student_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_parent_student_student_id",
                table: "parent_student",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_parents_code",
                table: "parents",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_parents_phone_normalized",
                table: "parents",
                column: "phone_normalized");

            migrationBuilder.CreateIndex(
                name: "IX_payments_created_by",
                table: "payments",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_payments_idempotency_key",
                table: "payments",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_invoice_id",
                table: "payments",
                column: "invoice_id");

            migrationBuilder.CreateIndex(
                name: "IX_payments_parent_id",
                table: "payments",
                column: "parent_id");

            migrationBuilder.CreateIndex(
                name: "IX_payments_reference_code",
                table: "payments",
                column: "reference_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_student_id",
                table: "payments",
                column: "student_id");

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
                name: "IX_role_user_user_id",
                table: "role_user",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_roles_code",
                table: "roles",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_students_code",
                table: "students",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tasks_assigned_to",
                table: "tasks",
                column: "assigned_to");

            migrationBuilder.CreateIndex(
                name: "IX_trial_sessions_class_id",
                table: "trial_sessions",
                column: "class_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_sessions_course_id",
                table: "trial_sessions",
                column: "course_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_sessions_lead_id",
                table: "trial_sessions",
                column: "lead_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_sessions_staff_id",
                table: "trial_sessions",
                column: "staff_id");

            migrationBuilder.CreateIndex(
                name: "IX_trial_sessions_student_id",
                table: "trial_sessions",
                column: "student_id");

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
                name: "class_schedules");

            migrationBuilder.DropTable(
                name: "invoice_items");

            migrationBuilder.DropTable(
                name: "lead_activities");

            migrationBuilder.DropTable(
                name: "lead_assignments");

            migrationBuilder.DropTable(
                name: "lead_conversions");

            migrationBuilder.DropTable(
                name: "lead_notes");

            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropTable(
                name: "parent_student");

            migrationBuilder.DropTable(
                name: "payments");

            migrationBuilder.DropTable(
                name: "permission_role");

            migrationBuilder.DropTable(
                name: "role_user");

            migrationBuilder.DropTable(
                name: "tasks");

            migrationBuilder.DropTable(
                name: "trial_sessions");

            migrationBuilder.DropTable(
                name: "invoices");

            migrationBuilder.DropTable(
                name: "permissions");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.DropTable(
                name: "leads");

            migrationBuilder.DropTable(
                name: "enrollments");

            migrationBuilder.DropTable(
                name: "lead_sources");

            migrationBuilder.DropTable(
                name: "lead_statuses");

            migrationBuilder.DropTable(
                name: "parents");

            migrationBuilder.DropTable(
                name: "classes");

            migrationBuilder.DropTable(
                name: "students");

            migrationBuilder.DropTable(
                name: "courses");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}

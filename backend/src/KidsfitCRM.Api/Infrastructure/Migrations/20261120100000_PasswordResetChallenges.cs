using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261120100000_PasswordResetChallenges")]
public sealed class PasswordResetChallenges : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "security_stamp", table: "users", type: "varchar(64)",
            maxLength: 64, nullable: false, defaultValue: "");
        migrationBuilder.CreateTable(
            name: "password_reset_challenges",
            columns: table => new
            {
                id = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("MySQL:ValueGenerationStrategy", MySql.EntityFrameworkCore.Metadata.MySQLValueGenerationStrategy.IdentityColumn),
                user_id = table.Column<long>(type: "bigint", nullable: false),
                public_id = table.Column<string>(type: "varchar(32)", maxLength: 32, nullable: false),
                otp_digest = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false),
                attempts = table.Column<int>(type: "int", nullable: false),
                expires_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                verified_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                ticket_expires_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                ticket_digest = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: true),
                consumed_at = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                created_at = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_password_reset_challenges", x => x.id);
                table.ForeignKey(
                    name: "FK_password_reset_challenges_users_user_id",
                    column: x => x.user_id, principalTable: "users",
                    principalColumn: "id", onDelete: ReferentialAction.Restrict);
            });
        migrationBuilder.CreateIndex(
            name: "IX_password_reset_challenges_user_id_created_at",
            table: "password_reset_challenges",
            columns: new[] { "user_id", "created_at" });
        migrationBuilder.CreateIndex(
            name: "IX_password_reset_challenges_public_id",
            table: "password_reset_challenges",
            column: "public_id", unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("password_reset_challenges");
        migrationBuilder.DropColumn("security_stamp", "users");
    }
}

using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261104110000_SchoolSoftDelete")]
public sealed class SchoolSoftDelete : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(name: "is_deleted", table: "directory_schools",
            type: "tinyint(1)", nullable: false, defaultValue: false);
        migrationBuilder.AddColumn<DateTime>(name: "deleted_at", table: "directory_schools",
            type: "datetime(6)", nullable: true);
        migrationBuilder.AddColumn<long>(name: "deleted_by_user_id", table: "directory_schools",
            type: "bigint", nullable: true);
        migrationBuilder.AddColumn<string>(name: "delete_reason", table: "directory_schools",
            type: "varchar(2000)", maxLength: 2000, nullable: true);
        migrationBuilder.CreateIndex(name: "ix_directory_schools_is_deleted", table: "directory_schools",
            column: "is_deleted");
        migrationBuilder.CreateIndex(name: "ix_directory_schools_deleted_by_user_id",
            table: "directory_schools", column: "deleted_by_user_id");
        migrationBuilder.AddForeignKey(name: "fk_directory_schools_deleted_by_user_id", table: "directory_schools",
            column: "deleted_by_user_id", principalTable: "users", principalColumn: "id",
            onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Deletion history is audit-relevant; require manual review before a destructive rollback.
        throw new NotSupportedException("Không tự động xóa cột lưu lịch sử ngừng sử dụng trường.");
    }
}

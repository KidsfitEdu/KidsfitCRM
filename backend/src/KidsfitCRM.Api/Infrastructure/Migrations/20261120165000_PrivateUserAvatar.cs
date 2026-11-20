using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261120165000_PrivateUserAvatar")]
public sealed class PrivateUserAvatar : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "avatar_storage_key", table: "users",
            type: "varchar(64)", maxLength: 64, nullable: true,
            collation: "utf8mb4_bin");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "avatar_storage_key", table: "users");
    }
}

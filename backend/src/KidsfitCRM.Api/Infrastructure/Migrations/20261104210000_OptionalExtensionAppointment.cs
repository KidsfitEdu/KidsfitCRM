using KidsfitCRM.Api.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KidsfitCRM.Api.Infrastructure.Migrations;

[DbContext(typeof(KidsfitDbContext))]
[Migration("20261104210000_OptionalExtensionAppointment")]
public sealed class OptionalExtensionAppointment : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Existing appointments are preserved. New requests may omit an appointment.
        migrationBuilder.AlterColumn<DateTime>(
            name: "next_appointment_at",
            table: "school_extension_requests",
            type: "datetime(6)",
            nullable: true,
            oldClrType: typeof(DateTime),
            oldType: "datetime(6)");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // A downgrade is unsafe while any rows have no appointment.
        migrationBuilder.Sql(
            "SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot restore required extension appointments without inventing dates'");
    }
}

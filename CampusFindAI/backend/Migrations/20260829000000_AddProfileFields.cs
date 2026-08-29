using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using CampusFindAI.Api.Data;

#nullable disable

namespace CampusFindAI.Api.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260829000000_AddProfileFields")]
public partial class AddProfileFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "Department", table: "UserProfiles", type: "nvarchar(120)", maxLength: 120, nullable: true);
        migrationBuilder.AddColumn<string>(name: "JobTitle", table: "UserProfiles", type: "nvarchar(120)", maxLength: 120, nullable: true);
        migrationBuilder.AddColumn<string>(name: "Semester", table: "UserProfiles", type: "nvarchar(40)", maxLength: 40, nullable: true);
        migrationBuilder.AddColumn<string>(name: "StudentId", table: "UserProfiles", type: "nvarchar(50)", maxLength: 50, nullable: true);
        migrationBuilder.AddColumn<DateTime>(name: "CreatedAt", table: "Notifications", type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Department", table: "UserProfiles");
        migrationBuilder.DropColumn(name: "JobTitle", table: "UserProfiles");
        migrationBuilder.DropColumn(name: "Semester", table: "UserProfiles");
        migrationBuilder.DropColumn(name: "StudentId", table: "UserProfiles");
        migrationBuilder.DropColumn(name: "CreatedAt", table: "Notifications");
    }
}

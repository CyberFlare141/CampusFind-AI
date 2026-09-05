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
        migrationBuilder.Sql("""
            IF COL_LENGTH('UserProfiles', 'Department') IS NULL
                ALTER TABLE UserProfiles ADD Department nvarchar(120) NULL;
            IF COL_LENGTH('UserProfiles', 'JobTitle') IS NULL
                ALTER TABLE UserProfiles ADD JobTitle nvarchar(120) NULL;
            IF COL_LENGTH('UserProfiles', 'Semester') IS NULL
                ALTER TABLE UserProfiles ADD Semester nvarchar(40) NULL;
            IF COL_LENGTH('UserProfiles', 'StudentId') IS NULL
                ALTER TABLE UserProfiles ADD StudentId nvarchar(50) NULL;
            IF COL_LENGTH('Notifications', 'CreatedAt') IS NULL
                ALTER TABLE Notifications ADD CreatedAt datetime2 NOT NULL CONSTRAINT DF_Notifications_CreatedAt_Migration DEFAULT GETUTCDATE();
            """);
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

using CampusFindAI.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusFindAI.Api.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260822200000_SyncAuditLogDetails")]
public partial class SyncAuditLogDetails : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            IF COL_LENGTH('AuditLogs', 'Details') IS NULL
            BEGIN
                ALTER TABLE [AuditLogs] ADD [Details] nvarchar(max) NULL;
            END;
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Details", table: "AuditLogs");
    }
}

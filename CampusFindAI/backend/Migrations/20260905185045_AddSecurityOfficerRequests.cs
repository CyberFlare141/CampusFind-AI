using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusFindAI.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSecurityOfficerRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('AspNetUsers', 'IsRestricted') IS NULL
                    ALTER TABLE AspNetUsers ADD IsRestricted bit NOT NULL CONSTRAINT DF_AspNetUsers_IsRestricted_Migration DEFAULT 0;
                IF OBJECT_ID('SecurityOfficerRequests', 'U') IS NULL
                BEGIN
                    CREATE TABLE SecurityOfficerRequests (
                        Id uniqueidentifier NOT NULL PRIMARY KEY,
                        UserId nvarchar(450) NOT NULL,
                        Reason nvarchar(500) NOT NULL,
                        AdditionalInformation nvarchar(2000) NOT NULL,
                        Status nvarchar(30) NOT NULL,
                        SubmittedAt datetime2 NOT NULL,
                        ReviewedAt datetime2 NULL,
                        ReviewedByUserId nvarchar(450) NULL,
                        AdminNotes nvarchar(1000) NULL,
                        CONSTRAINT FK_SecurityOfficerRequests_User_Migration FOREIGN KEY (UserId) REFERENCES AspNetUsers (Id) ON DELETE CASCADE,
                        CONSTRAINT FK_SecurityOfficerRequests_Reviewer_Migration FOREIGN KEY (ReviewedByUserId) REFERENCES AspNetUsers (Id)
                    );
                END;
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecurityOfficerRequests_ReviewedByUserId' AND object_id = OBJECT_ID('SecurityOfficerRequests'))
                    CREATE INDEX IX_SecurityOfficerRequests_ReviewedByUserId ON SecurityOfficerRequests(ReviewedByUserId);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecurityOfficerRequests_UserId_Status' AND object_id = OBJECT_ID('SecurityOfficerRequests'))
                    CREATE INDEX IX_SecurityOfficerRequests_UserId_Status ON SecurityOfficerRequests(UserId, Status);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SecurityOfficerRequests");

            migrationBuilder.DropColumn(
                name: "IsRestricted",
                table: "AspNetUsers");
        }
    }
}

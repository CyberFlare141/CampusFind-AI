using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusFindAI.Api.Migrations
{
    /// <inheritdoc />
    public partial class SyncClaimColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF COL_LENGTH('Claims', 'ClaimantNotes') IS NULL
                BEGIN
                    ALTER TABLE [Claims] ADD [ClaimantNotes] nvarchar(max) NULL;
                END;
            ");

            migrationBuilder.Sql(@"
                IF COL_LENGTH('Claims', 'CreatedAt') IS NULL
                BEGIN
                    ALTER TABLE [Claims] ADD [CreatedAt] datetime2 NOT NULL CONSTRAINT DF_Claims_CreatedAt DEFAULT GETUTCDATE();
                END;
            ");

            migrationBuilder.Sql(@"
                IF COL_LENGTH('Claims', 'DecisionNotes') IS NULL
                BEGIN
                    ALTER TABLE [Claims] ADD [DecisionNotes] nvarchar(max) NULL;
                END;
            ");

            migrationBuilder.Sql(@"
                IF COL_LENGTH('Claims', 'ReviewedAt') IS NULL
                BEGIN
                    ALTER TABLE [Claims] ADD [ReviewedAt] datetime2 NULL;
                END;
            ");

            migrationBuilder.Sql(@"
                IF COL_LENGTH('Claims', 'ReviewedByUserId') IS NULL
                BEGIN
                    ALTER TABLE [Claims] ADD [ReviewedByUserId] nvarchar(450) NULL;
                END;
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE name = 'IX_Claims_ReviewedByUserId' AND object_id = OBJECT_ID('Claims'))
                BEGIN
                    CREATE INDEX [IX_Claims_ReviewedByUserId] ON [Claims] ([ReviewedByUserId]);
                END;
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (
                    SELECT 1
                    FROM sys.foreign_keys
                    WHERE name = 'FK_Claims_AspNetUsers_ReviewedByUserId'
                )
                BEGIN
                    ALTER TABLE [Claims] WITH CHECK
                    ADD CONSTRAINT [FK_Claims_AspNetUsers_ReviewedByUserId]
                    FOREIGN KEY ([ReviewedByUserId]) REFERENCES [AspNetUsers] ([Id]);
                END;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Claims_AspNetUsers_ReviewedByUserId",
                table: "Claims");

            migrationBuilder.DropIndex(
                name: "IX_Claims_ReviewedByUserId",
                table: "Claims");

            migrationBuilder.DropColumn(name: "ClaimantNotes", table: "Claims");
            migrationBuilder.DropColumn(name: "CreatedAt", table: "Claims");
            migrationBuilder.DropColumn(name: "DecisionNotes", table: "Claims");
            migrationBuilder.DropColumn(name: "ReviewedAt", table: "Claims");
            migrationBuilder.DropColumn(name: "ReviewedByUserId", table: "Claims");
        }
    }
}

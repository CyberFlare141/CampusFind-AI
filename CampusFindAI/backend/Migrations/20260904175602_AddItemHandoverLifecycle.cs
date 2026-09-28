using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusFindAI.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddItemHandoverLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF COL_LENGTH('FoundItems', 'CreatedAt') IS NULL
                    ALTER TABLE FoundItems ADD CreatedAt datetime2 NOT NULL CONSTRAINT DF_FoundItems_CreatedAt_Migration DEFAULT GETUTCDATE();
                IF COL_LENGTH('FoundItems', 'Status') IS NULL
                    ALTER TABLE FoundItems ADD Status nvarchar(30) NOT NULL CONSTRAINT DF_FoundItems_Status_Migration DEFAULT 'Available';
                IF COL_LENGTH('Claims', 'HandedOverAt') IS NULL
                    ALTER TABLE Claims ADD HandedOverAt datetime2 NULL;
                IF COL_LENGTH('Claims', 'HandedOverByUserId') IS NULL
                    ALTER TABLE Claims ADD HandedOverByUserId nvarchar(max) NULL;
                IF COL_LENGTH('Claims', 'HandoverNotes') IS NULL
                    ALTER TABLE Claims ADD HandoverNotes nvarchar(max) NULL;
                """);

            migrationBuilder.CreateTable(
                name: "ClaimVerifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClaimId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SecureQuestionsPayload = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PublicQuestionsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SubmittedAnswersJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EvaluationResultJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConfidenceScore = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    MatchedCount = table.Column<int>(type: "int", nullable: true),
                    TotalQuestions = table.Column<int>(type: "int", nullable: false),
                    Passed = table.Column<bool>(type: "bit", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AttemptCount = table.Column<int>(type: "int", nullable: false),
                    MaxAttempts = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClaimVerifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClaimVerifications_Claims_ClaimId",
                        column: x => x.ClaimId,
                        principalTable: "Claims",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClaimVerifications_ClaimId",
                table: "ClaimVerifications",
                column: "ClaimId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClaimVerifications");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "FoundItems");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "FoundItems");

            migrationBuilder.DropColumn(
                name: "HandedOverAt",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "HandedOverByUserId",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "HandoverNotes",
                table: "Claims");
        }
    }
}

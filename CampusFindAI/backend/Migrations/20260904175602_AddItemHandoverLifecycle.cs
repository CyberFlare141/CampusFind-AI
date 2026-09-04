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
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "FoundItems",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETUTCDATE()");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "FoundItems",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Available");

            migrationBuilder.AddColumn<DateTime>(
                name: "HandedOverAt",
                table: "Claims",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HandedOverByUserId",
                table: "Claims",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HandoverNotes",
                table: "Claims",
                type: "nvarchar(max)",
                nullable: true);

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

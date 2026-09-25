using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusFindAI.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReputationHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Level",
                table: "Reputations",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "New");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Reputations",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETUTCDATE()");

            migrationBuilder.CreateTable(
                name: "ReputationHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PointChange = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    RelatedEntityType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    RelatedEntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReputationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReputationHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReputationHistories_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReputationHistories_Reputations_ReputationId",
                        column: x => x.ReputationId,
                        principalTable: "Reputations",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReputationHistories_ReputationId",
                table: "ReputationHistories",
                column: "ReputationId");

            migrationBuilder.CreateIndex(
                name: "IX_ReputationHistories_UserId_RelatedEntityType_RelatedEntityId_Reason",
                table: "ReputationHistories",
                columns: new[] { "UserId", "RelatedEntityType", "RelatedEntityId", "Reason" },
                unique: true,
                filter: "[RelatedEntityType] IS NOT NULL AND [RelatedEntityId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReputationHistories");

            migrationBuilder.DropColumn(
                name: "Level",
                table: "Reputations");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Reputations");
        }
    }
}

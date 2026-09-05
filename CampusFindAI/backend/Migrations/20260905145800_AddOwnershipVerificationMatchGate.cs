using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusFindAI.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOwnershipVerificationMatchGate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PrivateVerificationDetails",
                table: "FoundItems",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LostItemId",
                table: "ClaimVerifications",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "MatchId",
                table: "ClaimVerifications",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PassedAt",
                table: "ClaimVerifications",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClaimVerifications_MatchId",
                table: "ClaimVerifications",
                column: "MatchId",
                unique: true,
                filter: "[MatchId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ClaimVerifications_MatchId",
                table: "ClaimVerifications");

            migrationBuilder.DropColumn(
                name: "PrivateVerificationDetails",
                table: "FoundItems");

            migrationBuilder.DropColumn(
                name: "LostItemId",
                table: "ClaimVerifications");

            migrationBuilder.DropColumn(
                name: "MatchId",
                table: "ClaimVerifications");

            migrationBuilder.DropColumn(
                name: "PassedAt",
                table: "ClaimVerifications");
        }
    }
}

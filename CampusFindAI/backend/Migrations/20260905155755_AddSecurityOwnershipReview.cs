using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusFindAI.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSecurityOwnershipReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SecurityReviewNote",
                table: "ClaimVerifications",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "SecurityReviewedAt",
                table: "ClaimVerifications",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SecurityReviewedByUserId",
                table: "ClaimVerifications",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SecurityReviewNote",
                table: "ClaimVerifications");

            migrationBuilder.DropColumn(
                name: "SecurityReviewedAt",
                table: "ClaimVerifications");

            migrationBuilder.DropColumn(
                name: "SecurityReviewedByUserId",
                table: "ClaimVerifications");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusFindAI.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddHandoverQrToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "HandoverQrCreatedAt",
                table: "Claims",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HandoverQrToken",
                table: "Claims",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "HandoverQrUsedAt",
                table: "Claims",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HandoverQrCreatedAt",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "HandoverQrToken",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "HandoverQrUsedAt",
                table: "Claims");
        }
    }
}

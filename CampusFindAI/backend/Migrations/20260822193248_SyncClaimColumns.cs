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
            migrationBuilder.AddColumn<string>(
                name: "ClaimantNotes",
                table: "Claims",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Claims",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETUTCDATE()");

            migrationBuilder.AddColumn<string>(
                name: "DecisionNotes",
                table: "Claims",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "Claims",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewedByUserId",
                table: "Claims",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Claims_ReviewedByUserId",
                table: "Claims",
                column: "ReviewedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Claims_AspNetUsers_ReviewedByUserId",
                table: "Claims",
                column: "ReviewedByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
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

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusFindAI.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueMatchPair : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Matches_LostItemId",
                table: "Matches");

            migrationBuilder.CreateIndex(
                name: "IX_Matches_LostItemId_FoundItemId",
                table: "Matches",
                columns: new[] { "LostItemId", "FoundItemId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Matches_LostItemId_FoundItemId",
                table: "Matches");

            migrationBuilder.CreateIndex(
                name: "IX_Matches_LostItemId",
                table: "Matches",
                column: "LostItemId");
        }
    }
}

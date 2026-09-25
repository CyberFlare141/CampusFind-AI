using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusFindAI.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddClaimChat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClaimChatConversations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClaimId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    FounderUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ClosedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsReadOnly = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClaimChatConversations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClaimChatConversations_Claims_ClaimId",
                        column: x => x.ClaimId,
                        principalTable: "Claims",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ClaimChatMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SenderUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClaimChatMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClaimChatMessages_AspNetUsers_SenderUserId",
                        column: x => x.SenderUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClaimChatMessages_ClaimChatConversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "ClaimChatConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClaimChatConversations_ClaimId",
                table: "ClaimChatConversations",
                column: "ClaimId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClaimChatMessages_ConversationId_SentAt",
                table: "ClaimChatMessages",
                columns: new[] { "ConversationId", "SentAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ClaimChatMessages_SenderUserId",
                table: "ClaimChatMessages",
                column: "SenderUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClaimChatMessages");

            migrationBuilder.DropTable(
                name: "ClaimChatConversations");
        }
    }
}

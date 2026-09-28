using CampusFindAI.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusFindAI.Api.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260918103000_AddChatbotConversations")]
public partial class AddChatbotConversations : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "ChatConversations",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                Title = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ChatConversations", x => x.Id);
                table.ForeignKey("FK_ChatConversations_AspNetUsers_UserId", x => x.UserId, "AspNetUsers", "Id", onDelete: ReferentialAction.Cascade);
            });
        migrationBuilder.CreateIndex(name: "IX_ChatConversations_UserId_UpdatedAt", table: "ChatConversations", columns: new[] { "UserId", "UpdatedAt" });

        migrationBuilder.AddColumn<Guid>(name: "ConversationId", table: "ChatHistories", type: "uniqueidentifier", nullable: true);
        migrationBuilder.AddColumn<string>(name: "Role", table: "ChatHistories", type: "nvarchar(16)", maxLength: 16, nullable: false, defaultValue: "user");

        // Preserve old standalone history by grouping it into one legacy conversation per owner.
        migrationBuilder.Sql("""
            INSERT INTO ChatConversations (Id, UserId, Title, CreatedAt, UpdatedAt)
            SELECT NEWID(), h.UserId, 'Previous conversation', MIN(h.CreatedAt), MAX(h.CreatedAt)
            FROM ChatHistories h
            GROUP BY h.UserId;
            UPDATE h SET ConversationId = c.Id
            FROM ChatHistories h INNER JOIN ChatConversations c ON c.UserId = h.UserId AND c.Title = 'Previous conversation'
            WHERE h.ConversationId IS NULL;
            """);
        migrationBuilder.AlterColumn<Guid>(name: "ConversationId", table: "ChatHistories", type: "uniqueidentifier", nullable: false, oldClrType: typeof(Guid), oldType: "uniqueidentifier", oldNullable: true);
        migrationBuilder.CreateIndex(name: "IX_ChatHistories_ConversationId_CreatedAt", table: "ChatHistories", columns: new[] { "ConversationId", "CreatedAt" });
        migrationBuilder.AddForeignKey(name: "FK_ChatHistories_ChatConversations_ConversationId", table: "ChatHistories", column: "ConversationId", principalTable: "ChatConversations", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(name: "FK_ChatHistories_ChatConversations_ConversationId", table: "ChatHistories");
        migrationBuilder.DropIndex(name: "IX_ChatHistories_ConversationId_CreatedAt", table: "ChatHistories");
        migrationBuilder.DropColumn(name: "ConversationId", table: "ChatHistories");
        migrationBuilder.DropColumn(name: "Role", table: "ChatHistories");
        migrationBuilder.DropTable(name: "ChatConversations");
    }
}

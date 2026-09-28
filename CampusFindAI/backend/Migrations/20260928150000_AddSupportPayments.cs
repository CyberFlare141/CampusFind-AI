using CampusFindAI.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusFindAI.Api.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260928150000_AddSupportPayments")]
public partial class AddSupportPayments : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "SupportPayments",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                Provider = table.Column<string>(type: "nvarchar(20)", nullable: false),
                Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                Currency = table.Column<string>(type: "nvarchar(3)", nullable: false),
                Status = table.Column<string>(type: "nvarchar(20)", nullable: false),
                MerchantInvoiceNumber = table.Column<string>(type: "nvarchar(64)", nullable: false),
                ProviderPaymentId = table.Column<string>(type: "nvarchar(128)", nullable: true),
                ProviderTransactionId = table.Column<string>(type: "nvarchar(128)", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                FailureReasonCode = table.Column<string>(type: "nvarchar(80)", nullable: true),
                IsVerified = table.Column<bool>(type: "bit", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_SupportPayments", x => x.Id);
                table.ForeignKey("FK_SupportPayments_AspNetUsers_UserId", x => x.UserId, "AspNetUsers", "Id", onDelete: ReferentialAction.Restrict);
            });
        migrationBuilder.CreateIndex(name: "IX_SupportPayments_UserId_CreatedAt", table: "SupportPayments", columns: new[] { "UserId", "CreatedAt" });
        migrationBuilder.CreateIndex(name: "IX_SupportPayments_Status_CreatedAt", table: "SupportPayments", columns: new[] { "Status", "CreatedAt" });
        migrationBuilder.CreateIndex(name: "IX_SupportPayments_MerchantInvoiceNumber", table: "SupportPayments", column: "MerchantInvoiceNumber", unique: true);
        migrationBuilder.CreateIndex(name: "IX_SupportPayments_ProviderPaymentId", table: "SupportPayments", column: "ProviderPaymentId", unique: true, filter: "[ProviderPaymentId] IS NOT NULL");
        migrationBuilder.CreateIndex(name: "IX_SupportPayments_ProviderTransactionId", table: "SupportPayments", column: "ProviderTransactionId", unique: true, filter: "[ProviderTransactionId] IS NOT NULL");
    }

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable(name: "SupportPayments");
}

using CampusFindAI.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusFindAI.Api.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260925160000_AddFounderVerificationAnswers")]
public partial class AddFounderVerificationAnswers : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "FounderVerificationAnswersJson",
            table: "FoundItems",
            type: "nvarchar(max)",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "FounderVerificationAnswersJson", table: "FoundItems");
    }
}

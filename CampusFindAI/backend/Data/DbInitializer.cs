using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using Microsoft.Data.SqlClient;

namespace CampusFindAI.Api.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var connectionFactory = services.GetRequiredService<ISqlConnectionFactory>();
        await EnsureSchemaAsync(connectionFactory);

        var userRepository = services.GetRequiredService<IUserRepository>();
        var roles = Enum.GetNames<UserRole>();

        foreach (var role in roles)
        {
            await userRepository.EnsureRoleExistsAsync(role);
        }
    }

    private static async Task EnsureSchemaAsync(ISqlConnectionFactory connectionFactory)
    {
        const string sql = """
            IF COL_LENGTH('AuditLogs', 'Details') IS NULL
            BEGIN
                ALTER TABLE AuditLogs ADD Details nvarchar(max) NULL;
            END;

            IF COL_LENGTH('Claims', 'ClaimantNotes') IS NULL
            BEGIN
                ALTER TABLE Claims ADD ClaimantNotes nvarchar(max) NULL;
            END;

            IF COL_LENGTH('Claims', 'CreatedAt') IS NULL
            BEGIN
                ALTER TABLE Claims ADD CreatedAt datetime2 NOT NULL DEFAULT GETUTCDATE();
            END;

            IF COL_LENGTH('Claims', 'DecisionNotes') IS NULL
            BEGIN
                ALTER TABLE Claims ADD DecisionNotes nvarchar(max) NULL;
            END;

            IF COL_LENGTH('Claims', 'ReviewedAt') IS NULL
            BEGIN
                ALTER TABLE Claims ADD ReviewedAt datetime2 NULL;
            END;

            IF COL_LENGTH('Claims', 'ReviewedByUserId') IS NULL
            BEGIN
                ALTER TABLE Claims ADD ReviewedByUserId nvarchar(450) NULL;
            END;

            IF NOT EXISTS (
                SELECT 1
                FROM sys.indexes
                WHERE name = 'IX_Claims_ReviewedByUserId'
                  AND object_id = OBJECT_ID('Claims')
            )
            BEGIN
                CREATE INDEX IX_Claims_ReviewedByUserId ON Claims(ReviewedByUserId);
            END;

            IF NOT EXISTS (
                SELECT 1
                FROM sys.foreign_keys
                WHERE name = 'FK_Claims_AspNetUsers_ReviewedByUserId'
            )
            BEGIN
                ALTER TABLE Claims
                ADD CONSTRAINT FK_Claims_AspNetUsers_ReviewedByUserId
                FOREIGN KEY (ReviewedByUserId)
                REFERENCES AspNetUsers (Id);
            END;
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync();
    }
}

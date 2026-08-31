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
            IF OBJECT_ID('UserProfiles', 'U') IS NULL
            BEGIN
                CREATE TABLE UserProfiles (
                    Id uniqueidentifier NOT NULL PRIMARY KEY,
                    UserId nvarchar(450) NOT NULL UNIQUE,
                    FullName nvarchar(120) NULL,
                    University nvarchar(150) NULL,
                    Department nvarchar(120) NULL,
                    JobTitle nvarchar(120) NULL,
                    Semester nvarchar(40) NULL,
                    StudentId nvarchar(50) NULL,
                    Phone nvarchar(30) NULL,
                    Bio nvarchar(500) NULL,
                    AvatarUrl nvarchar(500) NULL,
                    CONSTRAINT FK_UserProfiles_AspNetUsers_UserId FOREIGN KEY (UserId) REFERENCES AspNetUsers (Id) ON DELETE CASCADE
                );
            END
            ELSE
            BEGIN
                IF COL_LENGTH('UserProfiles', 'FullName') IS NULL ALTER TABLE UserProfiles ADD FullName nvarchar(120) NULL;
                IF COL_LENGTH('UserProfiles', 'University') IS NULL ALTER TABLE UserProfiles ADD University nvarchar(150) NULL;
                IF COL_LENGTH('UserProfiles', 'Department') IS NULL ALTER TABLE UserProfiles ADD Department nvarchar(120) NULL;
                IF COL_LENGTH('UserProfiles', 'JobTitle') IS NULL ALTER TABLE UserProfiles ADD JobTitle nvarchar(120) NULL;
                IF COL_LENGTH('UserProfiles', 'Semester') IS NULL ALTER TABLE UserProfiles ADD Semester nvarchar(40) NULL;
                IF COL_LENGTH('UserProfiles', 'StudentId') IS NULL ALTER TABLE UserProfiles ADD StudentId nvarchar(50) NULL;
                IF COL_LENGTH('UserProfiles', 'Phone') IS NULL ALTER TABLE UserProfiles ADD Phone nvarchar(30) NULL;
                IF COL_LENGTH('UserProfiles', 'Bio') IS NULL ALTER TABLE UserProfiles ADD Bio nvarchar(500) NULL;
                IF COL_LENGTH('UserProfiles', 'AvatarUrl') IS NULL ALTER TABLE UserProfiles ADD AvatarUrl nvarchar(500) NULL;
            END;

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

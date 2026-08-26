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

            IF OBJECT_ID('SecurityOfficerAccessRequests', 'U') IS NULL
            BEGIN
                CREATE TABLE SecurityOfficerAccessRequests (
                    Id uniqueidentifier NOT NULL PRIMARY KEY,
                    UserId nvarchar(450) NOT NULL,
                    Email nvarchar(256) NOT NULL,
                    FullName nvarchar(256) NULL,
                    StaffId nvarchar(100) NULL,
                    Department nvarchar(200) NULL,
                    Reason nvarchar(max) NOT NULL,
                    Status nvarchar(32) NOT NULL,
                    ReviewedByUserId nvarchar(450) NULL,
                    ReviewedAt datetime2 NULL,
                    RejectionReason nvarchar(max) NULL,
                    CreatedAt datetime2 NOT NULL,
                    CONSTRAINT FK_SecurityOfficerAccessRequests_User FOREIGN KEY (UserId) REFERENCES AspNetUsers(Id),
                    CONSTRAINT FK_SecurityOfficerAccessRequests_Reviewer FOREIGN KEY (ReviewedByUserId) REFERENCES AspNetUsers(Id)
                );
            END;

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_SecurityOfficerAccessRequests_PendingUser')
            BEGIN
                CREATE UNIQUE INDEX UX_SecurityOfficerAccessRequests_PendingUser
                ON SecurityOfficerAccessRequests(UserId) WHERE Status = 'Pending';
            END;

            IF OBJECT_ID('TR_AdminMaximumFour', 'TR') IS NULL
            BEGIN
                EXEC(N'
                    CREATE TRIGGER TR_AdminMaximumFour ON AspNetUsers
                    AFTER INSERT, UPDATE
                    AS
                    BEGIN
                        SET NOCOUNT ON;
                        IF (SELECT COUNT(*) FROM AspNetUsers WITH (TABLOCKX) WHERE Role = ''Administrator'') > 4
                        BEGIN
                            ROLLBACK TRANSACTION;
                            THROW 51000, ''Maximum number of administrators reached.'', 1;
                        END
                    END');
            END;
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync();
    }
}

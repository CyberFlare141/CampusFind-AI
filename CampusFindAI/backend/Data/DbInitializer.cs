using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

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

        var dbContext = services.GetRequiredService<ApplicationDbContext>();
        var configuration = services.GetRequiredService<IConfiguration>();
        await SeedReferenceDataAsync(dbContext, configuration);
    }

    private static async Task SeedReferenceDataAsync(ApplicationDbContext dbContext, IConfiguration configuration)
    {
        var categories = configuration.GetSection("ReferenceData:Categories").Get<string[]>() ?? [];
        var buildings = configuration.GetSection("ReferenceData:Buildings").Get<List<ReferenceBuildingSeed>>() ?? [];
        var floors = configuration.GetSection("ReferenceData:Floors").Get<List<ReferenceFloorSeed>>() ?? [];

        var existingCategories = await dbContext.Categories.Select(item => item.Name).ToListAsync();
        dbContext.Categories.AddRange(categories
            .Where(name => !existingCategories.Contains(name, StringComparer.OrdinalIgnoreCase))
            .Select(name => new Category { Id = Guid.NewGuid(), Name = name }));

        var existingBuildings = await dbContext.Buildings.ToListAsync();
        foreach (var configuredBuilding in buildings)
        {
            var building = existingBuildings.FirstOrDefault(item => string.Equals(item.Name, configuredBuilding.Name, StringComparison.OrdinalIgnoreCase));
            if (building is null)
            {
                building = new Building { Id = Guid.NewGuid(), Name = configuredBuilding.Name };
                dbContext.Buildings.Add(building);
                existingBuildings.Add(building);
            }

            var existingFloors = await dbContext.Floors.Where(item => item.BuildingId == building.Id).ToListAsync();
            foreach (var configuredFloor in floors)
            {
                var floor = existingFloors.FirstOrDefault(item => item.FloorNumber == configuredFloor.FloorNumber);
                if (floor is null)
                {
                    floor = new Floor { Id = Guid.NewGuid(), BuildingId = building.Id, FloorNumber = configuredFloor.FloorNumber, Name = configuredFloor.Name };
                    dbContext.Floors.Add(floor);
                    existingFloors.Add(floor);
                }

                var existingLocationNames = await dbContext.Locations
                    .Where(item => item.FloorId == floor.Id).Select(item => item.Name).ToListAsync();
                dbContext.Locations.AddRange(configuredFloor.Locations
                    .Where(name => !existingLocationNames.Contains(name, StringComparer.OrdinalIgnoreCase))
                    .Select(name => new Location { Id = Guid.NewGuid(), BuildingId = building.Id, FloorId = floor.Id, Name = name }));
            }
        }
        await dbContext.SaveChangesAsync();
    }

    private sealed class ReferenceBuildingSeed
    {
        public string Name { get; set; } = string.Empty;
    }

    private sealed class ReferenceFloorSeed
    {
        public int FloorNumber { get; set; }
        public string Name { get; set; } = string.Empty;
        public string[] Locations { get; set; } = [];
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

            IF COL_LENGTH('Claims', 'HandedOverByUserId') IS NULL
            BEGIN
                ALTER TABLE Claims ADD HandedOverByUserId nvarchar(max) NULL;
            END;

            IF COL_LENGTH('Claims', 'HandedOverAt') IS NULL
            BEGIN
                ALTER TABLE Claims ADD HandedOverAt datetime2 NULL;
            END;

            IF COL_LENGTH('Claims', 'HandoverNotes') IS NULL
            BEGIN
                ALTER TABLE Claims ADD HandoverNotes nvarchar(max) NULL;
            END;

            IF COL_LENGTH('FoundItems', 'Status') IS NULL
            BEGIN
                ALTER TABLE FoundItems ADD Status nvarchar(30) NOT NULL CONSTRAINT DF_FoundItems_Status DEFAULT 'Available';
            END;

            IF COL_LENGTH('FoundItems', 'CreatedAt') IS NULL
            BEGIN
                ALTER TABLE FoundItems ADD CreatedAt datetime2 NOT NULL CONSTRAINT DF_FoundItems_CreatedAt DEFAULT GETUTCDATE();
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

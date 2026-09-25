using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

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
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var environment = services.GetRequiredService<IHostEnvironment>();
        var configuration = services.GetRequiredService<IConfiguration>();

        await SeedLocalDevelopmentAccountsAsync(userManager, userRepository, dbContext, environment);
        await SeedReferenceDataAsync(dbContext, configuration);
    }

    public static async Task SeedLocalDevelopmentAccountsAsync(
        UserManager<ApplicationUser> userManager,
        IUserRepository userRepository,
        ApplicationDbContext dbContext,
        IHostEnvironment environment)
    {
        if (!environment.IsDevelopment())
        {
            return;
        }

        var localAccounts = new[]
        {
            new LocalDevelopmentAccount("samiul.cse.20230104141@aust.edu", UserRole.Student, "123456Aa"),
            new LocalDevelopmentAccount("sazid.cse.20230104140@aust.edu", UserRole.Student, "123456Aa"),
            new LocalDevelopmentAccount("mahi.cse.20230104130@aust.edu", UserRole.Administrator, "123456Aa"),
            new LocalDevelopmentAccount("masrafi.cse.20230104141@aust.edu", UserRole.SecurityOfficer, "123456Aa")
        };

        foreach (var account in localAccounts)
        {
            var user = await userManager.FindByEmailAsync(account.Email);
            if (user is null)
            {
                user = new ApplicationUser
                {
                    Id = Guid.NewGuid().ToString(),
                    UserName = account.Email,
                    Email = account.Email,
                    Role = account.Role,
                    IsRestricted = false,
                    EmailConfirmed = true,
                    LockoutEnabled = true,
                    SecurityStamp = Guid.NewGuid().ToString(),
                    ConcurrencyStamp = Guid.NewGuid().ToString(),
                    AccessFailedCount = 0
                };

                var createResult = await userManager.CreateAsync(user, account.Password);
                if (!createResult.Succeeded)
                {
                    throw new InvalidOperationException($"Could not create local development account {account.Email}: {string.Join("; ", createResult.Errors.Select(error => error.Description))}");
                }
            }
            else
            {
                user.UserName ??= account.Email;
                user.Email = account.Email;
                user.Role = account.Role;
                user.IsRestricted = false;
                user.EmailConfirmed = true;
                user.LockoutEnabled = true;
                user.AccessFailedCount = 0;

                var updateResult = await userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    throw new InvalidOperationException($"Could not update local development account {account.Email}: {string.Join("; ", updateResult.Errors.Select(error => error.Description))}");
                }

                var passwordResult = await userManager.RemovePasswordAsync(user);
                if (!passwordResult.Succeeded)
                {
                    throw new InvalidOperationException($"Could not clear password for local development account {account.Email}: {string.Join("; ", passwordResult.Errors.Select(error => error.Description))}");
                }

                var setPasswordResult = await userManager.AddPasswordAsync(user, account.Password);
                if (!setPasswordResult.Succeeded)
                {
                    throw new InvalidOperationException($"Could not set password for local development account {account.Email}: {string.Join("; ", setPasswordResult.Errors.Select(error => error.Description))}");
                }
            }

            var roleName = account.Role.ToString();
            await userRepository.EnsureRoleExistsAsync(roleName);
            var existingRoles = await userManager.GetRolesAsync(user);
            if (!existingRoles.Contains(roleName, StringComparer.OrdinalIgnoreCase))
            {
                var addRoleResult = await userManager.AddToRoleAsync(user, roleName);
                if (!addRoleResult.Succeeded)
                {
                    throw new InvalidOperationException($"Could not assign role {roleName} to {account.Email}: {string.Join("; ", addRoleResult.Errors.Select(error => error.Description))}");
                }
            }

            await userRepository.AddToRoleAsync(user.Id, roleName);

            user.Role = account.Role;
            await userManager.UpdateAsync(user);

            var profile = await dbContext.UserProfiles.FirstOrDefaultAsync(x => x.UserId == user.Id);
            if (profile is null)
            {
                dbContext.UserProfiles.Add(new UserProfile
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    FullName = account.Email.Split('@')[0].Replace('.', ' '),
                    University = "AUST",
                    Department = "CSE"
                });
            }
        }

        await dbContext.SaveChangesAsync();
    }

    private sealed record LocalDevelopmentAccount(string Email, UserRole Role, string Password);

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

            IF COL_LENGTH('Notifications', 'CreatedAt') IS NULL
            BEGIN
                ALTER TABLE Notifications ADD CreatedAt datetime2 NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT GETUTCDATE();
            END;

            IF COL_LENGTH('AspNetUsers', 'IsRestricted') IS NULL
            BEGIN
                ALTER TABLE AspNetUsers ADD IsRestricted bit NOT NULL CONSTRAINT DF_AspNetUsers_IsRestricted DEFAULT 0;
            END;

            IF OBJECT_ID('SecurityOfficerRequests', 'U') IS NULL
            BEGIN
                CREATE TABLE SecurityOfficerRequests (
                    Id uniqueidentifier NOT NULL PRIMARY KEY,
                    UserId nvarchar(450) NOT NULL,
                    Reason nvarchar(500) NOT NULL,
                    AdditionalInformation nvarchar(2000) NOT NULL,
                    Status nvarchar(30) NOT NULL,
                    SubmittedAt datetime2 NOT NULL,
                    ReviewedAt datetime2 NULL,
                    ReviewedByUserId nvarchar(450) NULL,
                    AdminNotes nvarchar(1000) NULL,
                    CONSTRAINT FK_SecurityOfficerRequests_User FOREIGN KEY (UserId) REFERENCES AspNetUsers (Id) ON DELETE CASCADE,
                    CONSTRAINT FK_SecurityOfficerRequests_Reviewer FOREIGN KEY (ReviewedByUserId) REFERENCES AspNetUsers (Id)
                );
                CREATE INDEX IX_SecurityOfficerRequests_UserId_Status ON SecurityOfficerRequests(UserId, Status);
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

            IF OBJECT_ID('ChatConversations', 'U') IS NULL
            BEGIN
                CREATE TABLE ChatConversations (
                    Id uniqueidentifier NOT NULL PRIMARY KEY,
                    UserId nvarchar(450) NOT NULL,
                    Title nvarchar(120) NOT NULL,
                    CreatedAt datetime2 NOT NULL DEFAULT GETUTCDATE(),
                    UpdatedAt datetime2 NOT NULL DEFAULT GETUTCDATE(),
                    CONSTRAINT FK_ChatConversations_AspNetUsers_UserId FOREIGN KEY (UserId) REFERENCES AspNetUsers (Id) ON DELETE CASCADE
                );
                CREATE INDEX IX_ChatConversations_UserId_UpdatedAt ON ChatConversations (UserId, UpdatedAt);
            END;

            IF OBJECT_ID('ChatHistories', 'U') IS NULL
            BEGIN
                CREATE TABLE ChatHistories (
                    Id uniqueidentifier NOT NULL PRIMARY KEY,
                    ConversationId uniqueidentifier NOT NULL,
                    UserId nvarchar(450) NOT NULL,
                    Role nvarchar(16) NOT NULL DEFAULT 'user',
                    Message nvarchar(4000) NOT NULL,
                    CreatedAt datetime2 NOT NULL DEFAULT GETUTCDATE(),
                    CONSTRAINT FK_ChatHistories_AspNetUsers_UserId FOREIGN KEY (UserId) REFERENCES AspNetUsers (Id) ON DELETE CASCADE,
                    CONSTRAINT FK_ChatHistories_ChatConversations_ConversationId FOREIGN KEY (ConversationId) REFERENCES ChatConversations (Id)
                );
                CREATE INDEX IX_ChatHistories_ConversationId_CreatedAt ON ChatHistories (ConversationId, CreatedAt);
            END;

            -- Safe migration: Ensure Administrator and Security Officer accounts are confirmed so they are not locked out
            UPDATE AspNetUsers
            SET EmailConfirmed = 1
            WHERE Role IN ('Administrator', 'SecurityOfficer') AND EmailConfirmed = 0;

            -- Safe migration: Ensure LockoutEnabled is enabled for all accounts
            UPDATE AspNetUsers
            SET LockoutEnabled = 1
            WHERE LockoutEnabled = 0;
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync();
    }
}

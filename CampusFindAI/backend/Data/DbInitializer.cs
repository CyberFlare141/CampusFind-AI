using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace CampusFindAI.Api.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(IServiceProvider services)
    {
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
        await BackfillDevelopmentVerificationEvidenceAsync(dbContext, environment);
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

    // Older local sample reports existed before the three-question founder
    // verification flow. Populate development data only, so that sample claims
    // exercise the same protected journey as newly created reports. Production
    // records must always be completed by the finder in the report form.
    private static async Task BackfillDevelopmentVerificationEvidenceAsync(ApplicationDbContext dbContext, IHostEnvironment environment)
    {
        if (!environment.IsDevelopment()) return;

        var legacyReports = await dbContext.FoundItems
            .Where(item => string.IsNullOrWhiteSpace(item.FounderVerificationAnswersJson))
            .ToListAsync();

        foreach (var item in legacyReports)
        {
            var distinguishingDetail = string.IsNullOrWhiteSpace(item.PrivateVerificationDetails)
                ? item.Description ?? item.Title
                : item.PrivateVerificationDetails;
            var answers = new[]
            {
                distinguishingDetail,
                $"Reported near {item.LocationDetails ?? "the campus location"}.",
                item.Description ?? item.Title
            };
            item.FounderVerificationAnswersJson = OwnershipVerificationQuestions.SerializeFounderAnswers(answers);
        }

        if (legacyReports.Count > 0) await dbContext.SaveChangesAsync();
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

}

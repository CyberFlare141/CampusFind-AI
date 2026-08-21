using CampusFindAI.Api.Models;
using Microsoft.AspNetCore.Identity;

namespace CampusFindAI.Api.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var roles = Enum.GetNames<UserRole>();

        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole(role));
            }
        }

        // Placeholder for domain seed data.
        // Add categories, buildings, etc. here when the domain model stabilizes.
    }
}

using System.Text;
using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace CampusFindAI.Api.Extensions;

public static class IdentityExtensions
{
    public static IServiceCollection AddIdentityAndJwt(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddIdentityCore<ApplicationUser>(options =>
        {
            options.User.RequireUniqueEmail = true;
            options.SignIn.RequireConfirmedEmail = true;

            options.Password.RequiredLength = 8;
            options.Password.RequireDigit = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireNonAlphanumeric = false;

            options.Lockout.AllowedForNewUsers = true;
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);

            options.Tokens.EmailConfirmationTokenProvider =
                TokenOptions.DefaultEmailProvider;

            options.Tokens.PasswordResetTokenProvider =
                TokenOptions.DefaultEmailProvider;
        })
        .AddRoles<IdentityRole>()
        .AddRoleManager<RoleManager<IdentityRole>>()
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

        services.AddScoped<IPasswordHasher<ApplicationUser>, PasswordHasher<ApplicationUser>>();

        var jwtKey = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is missing.");

        var issuer = configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException("Jwt:Issuer is missing.");

        var audience = configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException("Jwt:Audience is missing.");

        var authenticationBuilder = services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme =
                JwtBearerDefaults.AuthenticationScheme;

            options.DefaultChallengeScheme =
                JwtBearerDefaults.AuthenticationScheme;
        });

        authenticationBuilder.AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                ValidIssuer = issuer,
                ValidAudience = audience,

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtKey))
            };

            // A JWT issued before a password change must not remain usable
            // until its expiry.
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    if (!string.IsNullOrEmpty(accessToken) && (context.HttpContext.Request.Path.StartsWithSegments("/hubs/claim-chat") || context.HttpContext.Request.Path.StartsWithSegments("/hubs/notifications"))) context.Token = accessToken;
                    return Task.CompletedTask;
                },
                OnTokenValidated = async context =>
                {
                    var userId = context.Principal?
                        .FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?
                        .Value;

                    var tokenStamp = context.Principal?
                        .FindFirst("security_stamp")?
                        .Value;

                    if (string.IsNullOrWhiteSpace(userId) ||
                        string.IsNullOrWhiteSpace(tokenStamp))
                    {
                        context.Fail("Invalid token.");
                        return;
                    }

                    var db = context.HttpContext.RequestServices
                        .GetRequiredService<ApplicationDbContext>();

                    var currentStamp = await db.Users
                        .AsNoTracking()
                        .Where(user => user.Id == userId)
                        .Select(user => user.SecurityStamp)
                        .SingleOrDefaultAsync(
                            context.HttpContext.RequestAborted);

                    if (currentStamp is null ||
                        !string.Equals(
                            currentStamp,
                            tokenStamp,
                            StringComparison.Ordinal))
                    {
                        context.Fail("Token is no longer valid.");
                    }
                }
            };
        });

        services.AddAuthorization();

        return services;
    }

    public static async Task SeedIdentityAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();

        var dbContext = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        // Create/update the database tables, including ASP.NET Identity tables.
        await dbContext.Database.MigrateAsync();

        // Run the application's custom database initialization and seeding.
        await DbInitializer.SeedAsync(scope.ServiceProvider);
    }
}

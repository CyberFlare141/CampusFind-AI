using CampusFindAI.Api.Data;
using CampusFindAI.Api.Repositories;
using CampusFindAI.Api.Services;

namespace CampusFindAI.Api.Extensions;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is missing.");

        services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<ILostItemRepository, LostItemRepository>();
        services.AddScoped<ILostItemService, LostItemService>();
        services.AddScoped<IFoundItemRepository, FoundItemRepository>();
        services.AddScoped<IFoundItemService, FoundItemService>();
        services.AddScoped<IClaimRepository, ClaimRepository>();
        services.AddScoped<IClaimService, ClaimService>();
        services.AddScoped<IMatchRepository, MatchRepository>();
        services.AddScoped<IMatchService, MatchService>();
        services.AddScoped<ISecurityDashboardService, SecurityDashboardService>();

        return services;
    }

    public static IServiceCollection AddCorsPolicy(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("Frontend", policy =>
            {
                policy.WithOrigins("http://localhost:5173")
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        return services;
    }
}

using CampusFindAI.Api.Data;
using CampusFindAI.Api.Repositories;
using CampusFindAI.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Extensions;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection is missing.");

        services.AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(connectionString));
        services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<ILostItemRepository, LostItemRepository>();
        services.AddScoped<ILostItemService, LostItemService>();
        services.AddScoped<IFoundItemRepository, FoundItemRepository>();
        services.AddScoped<IFoundItemService, FoundItemService>();
        services.AddScoped<IImageRepository, ImageRepository>();
        services.AddSingleton<IReportImageStorage, ReportImageStorage>();
        services.AddScoped<IClaimRepository, ClaimRepository>();
        services.AddScoped<IClaimService, ClaimService>();
        services.AddScoped<IClaimVerificationRepository, ClaimVerificationRepository>();
        services.AddScoped<IOwnershipVerificationService, OwnershipVerificationService>();
        services.AddDataProtection();
        services.AddScoped<IMatchRepository, MatchRepository>();
        services.AddSingleton<IImageSimilarityService, ImageSimilarityService>();
        services.AddScoped<IMatchService, MatchService>();
        services.AddScoped<ISecurityDashboardService, SecurityDashboardService>();
        services.AddHttpClient("Gemini");
        services.AddScoped<ISemanticSearchService, SemanticSearchService>();

        return services;
    }

    public static IServiceCollection AddCorsPolicy(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("Frontend", policy =>
            {
                var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                    ?? ["http://localhost:5173"];

                policy.WithOrigins(origins)
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        return services;
    }
}

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
        services.AddScoped<IReferenceDataService, ReferenceDataService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IImageRepository, ImageRepository>();
        services.AddSingleton<IReportImageStorage, ReportImageStorage>();
        services.AddScoped<IClaimRepository, ClaimRepository>();
        services.AddScoped<IClaimService, ClaimService>();
        services.AddScoped<IClaimVerificationRepository, ClaimVerificationRepository>();
        services.AddOptions<OwnershipVerificationOptions>()
            .Bind(configuration.GetSection(OwnershipVerificationOptions.SectionName))
            .Validate(x => x.MatchEligibilityThreshold is >= 0m and <= 1m, "MatchEligibilityThreshold must be between 0 and 1.")
            .Validate(x => x.QuestionCount is >= 3 and <= 4, "QuestionCount must be between 3 and 4.")
            .Validate(x => x.MaxAttempts is >= 1 and <= 5, "MaxAttempts must be between 1 and 5.")
            .ValidateOnStart();
        services.AddScoped<IOwnershipQuestionGenerator, GeminiOwnershipQuestionGenerator>();
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

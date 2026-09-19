using System.Threading.RateLimiting;
using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.RateLimiting;
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

        // Domain verification & Email service
        services.Configure<UniversityEmailOptions>(configuration.GetSection(UniversityEmailOptions.SectionName));
        services.AddSingleton<IUniversityDomainValidator, UniversityDomainValidator>();
        services.Configure<EmailOptions>(configuration.GetSection(EmailOptions.SectionName));
        services.AddScoped<IEmailService, EmailService>();

        // Google OAuth service
        services.Configure<GoogleAuthOptions>(configuration.GetSection("Google"));
        services.AddScoped<IGoogleAuthService, GoogleAuthService>();

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IInstitutionalAccessService, InstitutionalAccessService>();
        services.AddScoped<ISecurityOfficerRequestService, SecurityOfficerRequestService>();
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
        services.AddScoped<IChatbotService, ChatbotService>();

        return services;
    }

    public static IServiceCollection AddCorsPolicy(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("Frontend", policy =>
            {
                var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                    ?? ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"];

                policy.WithOrigins(origins)
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        return services;
    }

    public static IServiceCollection AddRateLimitingPolicies(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy("AuthRateLimit", httpContext =>
            {
                var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonymous";
                return RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: clientIp,
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 20,
                        Window = TimeSpan.FromMinutes(1),
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0
                    });
            });
        });

        return services;
    }
}

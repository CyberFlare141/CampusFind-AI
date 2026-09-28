using CampusFindAI.Api.Extensions;
using CampusFindAI.Api.Middleware;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.OpenApi;
using Microsoft.Extensions.FileProviders;
using System.Reflection;
using CampusFindAI.Api.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Render (like most container hosts) injects the port the service must listen on. Only applied when present so
// local development keeps using launchSettings.json / ASPNETCORE_URLS.
var hostPort = Environment.GetEnvironmentVariable("PORT");
if (int.TryParse(hostPort, out var renderPort) && renderPort > 0)
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{renderPort}");
}

// A hosting platform terminates TLS and forwards the original scheme/client address. Trusting those headers is what
// lets HTTPS redirection and per-IP rate limiting see the real request. Enabled by default on Render (PORT set) and
// overridable with ForwardedHeaders__Enabled=false.
if (builder.Configuration.GetValue("ForwardedHeaders:Enabled", hostPort is not null))
{
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
    });
}

ValidateProductionConfiguration(builder.Configuration, builder.Environment);

builder.Services.AddApplicationServices(builder.Configuration);
builder.Services.AddIdentityAndJwt(builder.Configuration);   // This calls the extension method to add Identity and JWT authentication
builder.Services.AddCorsPolicy(builder.Configuration);
builder.Services.AddRateLimitingPolicies();
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "JWT Authorization header using the Bearer scheme."
    });

    options.AddSecurityRequirement(document =>
        new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference("Bearer", document)] = []
        });
});

var app = builder.Build();
var webRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "reports"));

app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // Behind Render's TLS-terminating proxy the forwarded headers must be processed first, otherwise the request
    // looks like plain HTTP and this redirect would loop.
    app.UseForwardedHeaders();
    app.UseHttpsRedirection();
}

app.UseCors("Frontend");
app.UseRateLimiter();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(webRoot)
});
app.UseAuthentication();  //Look at the incoming request and figure out who the user is
app.UseAuthorization();   // ''    ''    ''        ''          ''
app.MapControllers();
app.MapHub<ClaimChatHub>("/hubs/claim-chat");
app.MapHub<NotificationHub>("/hubs/notifications");

app.MapGet("/", () => Results.Ok(new
{
    message = "CampusFindAI API is running",
    status = "healthy"
}));

await app.SeedIdentityAsync();

app.Run();

static void ValidateProductionConfiguration(IConfiguration configuration, IHostEnvironment environment)
{
    if (environment.IsDevelopment()) return;

    var errors = new List<string>();
    var jwtKey = configuration["Jwt:Key"];
    if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32 || jwtKey.Contains("development-only", StringComparison.OrdinalIgnoreCase) || jwtKey.Contains("replace_with", StringComparison.OrdinalIgnoreCase))
        errors.Add("Jwt:Key must be a unique secret of at least 32 characters, supplied through environment configuration or a secret store.");

    var emailProvider = configuration["Email:Provider"];
    var smtpHost = configuration["Email:Smtp:Host"];
    var frontendBaseUrl = configuration["Email:FrontendBaseUrl"];
    if (!string.Equals(emailProvider, "Smtp", StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(smtpHost))
        errors.Add("Email:Provider must be Smtp and Email:Smtp:Host must be configured.");
    if (!Uri.TryCreate(frontendBaseUrl, UriKind.Absolute, out var frontendUri) || frontendUri.Scheme != Uri.UriSchemeHttps)
        errors.Add("Email:FrontendBaseUrl must be an HTTPS URL in production.");

    if (configuration.GetValue<bool>("Payments:UseMockProvider"))
        errors.Add("Payments:UseMockProvider is Development-only and must be false in production.");

    if (errors.Count > 0)
        throw new InvalidOperationException("Production configuration is incomplete: " + string.Join(" ", errors));
}

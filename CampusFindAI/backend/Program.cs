using CampusFindAI.Api.Extensions;
using CampusFindAI.Api.Middleware;
using Microsoft.OpenApi;
using Microsoft.Extensions.FileProviders;
using System.Reflection;
using CampusFindAI.Api.Hubs;

var builder = WebApplication.CreateBuilder(args);

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

app.MapGet("/", () => Results.Ok(new
{
    message = "CampusFindAI API is running",
    status = "healthy"
}));

await app.SeedIdentityAsync();

app.Run();

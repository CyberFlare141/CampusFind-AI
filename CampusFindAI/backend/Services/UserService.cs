using System.IdentityModel.Tokens.Jwt;
using System.Text;
using SecurityClaim = System.Security.Claims.Claim;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Data;
using CampusFindAI.Api.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace CampusFindAI.Api.Services;

public class UserService(
    IUserRepository userRepository,
    IPasswordHasher<ApplicationUser> passwordHasher,
    IOptions<IdentityOptions> identityOptions,
    IConfiguration configuration,
    IAuditLogService auditLogService,
    ApplicationDbContext dbContext) : IUserService
{
    private readonly PasswordOptions _passwordOptions = identityOptions.Value.Password;

    public async Task<AuthResponseDto> RegisterAsync(
        RegisterDto request,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var email = request.Email.Trim();
        var existingUser = await userRepository.GetByEmailAsync(email, cancellationToken);
        if (existingUser is not null)
        {
            throw new InvalidOperationException("A user with this email already exists.");
        }

        ValidatePassword(request.Password);

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = email,
            NormalizedUserName = Normalize(email),
            Email = email,
            NormalizedEmail = Normalize(email),
            Role = UserRole.Student,
            EmailConfirmed = false,
            SecurityStamp = Guid.NewGuid().ToString(),
            ConcurrencyStamp = Guid.NewGuid().ToString(),
            LockoutEnabled = false,
            AccessFailedCount = 0
        };

        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        await userRepository.CreateAsync(user, cancellationToken);
        await userRepository.AddToRoleAsync(user.Id, UserRole.Student.ToString(), cancellationToken);

        return await CreateAuthResponseAsync(user, cancellationToken);
    }

    public async Task<AuthResponseDto> LoginAsync(
        LoginDto request,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var user = await userRepository.GetByEmailAsync(request.Email.Trim(), cancellationToken)
            ?? throw new UnauthorizedAccessException("Invalid email or password.");

        var verification = passwordHasher.VerifyHashedPassword(
            user,
            user.PasswordHash ?? string.Empty,
            request.Password);

        if (verification == PasswordVerificationResult.Failed)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        await auditLogService.LogAsync(
            user.Id,
            "Login",
            $"Successful login for {user.Email}.",
            cancellationToken);

        return await CreateAuthResponseAsync(user, cancellationToken);
    }

    public async Task<ProfileDto> GetProfileAsync(string userId, CancellationToken cancellationToken = default)
    {
        var user = await RequireUserAsync(userId, cancellationToken);
        var profile = await dbContext.UserProfiles.SingleOrDefaultAsync(value => value.UserId == userId, cancellationToken);
        return ToProfileDto(user, profile);
    }

    public async Task<ProfileDto> UpdateProfileAsync(string userId, UpdateProfileDto request, CancellationToken cancellationToken = default)
    {
        var user = await RequireUserAsync(userId, cancellationToken);
        var profile = await dbContext.UserProfiles.SingleOrDefaultAsync(value => value.UserId == userId, cancellationToken);
        if (profile is null)
        {
            profile = new UserProfile { Id = Guid.NewGuid(), UserId = userId };
            dbContext.UserProfiles.Add(profile);
        }
        profile.FullName = Clean(request.FullName);
        profile.Department = Clean(request.Department);
        profile.JobTitle = Clean(request.JobTitle);
        profile.Semester = Clean(request.Semester);
        profile.StudentId = Clean(request.StudentId);
        profile.Phone = Clean(request.Phone);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToProfileDto(user, profile);
    }

    public async Task ChangePasswordAsync(string userId, ChangePasswordDto request, CancellationToken cancellationToken = default)
    {
        var user = await RequireUserAsync(userId, cancellationToken);
        if (passwordHasher.VerifyHashedPassword(user, user.PasswordHash ?? string.Empty, request.CurrentPassword) == PasswordVerificationResult.Failed)
            throw new UnauthorizedAccessException("Current password is incorrect.");
        ValidatePassword(request.NewPassword);
        await userRepository.UpdatePasswordHashAsync(userId, passwordHasher.HashPassword(user, request.NewPassword), cancellationToken);
    }

    private async Task<AuthResponseDto> CreateAuthResponseAsync(
        ApplicationUser user,
        CancellationToken cancellationToken)
    {
        var roles = await userRepository.GetRolesAsync(user.Id, cancellationToken);
        var token = GenerateToken(user, roles);

        return new AuthResponseDto
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddHours(2),
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                Role = user.Role.ToString()
            }
        };
    }

    private string GenerateToken(ApplicationUser user, IEnumerable<string> roles)
    {
        var key = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is missing.");
        var issuer = configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException("Jwt:Issuer is missing.");
        var audience = configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException("Jwt:Audience is missing.");

        var claims = new List<SecurityClaim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(System.Security.Claims.ClaimTypes.NameIdentifier, user.Id),
            new(System.Security.Claims.ClaimTypes.Role, user.Role.ToString())
        };

        claims.AddRange(
            roles.Select(role =>
                new SecurityClaim(System.Security.Claims.ClaimTypes.Role, role)));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private void ValidatePassword(string password)
    {
        var errors = new List<string>();

        if (password.Length < _passwordOptions.RequiredLength)
        {
            errors.Add($"Passwords must be at least {_passwordOptions.RequiredLength} characters.");
        }

        if (_passwordOptions.RequireDigit && !password.Any(char.IsDigit))
        {
            errors.Add("Passwords must have at least one digit ('0'-'9').");
        }

        if (_passwordOptions.RequireUppercase && !password.Any(char.IsUpper))
        {
            errors.Add("Passwords must have at least one uppercase ('A'-'Z').");
        }

        if (_passwordOptions.RequireLowercase && !password.Any(char.IsLower))
        {
            errors.Add("Passwords must have at least one lowercase ('a'-'z').");
        }

        if (_passwordOptions.RequireNonAlphanumeric && password.All(char.IsLetterOrDigit))
        {
            errors.Add("Passwords must have at least one non alphanumeric character.");
        }

        if (errors.Count > 0)
        {
            throw new InvalidOperationException(string.Join("; ", errors));
        }
    }

    private static string Normalize(string value) => value.Trim().ToUpperInvariant();

    private async Task<ApplicationUser> RequireUserAsync(string userId, CancellationToken cancellationToken) =>
        await userRepository.GetByIdAsync(userId, cancellationToken) ?? throw new UnauthorizedAccessException("Your account could not be found.");

    private static ProfileDto ToProfileDto(ApplicationUser user, UserProfile? profile) => new()
    {
        Email = user.Email ?? string.Empty, Role = user.Role.ToString(), FullName = profile?.FullName,
        Department = profile?.Department, JobTitle = profile?.JobTitle, Semester = profile?.Semester,
        StudentId = profile?.StudentId, Phone = profile?.Phone
    };

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

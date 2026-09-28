using System.IdentityModel.Tokens.Jwt;
using System.Text;
using SecurityClaim = System.Security.Claims.Claim;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Data;
using CampusFindAI.Api.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace CampusFindAI.Api.Services;

public class UserService(
    UserManager<ApplicationUser> userManager,
    IUserRepository userRepository,
    IUniversityDomainValidator domainValidator,
    IEmailService emailService,
    IGoogleAuthService googleAuthService,
    IOptions<IdentityOptions> identityOptions,
    IConfiguration configuration,
    IAuditLogService auditLogService,
    ApplicationDbContext dbContext,
    ILogger<UserService> logger) : IUserService
{
    private readonly PasswordOptions _passwordOptions = identityOptions.Value.Password;

    public async Task<RegisterResponseDto> RegisterAsync(
        RegisterDto request,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var email = request.Email.Trim();

        if (!domainValidator.IsAllowedDomain(email))
        {
            throw new InvalidOperationException(
                "Please register with an authorized university email address (e.g., @aust.edu).");
        }

        var existingUser = await userManager.FindByEmailAsync(email);
        if (existingUser is not null)
        {
            throw new InvalidOperationException(
                "An account with this email address already exists.");
        }

        ValidatePassword(request.Password);

        const UserRole role = UserRole.Student;

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = email,
            Email = email,
            Role = role,
            IsRestricted = false,
            EmailConfirmed = false,
            LockoutEnabled = true,
            SecurityStamp = Guid.NewGuid().ToString(),
            ConcurrencyStamp = Guid.NewGuid().ToString(),
            AccessFailedCount = 0
        };

        var createResult = await userManager.CreateAsync(user, request.Password);

        if (!createResult.Succeeded)
        {
            var errors = string.Join(
                "; ",
                createResult.Errors.Select(e => e.Description));

            throw new InvalidOperationException(
                $"Could not create account: {errors}");
        }

        await userManager.AddToRoleAsync(user, role.ToString());

        await userRepository.AddToRoleAsync(
            user.Id,
            role.ToString(),
            cancellationToken);

        var token = await userManager.GenerateEmailConfirmationTokenAsync(user);

        await emailService.SendEmailConfirmationAsync(
            user.Email!,
            user.Id,
            token,
            cancellationToken);

        await auditLogService.LogAsync(
            user.Id,
            "Register",
            $"Registration initiated for {user.Email}. Awaiting email confirmation.",
            cancellationToken);

        return new RegisterResponseDto
        {
            RequiresEmailConfirmation = true,
            Email = user.Email!,
            MaskedEmail = MaskEmail(user.Email!),
            Message =
                "Account created. Please check your university email to verify your account."
        };
    }

    public async Task<AuthMessageResponseDto> ConfirmEmailAsync(
        ConfirmEmailDto request,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var user = await userManager.FindByIdAsync(request.UserId);

        if (user is null)
        {
            throw new InvalidOperationException(
                "The email confirmation link is invalid or has expired.");
        }

        if (user.EmailConfirmed)
        {
            return new AuthMessageResponseDto
            {
                Message =
                    "Your email address is already verified. You can sign in to your account."
            };
        }

        string decodedToken;

        try
        {
            decodedToken = Encoding.UTF8.GetString(
                WebEncoders.Base64UrlDecode(request.Token));
        }
        catch (Exception)
        {
            throw new InvalidOperationException(
                "The email confirmation link is malformed or invalid.");
        }

        var result = await userManager.ConfirmEmailAsync(
            user,
            decodedToken);

        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                "The email confirmation link is invalid or has expired. Please request a new verification email.");
        }

        user.IsRestricted = false;

        await userManager.UpdateAsync(user);

        await auditLogService.LogAsync(
            user.Id,
            "ConfirmEmail",
            $"Email confirmed for {user.Email}.",
            cancellationToken);

        return new AuthMessageResponseDto
        {
            Message =
                "Your email has been confirmed successfully! You can now sign in."
        };
    }

    public async Task<AuthMessageResponseDto> ResendConfirmationAsync(
        ResendConfirmationDto request,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        const string genericResponse =
            "If an unverified account exists for this email, a verification link has been sent.";

        var email = request.Email.Trim();

        var user = await userManager.FindByEmailAsync(email);

        if (user is null ||
            user.EmailConfirmed ||
            await userManager.IsLockedOutAsync(user))
        {
            return new AuthMessageResponseDto
            {
                Message = genericResponse
            };
        }

        var token =
            await userManager.GenerateEmailConfirmationTokenAsync(user);

        await emailService.SendEmailConfirmationAsync(
            user.Email!,
            user.Id,
            token,
            cancellationToken);

        logger.LogInformation(
            "Resent email confirmation link for user {UserId}",
            user.Id);

        return new AuthMessageResponseDto
        {
            Message = genericResponse
        };
    }

    public async Task<AuthResponseDto> LoginAsync(
        LoginDto request,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var email = request.Email.Trim();

        var user = await userManager.FindByEmailAsync(email);

        if (user is null)
        {
            throw new UnauthorizedAccessException(
                "Invalid email or password.");
        }

        if (await userManager.IsLockedOutAsync(user))
        {
            var lockoutEnd =
                await userManager.GetLockoutEndDateAsync(user);

            var remainingMinutes = lockoutEnd.HasValue
                ? Math.Max(
                    1,
                    (int)Math.Ceiling(
                        (lockoutEnd.Value - DateTimeOffset.UtcNow)
                        .TotalMinutes))
                : 15;

            throw new UnauthorizedAccessException(
                $"Too many unsuccessful sign-in attempts. Your account is temporarily locked for {remainingMinutes} minute(s). Please try again later or reset your password.");
        }

        var passwordValid =
            await userManager.CheckPasswordAsync(
                user,
                request.Password);

        if (!passwordValid)
        {
            await userManager.AccessFailedAsync(user);

            if (await userManager.IsLockedOutAsync(user))
            {
                await auditLogService.LogAsync(
                    user.Id,
                    "AccountLockedOut",
                    $"User {user.Email} was locked out due to repeated failed logins.",
                    cancellationToken);

                throw new UnauthorizedAccessException(
                    "Too many unsuccessful sign-in attempts. Your account is temporarily locked for 15 minutes. Please try again later or reset your password.");
            }

            throw new UnauthorizedAccessException(
                "Invalid email or password.");
        }

        if (!user.EmailConfirmed &&
            user.Role != UserRole.Administrator)
        {
            throw new UnauthorizedAccessException(
                "Your university email address has not been verified. Please check your inbox or resend the verification link.");
        }

        await userManager.ResetAccessFailedCountAsync(user);

        await auditLogService.LogAsync(
            user.Id,
            "Login",
            $"Successful login for {user.Email}.",
            cancellationToken);

        return await CreateAuthResponseAsync(
            user,
            cancellationToken);
    }

    public async Task<AuthResponseDto> GoogleLoginAsync(
        GoogleAuthDto request,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var payload =
            await googleAuthService.ValidateIdTokenAsync(
                request.IdToken,
                cancellationToken);

        var email = payload.Email.Trim().ToLowerInvariant();

        if (!domainValidator.IsAllowedDomain(email))
        {
            throw new InvalidOperationException(
                "Please sign in with an authorized university Google account (e.g., @aust.edu).");
        }

        const string provider = "Google";
        var providerKey = payload.Subject;

        var user = await userManager.FindByLoginAsync(
            provider,
            providerKey);

        if (user is null)
        {
            user = await userManager.FindByEmailAsync(email);

            if (user is not null)
            {
                var addLoginResult = await userManager.AddLoginAsync(
                    user,
                    new UserLoginInfo(
                        provider,
                        providerKey,
                        "Google"));

                if (!addLoginResult.Succeeded)
                {
                    logger.LogWarning(
                        "Could not link Google login to existing user {Email}: {Errors}",
                        email,
                        string.Join(
                            "; ",
                            addLoginResult.Errors.Select(
                                e => e.Description)));
                }

                if (!user.EmailConfirmed)
                {
                    user.EmailConfirmed = true;
                    await userManager.UpdateAsync(user);
                }
            }
            else
            {
                const UserRole role = UserRole.Student;

                user = new ApplicationUser
                {
                    Id = Guid.NewGuid().ToString(),
                    UserName = email,
                    Email = email,
                    Role = role,
                    IsRestricted = false,
                    EmailConfirmed = true,
                    LockoutEnabled = true,
                    SecurityStamp = Guid.NewGuid().ToString(),
                    ConcurrencyStamp = Guid.NewGuid().ToString()
                };

                var createResult = await userManager.CreateAsync(user);

                if (!createResult.Succeeded)
                {
                    var errors = string.Join(
                        "; ",
                        createResult.Errors.Select(
                            e => e.Description));

                    throw new InvalidOperationException(
                        $"Could not create account with Google: {errors}");
                }

                await userManager.AddToRoleAsync(
                    user,
                    role.ToString());

                await userRepository.AddToRoleAsync(
                    user.Id,
                    role.ToString(),
                    cancellationToken);

                await userManager.AddLoginAsync(
                    user,
                    new UserLoginInfo(
                        provider,
                        providerKey,
                        "Google"));

                var profile = new UserProfile
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    FullName = Clean(payload.Name),
                    AvatarUrl = Clean(payload.Picture)
                };

                dbContext.UserProfiles.Add(profile);

                await dbContext.SaveChangesAsync(
                    cancellationToken);

                await auditLogService.LogAsync(
                    user.Id,
                    "GoogleRegister",
                    $"User {user.Email} registered via Google OAuth.",
                    cancellationToken);
            }
        }

        if (await userManager.IsLockedOutAsync(user))
        {
            var lockoutEnd =
                await userManager.GetLockoutEndDateAsync(user);

            var remainingMinutes = lockoutEnd.HasValue
                ? Math.Max(
                    1,
                    (int)Math.Ceiling(
                        (lockoutEnd.Value - DateTimeOffset.UtcNow)
                        .TotalMinutes))
                : 15;

            throw new UnauthorizedAccessException(
                $"Too many unsuccessful sign-in attempts. Your account is temporarily locked for {remainingMinutes} minute(s). Please try again later.");
        }

        await userManager.ResetAccessFailedCountAsync(user);

        await auditLogService.LogAsync(
            user.Id,
            "GoogleLogin",
            $"User {user.Email} signed in via Google OAuth.",
            cancellationToken);

        return await CreateAuthResponseAsync(
            user,
            cancellationToken);
    }

    public async Task<AuthMessageResponseDto> ForgotPasswordAsync(
        ForgotPasswordDto request,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        const string genericResponse =
            "If an account exists for that email, password reset instructions have been sent.";

        var email = request.Email.Trim();

        var user = await userManager.FindByEmailAsync(email);

        if (user is null || !user.EmailConfirmed)
        {
            return new AuthMessageResponseDto
            {
                Message = genericResponse
            };
        }

        var token =
            await userManager.GeneratePasswordResetTokenAsync(user);

        await emailService.SendPasswordResetAsync(
            user.Email!,
            user.Id,
            token,
            cancellationToken);

        logger.LogInformation(
            "Generated password reset token for user {UserId}",
            user.Id);

        return new AuthMessageResponseDto
        {
            Message = genericResponse
        };
    }

    public async Task<AuthMessageResponseDto> ResetPasswordAsync(
        ResetPasswordDto request,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        ValidatePassword(request.NewPassword);

        var user =
            await userManager.FindByIdAsync(request.UserId);

        if (user is null)
        {
            throw new InvalidOperationException(
                "Invalid or expired password reset link. Please request a new password reset link.");
        }

        string decodedToken;

        try
        {
            decodedToken = Encoding.UTF8.GetString(
                WebEncoders.Base64UrlDecode(request.Token));
        }
        catch (Exception)
        {
            throw new InvalidOperationException(
                "The password reset link is malformed or invalid.");
        }

        var result = await userManager.ResetPasswordAsync(
            user,
            decodedToken,
            request.NewPassword);

        if (!result.Succeeded)
        {
            var errors = string.Join(
                "; ",
                result.Errors.Select(
                    e => e.Description));

            throw new InvalidOperationException(
                $"Could not reset password: {errors}");
        }

        await userManager.UpdateSecurityStampAsync(user);
        await userManager.ResetAccessFailedCountAsync(user);

        await auditLogService.LogAsync(
            user.Id,
            "ResetPassword",
            $"Password was reset for {user.Email}.",
            cancellationToken);

        return new AuthMessageResponseDto
        {
            Message =
                "Your password has been reset successfully. You can now sign in with your new password."
        };
    }

    public async Task<ProfileDto> GetProfileAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var user = await RequireUserAsync(
            userId,
            cancellationToken);

        var profile =
            await dbContext.UserProfiles
                .SingleOrDefaultAsync(
                    value => value.UserId == userId,
                    cancellationToken);

        return ToProfileDto(user, profile);
    }

    public async Task<ProfileDto> UpdateProfileAsync(
        string userId,
        UpdateProfileDto request,
        CancellationToken cancellationToken = default)
    {
        var user = await RequireUserAsync(
            userId,
            cancellationToken);

        var profile =
            await dbContext.UserProfiles
                .SingleOrDefaultAsync(
                    value => value.UserId == userId,
                    cancellationToken);

        if (profile is null)
        {
            profile = new UserProfile
            {
                Id = Guid.NewGuid(),
                UserId = userId
            };

            dbContext.UserProfiles.Add(profile);
        }

        var phone = Clean(request.Phone);

        ValidatePhone(phone);

        var department = Clean(request.Department);
        var semester = Clean(request.Semester);
        var studentId = Clean(request.StudentId);

        ValidateAcademicFields(
            department,
            semester,
            studentId);

        profile.FullName = Clean(request.FullName);
        profile.University = Clean(request.University);

        profile.Department =
            AllowedDepartments.FirstOrDefault(
                value => string.Equals(
                    value,
                    department,
                    StringComparison.OrdinalIgnoreCase));

        profile.JobTitle = Clean(request.JobTitle);
        profile.Semester = semester;
        profile.StudentId = studentId;
        profile.Phone = phone;
        profile.Bio = Clean(request.Bio);
        profile.AvatarUrl = Clean(request.AvatarUrl);

        await dbContext.SaveChangesAsync(
            cancellationToken);

        return ToProfileDto(user, profile);
    }

    public async Task ChangePasswordAsync(
        string userId,
        ChangePasswordDto request,
        CancellationToken cancellationToken = default)
    {
        var user = await RequireUserAsync(
            userId,
            cancellationToken);

        if (string.IsNullOrWhiteSpace(user.PasswordHash))
        {
            throw new InvalidOperationException(
                "This account does not have a local password set. Sign in with Google or reset your password from the sign-in flow.");
        }

        ValidatePassword(request.NewPassword);

        var result = await userManager.ChangePasswordAsync(
            user,
            request.CurrentPassword,
            request.NewPassword);

        if (!result.Succeeded)
        {
            var firstError =
                result.Errors.FirstOrDefault()?.Description
                ?? "Current password is incorrect.";

            throw new InvalidOperationException(firstError);
        }

        await userManager.UpdateSecurityStampAsync(user);

        await auditLogService.LogAsync(
            userId,
            "ChangePassword",
            $"Password changed by user {user.Email}.",
            cancellationToken);
    }

    private async Task<AuthResponseDto> CreateAuthResponseAsync(
        ApplicationUser user,
        CancellationToken cancellationToken)
    {
        var roles = await userManager.GetRolesAsync(user);

        var token = GenerateToken(
            user,
            roles);

        return new AuthResponseDto
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddHours(2),
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                Role = user.Role.ToString(),
                IsRestricted = user.IsRestricted
            }
        };
    }

    private string GenerateToken(
        ApplicationUser user,
        IEnumerable<string> roles)
    {
        var key = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException(
                "Jwt:Key is missing.");

        var issuer = configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException(
                "Jwt:Issuer is missing.");

        var audience = configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException(
                "Jwt:Audience is missing.");

        var claims = new List<SecurityClaim>
        {
            new(
                JwtRegisteredClaimNames.Sub,
                user.Id),

            new(
                JwtRegisteredClaimNames.Email,
                user.Email ?? string.Empty),

            new(
                System.Security.Claims.ClaimTypes.NameIdentifier,
                user.Id),

            new(
                "security_stamp",
                user.SecurityStamp ?? string.Empty),

            new(
                System.Security.Claims.ClaimTypes.Role,
                user.Role.ToString())
        };

        claims.AddRange(
            roles.Select(
                role => new SecurityClaim(
                    System.Security.Claims.ClaimTypes.Role,
                    role)));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }

    private void ValidatePassword(string password)
    {
        var errors = new List<string>();

        if (password.Length < _passwordOptions.RequiredLength)
        {
            errors.Add(
                $"Passwords must be at least {_passwordOptions.RequiredLength} characters.");
        }

        if (password.Length > 20)
        {
            errors.Add(
                "Passwords must be no more than 20 characters.");
        }

        if (_passwordOptions.RequireDigit &&
            !password.Any(char.IsDigit))
        {
            errors.Add(
                "Passwords must have at least one digit ('0'-'9').");
        }

        if (_passwordOptions.RequireUppercase &&
            !password.Any(char.IsUpper))
        {
            errors.Add(
                "Passwords must have at least one uppercase ('A'-'Z').");
        }

        if (_passwordOptions.RequireLowercase &&
            !password.Any(char.IsLower))
        {
            errors.Add(
                "Passwords must have at least one lowercase ('a'-'z').");
        }

        if (_passwordOptions.RequireNonAlphanumeric &&
            password.All(char.IsLetterOrDigit))
        {
            errors.Add(
                "Passwords must have at least one non alphanumeric character.");
        }

        if (errors.Count > 0)
        {
            throw new InvalidOperationException(
                string.Join("; ", errors));
        }
    }

    private static string MaskEmail(string email)
    {
        var atIndex = email.IndexOf('@');

        if (atIndex <= 1)
        {
            return email;
        }

        var name = email[..atIndex];
        var domain = email[atIndex..];

        var maskedName =
            name.Length <= 2
                ? name[0] + "*"
                : name[0] +
                  new string(
                      '*',
                      Math.Min(5, name.Length - 1));

        return maskedName + domain;
    }

    private async Task<ApplicationUser> RequireUserAsync(
        string userId,
        CancellationToken cancellationToken)
    {
        return await userManager.FindByIdAsync(userId)
            ?? throw new UnauthorizedAccessException(
                "Your account could not be found.");
    }

    private static ProfileDto ToProfileDto(
        ApplicationUser user,
        UserProfile? profile) => new()
        {
            Email = user.Email ?? string.Empty,
            Role = user.Role.ToString(),
            IsRestricted = user.IsRestricted,
            FullName = profile?.FullName,
            University = profile?.University,
            Department = profile?.Department,
            JobTitle = profile?.JobTitle,
            Semester = profile?.Semester,
            StudentId = profile?.StudentId,
            Phone = profile?.Phone,
            Bio = profile?.Bio,
            AvatarUrl = profile?.AvatarUrl,
        };

    private static void ValidatePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
        {
            return;
        }

        if (phone.Any(character => !char.IsDigit(character)) ||
            phone.Length < 7 ||
            phone.Length > 15)
        {
            throw new InvalidOperationException(
                "Phone number must contain only 7 to 15 digits.");
        }
    }

    private static readonly string[] AllowedDepartments =
    [
        "CSE",
        "EEE",
        "Civil",
        "Mechanical",
        "Textile",
        "IPE",
        "Architecture"
    ];

    private static readonly string[] StandardSemesters =
    [
        "1.1",
        "1.2",
        "2.1",
        "2.2",
        "3.1",
        "3.2",
        "4.1",
        "4.2"
    ];

    private static readonly string[] ArchitectureSemesters =
    [
        .. StandardSemesters,
        "5.1",
        "5.2"
    ];

    private static void ValidateAcademicFields(
        string? department,
        string? semester,
        string? studentId)
    {
        if (!string.IsNullOrWhiteSpace(studentId) &&
            (studentId.Any(character => !char.IsDigit(character)) ||
             studentId.Length > 50))
        {
            throw new InvalidOperationException(
                "Student ID must contain digits only.");
        }

        if (string.IsNullOrWhiteSpace(department) &&
            !string.IsNullOrWhiteSpace(semester))
        {
            throw new InvalidOperationException(
                "Choose a department before selecting a semester.");
        }

        var canonicalDepartment =
            AllowedDepartments.FirstOrDefault(
                value => string.Equals(
                    value,
                    department,
                    StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(department) &&
            canonicalDepartment is null)
        {
            throw new InvalidOperationException(
                "Choose a valid department.");
        }

        if (!string.IsNullOrWhiteSpace(semester))
        {
            var allowed =
                string.Equals(
                    canonicalDepartment,
                    "Architecture",
                    StringComparison.OrdinalIgnoreCase)
                    ? ArchitectureSemesters
                    : StandardSemesters;

            if (!allowed.Contains(
                    semester,
                    StringComparer.Ordinal))
            {
                throw new InvalidOperationException(
                    string.Equals(
                        canonicalDepartment,
                        "Architecture",
                        StringComparison.OrdinalIgnoreCase)
                        ? "Choose a semester from 1.1 to 5.2 for Architecture."
                        : "Choose a semester from 1.1 to 4.2.");
            }
        }
    }

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
}


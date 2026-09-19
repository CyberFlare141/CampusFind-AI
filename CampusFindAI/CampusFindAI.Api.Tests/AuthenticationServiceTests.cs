using CampusFindAI.Api.Data;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace CampusFindAI.Api.Tests;

public sealed class AuthenticationServiceTests : IDisposable
{
    private readonly ApplicationDbContext _dbContext;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly UserService _userService;
    private readonly FakeEmailService _emailService;
    private readonly FakeGoogleAuthService _fakeGoogleAuthService;

    public AuthenticationServiceTests()
    {
        var dbOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _dbContext = new ApplicationDbContext(dbOptions);

        _dbContext.Roles.AddRange(
            new IdentityRole { Id = Guid.NewGuid().ToString(), Name = "Student", NormalizedName = "STUDENT", ConcurrencyStamp = Guid.NewGuid().ToString() },
            new IdentityRole { Id = Guid.NewGuid().ToString(), Name = "SecurityOfficer", NormalizedName = "SECURITYOFFICER", ConcurrencyStamp = Guid.NewGuid().ToString() },
            new IdentityRole { Id = Guid.NewGuid().ToString(), Name = "Administrator", NormalizedName = "ADMINISTRATOR", ConcurrencyStamp = Guid.NewGuid().ToString() }
        );
        _dbContext.SaveChanges();

        var identityOptions = Options.Create(new IdentityOptions
        {
            Password = new PasswordOptions
            {
                RequiredLength = 8,
                RequireDigit = true,
                RequireUppercase = true,
                RequireLowercase = true,
                RequireNonAlphanumeric = false,
            },
            Lockout = new LockoutOptions
            {
                AllowedForNewUsers = true,
                MaxFailedAccessAttempts = 5,
                DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15),
            }
        });

        var userStore = new UserStore<ApplicationUser>(_dbContext);
        var passwordHasher = new PasswordHasher<ApplicationUser>();
        var userValidators = new List<IUserValidator<ApplicationUser>> { new UserValidator<ApplicationUser>() };
        var passwordValidators = new List<IPasswordValidator<ApplicationUser>> { new PasswordValidator<ApplicationUser>() };
        var lookupNormalizer = new UpperInvariantLookupNormalizer();
        var identityErrorDescriber = new IdentityErrorDescriber();

        _userManager = new UserManager<ApplicationUser>(
            userStore,
            identityOptions,
            passwordHasher,
            userValidators,
            passwordValidators,
            lookupNormalizer,
            identityErrorDescriber,
            null!,
            NullLogger<UserManager<ApplicationUser>>.Instance);

        // Register default token provider for email confirmation and reset password
        _userManager.RegisterTokenProvider(TokenOptions.DefaultProvider, new EmailTokenProvider<ApplicationUser>());
        _userManager.RegisterTokenProvider(TokenOptions.DefaultEmailProvider, new EmailTokenProvider<ApplicationUser>());

        var domainValidator = new UniversityDomainValidator(Options.Create(new UniversityEmailOptions
        {
            AllowedDomains = ["aust.edu", "student.aust.edu", "example.edu.bd"],
            AllowSubdomains = true
        }));

        _emailService = new FakeEmailService();

        var configValues = new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "SUPER_SECRET_KEY_FOR_TESTING_PURPOSES_ONLY_1234567890",
            ["Jwt:Issuer"] = "CampusFindAI.Api",
            ["Jwt:Audience"] = "CampusFindAI.Client"
        };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(configValues).Build();

        var fakeUserRepository = new FakeUserRepository();
        var fakeAuditLog = new FakeAuditLogService();
        _fakeGoogleAuthService = new FakeGoogleAuthService();

        _userService = new UserService(
            _userManager,
            fakeUserRepository,
            domainValidator,
            _emailService,
            _fakeGoogleAuthService,
            identityOptions,
            configuration,
            fakeAuditLog,
            _dbContext,
            NullLogger<UserService>.Instance);
    }

    public void Dispose()
    {
        _dbContext.Dispose();
        _userManager.Dispose();
    }

    [Fact]
    public async Task Register_WithValidUniversityDomain_CreatesUnconfirmedUser_AndSendsEmail()
    {
        var request = new RegisterDto
        {
            Email = "student@aust.edu",
            Password = "Password123!"
        };

        var result = await _userService.RegisterAsync(request);

        Assert.True(result.RequiresEmailConfirmation);
        Assert.Equal("student@aust.edu", result.Email);
        Assert.Contains("@aust.edu", result.MaskedEmail);

        var createdUser = await _userManager.FindByEmailAsync("student@aust.edu");
        Assert.NotNull(createdUser);
        Assert.False(createdUser.EmailConfirmed);
        Assert.True(createdUser.LockoutEnabled);

        Assert.Single(_emailService.SentConfirmationEmails);
        Assert.Equal("student@aust.edu", _emailService.SentConfirmationEmails[0].Email);
    }

    [Fact]
    public async Task Register_WithDisallowedDomain_ThrowsException()
    {
        var request = new RegisterDto
        {
            Email = "intruder@gmail.com",
            Password = "Password123!"
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _userService.RegisterAsync(request));

        Assert.Contains("authorized university email", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Login_WhenEmailNotConfirmed_ThrowsUnauthorizedException()
    {
        await _userService.RegisterAsync(new RegisterDto
        {
            Email = "unconfirmed@aust.edu",
            Password = "Password123!"
        });

        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _userService.LoginAsync(new LoginDto
            {
                Email = "unconfirmed@aust.edu",
                Password = "Password123!"
            }));

        Assert.Contains("not been verified", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ConfirmEmail_WithValidToken_ConfirmsUser_AndEnablesLogin()
    {
        await _userService.RegisterAsync(new RegisterDto
        {
            Email = "verifytest@aust.edu",
            Password = "Password123!"
        });

        var sentEmail = Assert.Single(_emailService.SentConfirmationEmails);
        var encodedToken = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(
            System.Text.Encoding.UTF8.GetBytes(sentEmail.Token));

        var confirmResult = await _userService.ConfirmEmailAsync(new ConfirmEmailDto
        {
            UserId = sentEmail.UserId,
            Token = encodedToken
        });

        Assert.Contains("confirmed successfully", confirmResult.Message, StringComparison.OrdinalIgnoreCase);

        var user = await _userManager.FindByIdAsync(sentEmail.UserId);
        Assert.NotNull(user);
        Assert.True(user.EmailConfirmed);

        // User should now log in successfully and receive JWT
        var loginResult = await _userService.LoginAsync(new LoginDto
        {
            Email = "verifytest@aust.edu",
            Password = "Password123!"
        });

        Assert.NotNull(loginResult.Token);
        Assert.Equal("verifytest@aust.edu", loginResult.User.Email);
    }

    [Fact]
    public async Task ConfirmEmail_WithInvalidToken_ThrowsException()
    {
        await _userService.RegisterAsync(new RegisterDto
        {
            Email = "badtoken@aust.edu",
            Password = "Password123!"
        });

        var sentEmail = Assert.Single(_emailService.SentConfirmationEmails);
        var invalidEncodedToken = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(
            System.Text.Encoding.UTF8.GetBytes("completely-invalid-token"));

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _userService.ConfirmEmailAsync(new ConfirmEmailDto
            {
                UserId = sentEmail.UserId,
                Token = invalidEncodedToken
            }));

        Assert.Contains("invalid or has expired", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ResendConfirmation_ReturnsGenericResponse_AndDispatchesEmail()
    {
        await _userService.RegisterAsync(new RegisterDto
        {
            Email = "resenduser@aust.edu",
            Password = "Password123!"
        });

        _emailService.SentConfirmationEmails.Clear();

        var res = await _userService.ResendConfirmationAsync(new ResendConfirmationDto
        {
            Email = "resenduser@aust.edu"
        });

        Assert.Contains("verification link has been sent", res.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Single(_emailService.SentConfirmationEmails);

        // Non-existing email returns same message to prevent enumeration
        var nonExistingRes = await _userService.ResendConfirmationAsync(new ResendConfirmationDto
        {
            Email = "nonexisting@aust.edu"
        });

        Assert.Equal(res.Message, nonExistingRes.Message);
    }

    [Fact]
    public async Task Login_FailedAttempts_LocksOutAccountAfter5Tries()
    {
        await _userService.RegisterAsync(new RegisterDto
        {
            Email = "lockout@aust.edu",
            Password = "Password123!"
        });

        var user = await _userManager.FindByEmailAsync("lockout@aust.edu");
        user!.EmailConfirmed = true;
        await _userManager.UpdateAsync(user);

        // 4 failed attempts: unauthorized
        for (var i = 1; i <= 4; i++)
        {
            var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(
                () => _userService.LoginAsync(new LoginDto
                {
                    Email = "lockout@aust.edu",
                    Password = "WrongPassword!"
                }));
            Assert.Contains("Invalid email or password", ex.Message);
        }

        // 5th failed attempt: triggers lockout
        var lockoutEx = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _userService.LoginAsync(new LoginDto
            {
                Email = "lockout@aust.edu",
                Password = "WrongPassword!"
            }));
        Assert.Contains("temporarily locked", lockoutEx.Message, StringComparison.OrdinalIgnoreCase);

        // Correct password during lockout is blocked
        var blockedEx = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _userService.LoginAsync(new LoginDto
            {
                Email = "lockout@aust.edu",
                Password = "Password123!"
            }));
        Assert.Contains("temporarily locked", blockedEx.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ForgotPassword_And_ResetPassword_Flow_Succeeds()
    {
        await _userService.RegisterAsync(new RegisterDto
        {
            Email = "resetme@aust.edu",
            Password = "OldPassword123!"
        });

        var user = await _userManager.FindByEmailAsync("resetme@aust.edu");
        user!.EmailConfirmed = true;
        await _userManager.UpdateAsync(user);

        // Request reset
        var forgotRes = await _userService.ForgotPasswordAsync(new ForgotPasswordDto
        {
            Email = "resetme@aust.edu"
        });
        Assert.Contains("password reset instructions have been sent", forgotRes.Message, StringComparison.OrdinalIgnoreCase);

        var resetEmail = Assert.Single(_emailService.SentResetEmails);
        var encodedToken = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(
            System.Text.Encoding.UTF8.GetBytes(resetEmail.Token));

        // Submit new password
        var resetRes = await _userService.ResetPasswordAsync(new ResetPasswordDto
        {
            UserId = resetEmail.UserId,
            Token = encodedToken,
            NewPassword = "NewPassword123!"
        });
        Assert.Contains("password has been reset successfully", resetRes.Message, StringComparison.OrdinalIgnoreCase);

        // Old password fails
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _userService.LoginAsync(new LoginDto
            {
                Email = "resetme@aust.edu",
                Password = "OldPassword123!"
            }));

        // New password works
        var loginRes = await _userService.LoginAsync(new LoginDto
        {
            Email = "resetme@aust.edu",
            Password = "NewPassword123!"
        });
        Assert.NotNull(loginRes.Token);
    }

    [Fact]
    public async Task GoogleLogin_WithValidUniversityDomain_CreatesNewUserAndReturnsJwt()
    {
        _fakeGoogleAuthService.PayloadToReturn = new Google.Apis.Auth.GoogleJsonWebSignature.Payload
        {
            Subject = "google-sub-123456",
            Email = "google.student@aust.edu",
            EmailVerified = true,
            Name = "Google Student",
            Picture = "https://example.com/avatar.jpg"
        };

        var result = await _userService.GoogleLoginAsync(new GoogleAuthDto { IdToken = "valid-google-token" });

        Assert.NotNull(result);
        Assert.NotEmpty(result.Token);
        Assert.Equal("google.student@aust.edu", result.User.Email);
        Assert.Equal("Student", result.User.Role);

        // Verify user in database
        var createdUser = await _userManager.FindByEmailAsync("google.student@aust.edu");
        Assert.NotNull(createdUser);
        Assert.True(createdUser.EmailConfirmed);

        // Verify profile created
        var profile = await _dbContext.UserProfiles.FirstOrDefaultAsync(p => p.UserId == createdUser.Id);
        Assert.NotNull(profile);
        Assert.Equal("Google Student", profile.FullName);
        Assert.Equal("https://example.com/avatar.jpg", profile.AvatarUrl);

        // Verify external login linked
        var logins = await _userManager.GetLoginsAsync(createdUser);
        Assert.Contains(logins, l => l.LoginProvider == "Google" && l.ProviderKey == "google-sub-123456");
    }

    [Fact]
    public async Task GoogleLogin_WithNonUniversityDomain_ThrowsInvalidOperationException()
    {
        _fakeGoogleAuthService.PayloadToReturn = new Google.Apis.Auth.GoogleJsonWebSignature.Payload
        {
            Subject = "google-sub-999",
            Email = "stranger@gmail.com",
            EmailVerified = true,
            Name = "Gmail User"
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _userService.GoogleLoginAsync(new GoogleAuthDto { IdToken = "unauthorized-domain-token" }));

        Assert.Contains("university Google account", ex.Message);
    }

    [Fact]
    public async Task GoogleLogin_WithExistingEmailUser_LinksGoogleAccountAndReturnsJwt()
    {
        // 1. Create traditional user
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid().ToString(),
            UserName = "existing@aust.edu",
            Email = "existing@aust.edu",
            Role = UserRole.Student,
            EmailConfirmed = false,
            LockoutEnabled = true,
            SecurityStamp = Guid.NewGuid().ToString(),
            ConcurrencyStamp = Guid.NewGuid().ToString()
        };
        await _userManager.CreateAsync(user, "Password123!");
        await _userManager.AddToRoleAsync(user, "Student");

        _fakeGoogleAuthService.PayloadToReturn = new Google.Apis.Auth.GoogleJsonWebSignature.Payload
        {
            Subject = "google-sub-777",
            Email = "existing@aust.edu",
            EmailVerified = true,
            Name = "Existing User"
        };

        var result = await _userService.GoogleLoginAsync(new GoogleAuthDto { IdToken = "valid-token-for-existing" });

        Assert.NotNull(result);
        Assert.NotEmpty(result.Token);
        Assert.Equal("existing@aust.edu", result.User.Email);

        // Email should now be confirmed
        var updatedUser = await _userManager.FindByEmailAsync("existing@aust.edu");
        Assert.NotNull(updatedUser);
        Assert.True(updatedUser.EmailConfirmed);

        // External login linked
        var logins = await _userManager.GetLoginsAsync(updatedUser);
        Assert.Contains(logins, l => l.LoginProvider == "Google" && l.ProviderKey == "google-sub-777");
    }

    [Fact]
    public async Task GoogleLogin_WhenUserIsLockedOut_ThrowsUnauthorizedAccessException()
    {
        _fakeGoogleAuthService.PayloadToReturn = new Google.Apis.Auth.GoogleJsonWebSignature.Payload
        {
            Subject = "google-sub-locked",
            Email = "locked.google@aust.edu",
            EmailVerified = true,
            Name = "Locked User"
        };

        // First login to create account
        await _userService.GoogleLoginAsync(new GoogleAuthDto { IdToken = "token" });

        var user = await _userManager.FindByEmailAsync("locked.google@aust.edu");
        Assert.NotNull(user);
        await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddMinutes(15));

        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _userService.GoogleLoginAsync(new GoogleAuthDto { IdToken = "token" }));

        Assert.Contains("locked", ex.Message.ToLowerInvariant());
    }

    private sealed class FakeGoogleAuthService : IGoogleAuthService
    {
        public Google.Apis.Auth.GoogleJsonWebSignature.Payload? PayloadToReturn { get; set; }

        public Task<Google.Apis.Auth.GoogleJsonWebSignature.Payload> ValidateIdTokenAsync(string idToken, CancellationToken cancellationToken = default)
        {
            if (PayloadToReturn is null)
            {
                throw new InvalidOperationException("Google token is invalid or has expired.");
            }
            return Task.FromResult(PayloadToReturn);
        }
    }

    private sealed class FakeEmailService : IEmailService
    {
        public List<(string Email, string UserId, string Token)> SentConfirmationEmails = [];
        public List<(string Email, string UserId, string Token)> SentResetEmails = [];

        public Task SendEmailConfirmationAsync(string email, string userId, string token, CancellationToken cancellationToken = default)
        {
            SentConfirmationEmails.Add((email, userId, token));
            return Task.CompletedTask;
        }

        public Task SendPasswordResetAsync(string email, string userId, string token, CancellationToken cancellationToken = default)
        {
            SentResetEmails.Add((email, userId, token));
            return Task.CompletedTask;
        }
    }

    private sealed class FakeUserRepository : IUserRepository
    {
        public Task<IReadOnlyList<ApplicationUser>> GetByRoleAsync(UserRole role, CancellationToken cancellationToken = default) => Task.FromResult((IReadOnlyList<ApplicationUser>)[]);
        public Task<ApplicationUser?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) => Task.FromResult<ApplicationUser?>(null);
        public Task<ApplicationUser?> GetByIdAsync(string userId, CancellationToken cancellationToken = default) => Task.FromResult<ApplicationUser?>(null);
        public Task<IReadOnlyList<string>> GetRolesAsync(string userId, CancellationToken cancellationToken = default) => Task.FromResult((IReadOnlyList<string>)["Student"]);
        public Task CreateAsync(ApplicationUser user, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task AddToRoleAsync(string userId, string roleName, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task EnsureRoleExistsAsync(string roleName, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdatePasswordHashAsync(string userId, string passwordHash, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class FakeAuditLogService : IAuditLogService
    {
        public Task LogAsync(string? userId, string action, string? details = null, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task<IReadOnlyList<LoginHistoryEntryDto>> GetLoginHistoryAsync(string userId, int take = 20, CancellationToken cancellationToken = default) => Task.FromResult((IReadOnlyList<LoginHistoryEntryDto>)[]);
        public Task<LoginHistoryEntryDto?> GetLoginDetailAsync(string userId, Guid id, CancellationToken cancellationToken = default) => Task.FromResult<LoginHistoryEntryDto?>(null);
    }
}


using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface IUserService
{
    Task<RegisterResponseDto> RegisterAsync(RegisterDto request, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> LoginAsync(LoginDto request, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> GoogleLoginAsync(GoogleAuthDto request, CancellationToken cancellationToken = default);
    Task<AuthMessageResponseDto> ConfirmEmailAsync(ConfirmEmailDto request, CancellationToken cancellationToken = default);
    Task<AuthMessageResponseDto> ResendConfirmationAsync(ResendConfirmationDto request, CancellationToken cancellationToken = default);
    Task<AuthMessageResponseDto> ForgotPasswordAsync(ForgotPasswordDto request, CancellationToken cancellationToken = default);
    Task<AuthMessageResponseDto> ResetPasswordAsync(ResetPasswordDto request, CancellationToken cancellationToken = default);
    Task<ProfileDto> GetProfileAsync(string userId, CancellationToken cancellationToken = default);
    Task<ProfileDto> UpdateProfileAsync(string userId, UpdateProfileDto request, CancellationToken cancellationToken = default);
    Task ChangePasswordAsync(string userId, ChangePasswordDto request, CancellationToken cancellationToken = default);
}

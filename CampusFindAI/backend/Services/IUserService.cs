using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface IUserService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto request, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> LoginAsync(LoginDto request, CancellationToken cancellationToken = default);
    Task<ProfileDto> GetProfileAsync(string userId, CancellationToken cancellationToken = default);
    Task<ProfileDto> UpdateProfileAsync(string userId, UpdateProfileDto request, CancellationToken cancellationToken = default);
    Task ChangePasswordAsync(string userId, ChangePasswordDto request, CancellationToken cancellationToken = default);
}

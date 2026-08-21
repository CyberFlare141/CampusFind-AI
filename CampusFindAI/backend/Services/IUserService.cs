using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface IUserService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto request, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> LoginAsync(LoginDto request, CancellationToken cancellationToken = default);
}

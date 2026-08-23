using CampusFindAI.Api.Models;

namespace CampusFindAI.Api.Repositories;

public interface IUserRepository
{
    Task<ApplicationUser?> GetByEmailAsync(
        string email,
        CancellationToken cancellationToken = default);

    Task<ApplicationUser?> GetByIdAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<string>> GetRolesAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task CreateAsync(
        ApplicationUser user,
        CancellationToken cancellationToken = default);

    Task AddToRoleAsync(
        string userId,
        string roleName,
        CancellationToken cancellationToken = default);

    Task EnsureRoleExistsAsync(
        string roleName,
        CancellationToken cancellationToken = default);
}

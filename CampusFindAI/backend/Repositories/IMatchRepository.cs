using CampusFindAI.Api.Models;

namespace CampusFindAI.Api.Repositories;

public interface IMatchRepository
{
    Task<Match?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => Task.FromResult<Match?>(null);
    Task<IReadOnlyList<Match>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Match>> GetByFoundItemIdAsync(
        Guid foundItemId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Match>> GetByLostItemUserIdAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task<bool> ExistsAsync(
        Guid lostItemId,
        Guid foundItemId,
        CancellationToken cancellationToken = default);

    Task AddAsync(
        Match match,
        CancellationToken cancellationToken = default);

    Task SaveChangesAsync(
        CancellationToken cancellationToken = default);
}

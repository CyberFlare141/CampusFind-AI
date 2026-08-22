using CampusFindAI.Api.Models;

namespace CampusFindAI.Api.Repositories;

public interface IFoundItemRepository
{
    Task AddAsync(
        FoundItem item,
        CancellationToken cancellationToken = default);

    Task<FoundItem?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FoundItem>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FoundItem>> GetByUserIdAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task SaveChangesAsync(
        CancellationToken cancellationToken = default);
}
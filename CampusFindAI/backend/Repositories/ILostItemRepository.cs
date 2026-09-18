using CampusFindAI.Api.Models;

namespace CampusFindAI.Api.Repositories;

public interface ILostItemRepository
{
    Task AddAsync(
        LostItem item,
        CancellationToken cancellationToken = default);

    Task<LostItem?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<LostItem>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<LostItem>> GetByUserIdAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task UpdateStatusAsync(
        Guid id,
        string status,
        CancellationToken cancellationToken = default);

    Task UpdateAsync(LostItem item, CancellationToken cancellationToken = default)
        => Task.FromException(new NotSupportedException("This repository does not support report updates."));
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
        => Task.FromException(new NotSupportedException("This repository does not support report deletion."));

    Task SaveChangesAsync(
        CancellationToken cancellationToken = default);
}

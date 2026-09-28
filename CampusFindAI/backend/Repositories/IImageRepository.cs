using CampusFindAI.Api.Models;

namespace CampusFindAI.Api.Repositories;

public interface IImageRepository
{
    Task AddRangeAsync(IReadOnlyCollection<Image> images, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Image>> GetByLostItemIdsAsync(IReadOnlyCollection<Guid> itemIds, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Image>> GetByFoundItemIdsAsync(IReadOnlyCollection<Guid> itemIds, CancellationToken cancellationToken = default);
}

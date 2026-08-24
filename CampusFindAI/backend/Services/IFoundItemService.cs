using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface IFoundItemService
{
    Task<FoundItemDto> CreateAsync(
        string userId,
        CreateFoundItemDto request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FoundItemDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FoundItemDto>> GetMyItemsAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task<FoundItemDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}
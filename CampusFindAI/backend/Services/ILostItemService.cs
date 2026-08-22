using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface ILostItemService
{
    Task<LostItemDto> CreateAsync(
        string userId,
        CreateLostItemDto request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<LostItemDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<LostItemDto>> GetMyItemsAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task<LostItemDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}
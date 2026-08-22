using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;

namespace CampusFindAI.Api.Services;

public class FoundItemService(
    IFoundItemRepository repository) : IFoundItemService
{
    public async Task<FoundItemDto> CreateAsync(
        string userId,
        CreateFoundItemDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new ArgumentException("Title is required.");
        }

        var item = new FoundItem
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            FoundAt = request.FoundAt,
            CategoryId = request.CategoryId,
            LocationId = request.LocationId
        };

        await repository.AddAsync(item, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);

        return MapToDto(item);
    }

    public async Task<IReadOnlyList<FoundItemDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var items = await repository.GetAllAsync(cancellationToken);

        return items.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<FoundItemDto>> GetMyItemsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var items = await repository.GetByUserIdAsync(
            userId,
            cancellationToken);

        return items.Select(MapToDto).ToList();
    }

    public async Task<FoundItemDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var item = await repository.GetByIdAsync(
            id,
            cancellationToken);

        return item is null ? null : MapToDto(item);
    }

    private static FoundItemDto MapToDto(FoundItem item)
    {
        return new FoundItemDto
        {
            Id = item.Id,
            UserId = item.UserId,
            Title = item.Title,
            Description = item.Description,
            FoundAt = item.FoundAt,
            CategoryId = item.CategoryId,
            LocationId = item.LocationId
        };
    }
}
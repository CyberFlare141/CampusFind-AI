using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;

namespace CampusFindAI.Api.Services;

public class LostItemService(
    ILostItemRepository repository) : ILostItemService
{
    public async Task<LostItemDto> CreateAsync(
        string userId,
        CreateLostItemDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new ArgumentException("Title is required.");
        }

        var item = new LostItem
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            LostAt = request.LostAt,
            CategoryId = request.CategoryId,
            LocationId = request.LocationId,
            Status = "Open",
            CreatedAt = DateTime.UtcNow
        };

        await repository.AddAsync(item, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);

        return MapToDto(item);
    }

    public async Task<IReadOnlyList<LostItemDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var items = await repository.GetAllAsync(cancellationToken);

        return items.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<LostItemDto>> GetMyItemsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var items = await repository.GetByUserIdAsync(
            userId,
            cancellationToken);

        return items.Select(MapToDto).ToList();
    }

    public async Task<LostItemDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var item = await repository.GetByIdAsync(
            id,
            cancellationToken);

        return item is null ? null : MapToDto(item);
    }

    private static LostItemDto MapToDto(LostItem item)
    {
        return new LostItemDto
        {
            Id = item.Id,
            UserId = item.UserId,
            Title = item.Title,
            Description = item.Description,
            LostAt = item.LostAt,
            CategoryId = item.CategoryId,
            LocationId = item.LocationId,
            Status = item.Status,
            CreatedAt = item.CreatedAt
        };
    }
}
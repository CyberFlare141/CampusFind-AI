using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;

namespace CampusFindAI.Api.Services;

public class FoundItemService(IFoundItemRepository repository, IImageRepository imageRepository, IReportImageStorage imageStorage, IMatchService matchService) : IFoundItemService
{
    public async Task<FoundItemDto> CreateAsync(string userId, CreateFoundItemDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title)) throw new ArgumentException("Title is required.");
        imageStorage.Validate(request.Images);
        var item = new FoundItem { Id = Guid.NewGuid(), UserId = userId, Title = request.Title.Trim(), Description = request.Description?.Trim(), FoundAt = request.FoundAt, CategoryId = request.CategoryId, LocationId = request.LocationId, Status = "Available", CreatedAt = DateTime.UtcNow };
        await repository.AddAsync(item, cancellationToken);
        var images = await imageStorage.SaveAsync(null, item.Id, request.Images, cancellationToken);
        await imageRepository.AddRangeAsync(images, cancellationToken);
        await matchService.RefreshForFoundItemAsync(item.Id, cancellationToken);
        return MapToDto(item, images);
    }
    public async Task<IReadOnlyList<FoundItemDto>> GetAllAsync(CancellationToken cancellationToken = default) => await MapManyAsync(await repository.GetAllAsync(cancellationToken), cancellationToken);
    public async Task<IReadOnlyList<FoundItemDto>> GetMyItemsAsync(string userId, CancellationToken cancellationToken = default) => await MapManyAsync(await repository.GetByUserIdAsync(userId, cancellationToken), cancellationToken);
    public async Task<FoundItemDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await repository.GetByIdAsync(id, cancellationToken); if (item is null) return null;
        return MapToDto(item, await imageRepository.GetByFoundItemIdsAsync([id], cancellationToken));
    }
    private async Task<IReadOnlyList<FoundItemDto>> MapManyAsync(IReadOnlyList<FoundItem> items, CancellationToken cancellationToken)
    {
        var images = await imageRepository.GetByFoundItemIdsAsync(items.Select(x => x.Id).ToArray(), cancellationToken);
        var byItem = images.Where(x => x.FoundItemId.HasValue).GroupBy(x => x.FoundItemId!.Value).ToDictionary(x => x.Key, x => (IReadOnlyList<Image>)x.ToList());
        return items.Select(x => MapToDto(x, byItem.GetValueOrDefault(x.Id, []))).ToList();
    }
    private static FoundItemDto MapToDto(FoundItem item, IReadOnlyList<Image> images) => new() { Id = item.Id, UserId = item.UserId, Title = item.Title, Description = item.Description, FoundAt = item.FoundAt, CategoryId = item.CategoryId, LocationId = item.LocationId, Status = item.Status, CreatedAt = item.CreatedAt, ImageUrls = images.Select(x => x.Url).ToList() };
}

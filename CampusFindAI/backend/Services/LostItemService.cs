using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;

namespace CampusFindAI.Api.Services;

public class LostItemService(ILostItemRepository repository, IImageRepository imageRepository, IReportImageStorage imageStorage, IMatchService matchService) : ILostItemService
{
    public async Task<LostItemDto> CreateAsync(string userId, CreateLostItemDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title)) throw new ArgumentException("Title is required.");
        imageStorage.Validate(request.Images);
        var item = new LostItem { Id = Guid.NewGuid(), UserId = userId, Title = request.Title.Trim(), Description = request.Description?.Trim(), LostAt = request.LostAt, CategoryId = request.CategoryId, LocationId = request.LocationId, Status = "Open", CreatedAt = DateTime.UtcNow };
        await repository.AddAsync(item, cancellationToken);
        var images = await imageStorage.SaveAsync(item.Id, null, request.Images, cancellationToken);
        await imageRepository.AddRangeAsync(images, cancellationToken);
        await matchService.RefreshForLostItemAsync(item.Id, cancellationToken);
        return MapToDto(item, images);
    }
    public async Task<IReadOnlyList<LostItemDto>> GetAllAsync(CancellationToken cancellationToken = default) => await MapManyAsync(await repository.GetAllAsync(cancellationToken), cancellationToken);
    public async Task<IReadOnlyList<LostItemDto>> GetMyItemsAsync(string userId, CancellationToken cancellationToken = default) => await MapManyAsync(await repository.GetByUserIdAsync(userId, cancellationToken), cancellationToken);
    public async Task<LostItemDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await repository.GetByIdAsync(id, cancellationToken); if (item is null) return null;
        return MapToDto(item, await imageRepository.GetByLostItemIdsAsync([id], cancellationToken));
    }
    private async Task<IReadOnlyList<LostItemDto>> MapManyAsync(IReadOnlyList<LostItem> items, CancellationToken cancellationToken)
    {
        var images = await imageRepository.GetByLostItemIdsAsync(items.Select(x => x.Id).ToArray(), cancellationToken);
        var byItem = images.Where(x => x.LostItemId.HasValue).GroupBy(x => x.LostItemId!.Value).ToDictionary(x => x.Key, x => (IReadOnlyList<Image>)x.ToList());
        return items.Select(x => MapToDto(x, byItem.GetValueOrDefault(x.Id, []))).ToList();
    }
    private static LostItemDto MapToDto(LostItem item, IReadOnlyList<Image> images) => new() { Id = item.Id, UserId = item.UserId, Title = item.Title, Description = item.Description, LostAt = item.LostAt, CategoryId = item.CategoryId, LocationId = item.LocationId, Status = item.Status, CreatedAt = item.CreatedAt, ImageUrls = images.Select(x => x.Url).ToList() };
}

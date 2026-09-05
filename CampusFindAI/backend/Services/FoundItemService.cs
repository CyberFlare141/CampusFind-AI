using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;

namespace CampusFindAI.Api.Services;

public class FoundItemService(IFoundItemRepository repository, IImageRepository imageRepository, IReportImageStorage imageStorage, IMatchService matchService, IReferenceDataService referenceDataService) : IFoundItemService
{
    public async Task<FoundItemDto> CreateAsync(string userId, CreateFoundItemDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title)) throw new ArgumentException("Title is required.");
        ValidateReportedTime(request.FoundAt, "found");
        if (request.LocationDetails?.Trim().Length > 200) throw new ArgumentException("Additional location details cannot exceed 200 characters.");
        await referenceDataService.EnsureValidAsync(request.CategoryId, request.BuildingId, request.FloorId, request.LocationId, cancellationToken);
        imageStorage.Validate(request.Images);
        var item = new FoundItem { Id = Guid.NewGuid(), UserId = userId, Title = request.Title.Trim(), Description = request.Description?.Trim(), FoundAt = request.FoundAt, CategoryId = request.CategoryId, LocationId = request.LocationId, LocationDetails = request.LocationDetails?.Trim(), Status = "Available", CreatedAt = DateTime.UtcNow };
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
        return await MapWithReferenceAsync(item, await imageRepository.GetByFoundItemIdsAsync([id], cancellationToken), cancellationToken);
    }
    private async Task<IReadOnlyList<FoundItemDto>> MapManyAsync(IReadOnlyList<FoundItem> items, CancellationToken cancellationToken)
    {
        var images = await imageRepository.GetByFoundItemIdsAsync(items.Select(x => x.Id).ToArray(), cancellationToken);
        var byItem = images.Where(x => x.FoundItemId.HasValue).GroupBy(x => x.FoundItemId!.Value).ToDictionary(x => x.Key, x => (IReadOnlyList<Image>)x.ToList());
        var categories = await referenceDataService.GetCategoriesAsync(cancellationToken);
        var locations = await referenceDataService.GetLocationsAsync(cancellationToken);
        return items.Select(x => MapToDto(x, byItem.GetValueOrDefault(x.Id, []),
            categories.FirstOrDefault(category => category.Id == x.CategoryId)?.Name,
            locations.FirstOrDefault(location => location.Id == x.LocationId))).ToList();
    }
    private async Task<FoundItemDto> MapWithReferenceAsync(FoundItem item, IReadOnlyList<Image> images, CancellationToken cancellationToken)
    {
        var categories = await referenceDataService.GetCategoriesAsync(cancellationToken);
        var locations = await referenceDataService.GetLocationsAsync(cancellationToken);
        return MapToDto(item, images, categories.FirstOrDefault(category => category.Id == item.CategoryId)?.Name,
            locations.FirstOrDefault(location => location.Id == item.LocationId));
    }
    private static FoundItemDto MapToDto(FoundItem item, IReadOnlyList<Image> images, string? categoryName = null, ReferenceLocationDto? location = null) => new() { Id = item.Id, UserId = item.UserId, Title = item.Title, Description = item.Description, FoundAt = item.FoundAt, CategoryId = item.CategoryId, CategoryName = categoryName ?? item.Category?.Name, LocationId = item.LocationId, LocationName = location?.Name ?? item.Location?.Name, BuildingName = location?.BuildingName ?? item.Location?.Building?.Name, FloorName = location?.FloorName, LocationDetails = item.LocationDetails, Status = item.Status, CreatedAt = item.CreatedAt, ImageUrls = images.Select(x => x.Url).ToList() };

    private static void ValidateReportedTime(DateTime? reportedAt, string verb)
    {
        if (!reportedAt.HasValue) return;
        if (reportedAt.Value.ToUniversalTime() > DateTime.UtcNow.AddMinutes(1))
            throw new ArgumentException($"The date {verb} cannot be in the future.");
        if (reportedAt.Value.ToUniversalTime() < DateTime.UtcNow.AddMonths(-6))
            throw new ArgumentException($"Only items {verb} within the last six months can be reported.");
    }
}

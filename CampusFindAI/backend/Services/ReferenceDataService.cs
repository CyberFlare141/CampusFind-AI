using CampusFindAI.Api.Data;
using CampusFindAI.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Services;

public sealed class ReferenceDataService(ApplicationDbContext dbContext) : IReferenceDataService
{
    public async Task<IReadOnlyList<ReferenceCategoryDto>> GetCategoriesAsync(CancellationToken cancellationToken = default) =>
        await dbContext.Categories.AsNoTracking().OrderBy(category => category.Name)
            .Select(category => new ReferenceCategoryDto { Id = category.Id, Name = category.Name })
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ReferenceLocationDto>> GetLocationsAsync(CancellationToken cancellationToken = default) =>
        await dbContext.Locations.AsNoTracking().Include(location => location.Building).Include(location => location.Floor)
            .OrderBy(location => location.Building!.Name).ThenBy(location => location.Name)
            .Select(location => new ReferenceLocationDto
            {
                Id = location.Id, BuildingId = location.BuildingId, Name = location.Name,
                BuildingName = location.Building == null ? null : location.Building.Name,
                FloorId = location.FloorId,
                FloorName = location.Floor == null ? null : location.Floor.Name
            }).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ReferenceLocationDto>> GetLocationsAsync(Guid floorId, CancellationToken cancellationToken = default) =>
        await dbContext.Locations.AsNoTracking().Include(x => x.Building).Include(x => x.Floor)
            .Where(x => x.FloorId == floorId).OrderBy(x => x.Name).Select(x => new ReferenceLocationDto { Id=x.Id, Name=x.Name, BuildingId=x.BuildingId, BuildingName=x.Building!.Name, FloorId=x.FloorId, FloorName=x.Floor!.Name }).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ReferenceFloorDto>> GetFloorsAsync(Guid buildingId, CancellationToken cancellationToken = default) =>
        await dbContext.Floors.AsNoTracking().Where(x => x.BuildingId == buildingId && x.IsActive).OrderBy(x => x.FloorNumber).Select(x => new ReferenceFloorDto { Id=x.Id, BuildingId=x.BuildingId, FloorNumber=x.FloorNumber, Name=x.Name }).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ReferenceBuildingDto>> GetBuildingsAsync(CancellationToken cancellationToken = default) =>
        await dbContext.Buildings.AsNoTracking().OrderBy(building => building.Name)
            .Select(building => new ReferenceBuildingDto { Id = building.Id, Name = building.Name })
            .ToListAsync(cancellationToken);

    public async Task EnsureValidAsync(Guid? categoryId, Guid? buildingId, Guid? floorId, Guid? locationId, CancellationToken cancellationToken = default)
    {
        if (categoryId.HasValue && !await dbContext.Categories.AnyAsync(category => category.Id == categoryId, cancellationToken))
            throw new ArgumentException("Select a valid item category.");
        if (!buildingId.HasValue && !floorId.HasValue && !locationId.HasValue) return;
        if (!buildingId.HasValue || !floorId.HasValue || !locationId.HasValue)
            throw new ArgumentException("Select a block, floor, and specific campus location.");

        var floor = await dbContext.Floors.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == floorId.Value && item.IsActive, cancellationToken);
        if (floor is null || floor.BuildingId != buildingId.Value)
            throw new ArgumentException("The selected floor does not belong to the selected block.");

        var location = await dbContext.Locations.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == locationId.Value, cancellationToken);
        if (location is null || location.FloorId != floorId.Value)
            throw new ArgumentException("The selected location does not belong to the selected floor.");
    }
}

using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface IReferenceDataService
{
    Task<IReadOnlyList<ReferenceCategoryDto>> GetCategoriesAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ReferenceLocationDto>> GetLocationsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ReferenceBuildingDto>> GetBuildingsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ReferenceFloorDto>> GetFloorsAsync(Guid buildingId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ReferenceLocationDto>> GetLocationsAsync(Guid floorId, CancellationToken cancellationToken = default);
    Task EnsureValidAsync(Guid? categoryId, Guid? buildingId, Guid? floorId, Guid? locationId, CancellationToken cancellationToken = default);
}

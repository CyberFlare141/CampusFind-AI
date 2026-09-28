using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/reference")]
public sealed class ReferenceController(IReferenceDataService referenceDataService) : ControllerBase
{
    [HttpGet("categories")]
    public Task<IReadOnlyList<ReferenceCategoryDto>> GetCategories(CancellationToken cancellationToken) =>
        referenceDataService.GetCategoriesAsync(cancellationToken);

    [HttpGet("locations")]
    public Task<IReadOnlyList<ReferenceLocationDto>> GetLocations(Guid? floorId, CancellationToken cancellationToken) =>
        floorId.HasValue ? referenceDataService.GetLocationsAsync(floorId.Value, cancellationToken) : referenceDataService.GetLocationsAsync(cancellationToken);

    [HttpGet("floors")]
    public Task<IReadOnlyList<ReferenceFloorDto>> GetFloors(Guid buildingId, CancellationToken cancellationToken) =>
        referenceDataService.GetFloorsAsync(buildingId, cancellationToken);

    [HttpGet("buildings")]
    public Task<IReadOnlyList<ReferenceBuildingDto>> GetBuildings(CancellationToken cancellationToken) =>
        referenceDataService.GetBuildingsAsync(cancellationToken);
}

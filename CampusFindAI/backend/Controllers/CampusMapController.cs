using CampusFindAI.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Controllers;

[ApiController, Authorize, Route("api/campus-map")]
public class CampusMapController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet("items")]
    public async Task<IActionResult> Items([FromQuery] string? type, [FromQuery] Guid? categoryId, [FromQuery] Guid? locationId, [FromQuery] string? status, CancellationToken ct)
    {
        var lost = db.LostItems.AsNoTracking().Where(x => x.LocationId != null).Select(x => new { id=x.Id, title=x.Title, category=x.Category!.Name, locationName=x.Location!.Name, buildingName=x.Location.Floor!.Building!.Name, status=x.Status, createdAt=x.CreatedAt, type="lost", categoryId=x.CategoryId, locationId=x.LocationId });
        var found = db.FoundItems.AsNoTracking().Where(x => x.LocationId != null).Select(x => new { id=x.Id, title=x.Title, category=x.Category!.Name, locationName=x.Location!.Name, buildingName=x.Location.Floor!.Building!.Name, status=x.Status, createdAt=x.CreatedAt, type="found", categoryId=x.CategoryId, locationId=x.LocationId });
        var items = await lost.Concat(found).Where(x => (type == null || x.type == type.ToLower()) && (categoryId == null || x.categoryId == categoryId) && (locationId == null || x.locationId == locationId) && (status == null || x.status == status)).OrderByDescending(x => x.createdAt).Take(500).ToListAsync(ct);
        return Ok(items.Select(x => new { x.id, x.title, x.category, x.locationName, x.buildingName, x.status, x.createdAt, x.type }));
    }

    [HttpGet("hotspots")]
    public async Task<IActionResult> Hotspots(CancellationToken ct)
    {
        var lost = await db.LostItems.Where(x => x.LocationId != null).GroupBy(x => x.Location!.Floor!.Building!.Name).Select(g => new { name=g.Key, count=g.Count() }).ToListAsync(ct);
        var found = await db.FoundItems.Where(x => x.LocationId != null).GroupBy(x => x.Location!.Floor!.Building!.Name).Select(g => new { name=g.Key, count=g.Count() }).ToListAsync(ct);
        return Ok(lost.Concat(found).GroupBy(x => x.name).Select(g => new { buildingName=g.Key, count=g.Sum(x => x.count) }).OrderByDescending(x => x.count));
    }
}

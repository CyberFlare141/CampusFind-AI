using CampusFindAI.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Controllers;

[ApiController, Authorize(Roles = "Administrator"), Route("api/admin/analytics")]
public class AdminAnalyticsController(ApplicationDbContext db) : ControllerBase
{
    private static DateTime? ParseStart(string? value) => DateTime.TryParse(value, out var date) ? DateTime.SpecifyKind(date, DateTimeKind.Utc) : null;
    private static DateTime? ParseEndExclusive(string? value)
    {
        if (!DateTime.TryParse(value, out var date)) return null;
        var utc = DateTime.SpecifyKind(date, DateTimeKind.Utc);
        // Date-only query values represent a whole calendar day. ISO timestamps are already precise.
        return value?.Contains('T') == true ? utc : utc.AddDays(1);
    }

    [HttpGet("overview")]
    public async Task<IActionResult> Overview([FromQuery] string? from, [FromQuery] string? to, CancellationToken ct)
    {
        var start = ParseStart(from); var end = ParseEndExclusive(to);
        var lost = db.LostItems.AsNoTracking().Where(x => (!start.HasValue || x.CreatedAt >= start) && (!end.HasValue || x.CreatedAt < end));
        var found = db.FoundItems.AsNoTracking().Where(x => (!start.HasValue || x.CreatedAt >= start) && (!end.HasValue || x.CreatedAt < end));
        var claims = db.Claims.AsNoTracking().Where(x => (!start.HasValue || x.CreatedAt >= start) && (!end.HasValue || x.CreatedAt < end));
        return Ok(new { lost = await lost.CountAsync(ct), found = await found.CountAsync(ct), claims = await claims.CountAsync(ct), returned = await claims.CountAsync(x => x.Status == "Returned", ct), users = await db.Users.CountAsync(ct) });
    }

    [HttpGet("items")]
    public async Task<IActionResult> Items([FromQuery] string? from, [FromQuery] string? to, CancellationToken ct)
    {
        var start = ParseStart(from); var end = ParseEndExclusive(to);
        var lost = db.LostItems.AsNoTracking().Where(x => (!start.HasValue || x.CreatedAt >= start) && (!end.HasValue || x.CreatedAt < end));
        var found = db.FoundItems.AsNoTracking().Where(x => (!start.HasValue || x.CreatedAt >= start) && (!end.HasValue || x.CreatedAt < end));
        var lostMonthly = await lost.GroupBy(x => new { x.CreatedAt.Year, x.CreatedAt.Month }).Select(g => new { g.Key.Year, g.Key.Month, count = g.Count() }).ToListAsync(ct);
        var foundMonthly = await found.GroupBy(x => new { x.CreatedAt.Year, x.CreatedAt.Month }).Select(g => new { g.Key.Year, g.Key.Month, count = g.Count() }).ToListAsync(ct);
        var monthly = lostMonthly.Select(x => (x.Year, x.Month, lost: x.count, found: 0)).Concat(foundMonthly.Select(x => (x.Year, x.Month, lost: 0, found: x.count))).GroupBy(x => (x.Year, x.Month)).Select(g => new { year = g.Key.Year, month = g.Key.Month, lost = g.Sum(x => x.lost), found = g.Sum(x => x.found) }).OrderBy(x => x.year).ThenBy(x => x.month).ToList();
        var categoriesLost = await lost.Where(x => x.Category != null).GroupBy(x => x.Category!.Name).Select(g => new { name = g.Key, count = g.Count() }).ToListAsync(ct);
        var categoriesFound = await found.Where(x => x.Category != null).GroupBy(x => x.Category!.Name).Select(g => new { name = g.Key, count = g.Count() }).ToListAsync(ct);
        return Ok(new { monthly, categories = categoriesLost.Concat(categoriesFound).GroupBy(x => x.name).Select(g => new { name = g.Key, count = g.Sum(x => x.count) }).OrderByDescending(x => x.count) });
    }

    [HttpGet("claims")]
    public async Task<IActionResult> Claims([FromQuery] string? from, [FromQuery] string? to, CancellationToken ct)
    {
        var start = ParseStart(from); var end = ParseEndExclusive(to);
        var query = db.Claims.AsNoTracking().Where(x => (!start.HasValue || x.CreatedAt >= start) && (!end.HasValue || x.CreatedAt < end));
        var status = await query.GroupBy(x => x.Status).Select(g => new { status = g.Key, count = g.Count() }).ToListAsync(ct);
        var resolution = await query.Where(x => x.ReviewedAt != null).Select(x => EF.Functions.DateDiffMinute(x.CreatedAt, x.ReviewedAt!.Value)).ToListAsync(ct);
        var resolved = status.Where(x => x.status is "Approved" or "Returned" or "Rejected").Sum(x => x.count);
        return Ok(new { status, reviewedClaims = resolution.Count, averageResolutionHours = resolution.Count == 0 ? 0 : Math.Round(resolution.Average() / 60d, 1), recoveryRate = resolved == 0 ? 0 : Math.Round(status.Where(x => x.status == "Returned").Sum(x => x.count) * 100d / resolved, 1) });
    }

    [HttpGet("users")]
    public async Task<IActionResult> Users([FromQuery] string? from, [FromQuery] string? to, CancellationToken ct)
    {
        var start = ParseStart(from); var end = ParseEndExclusive(to);
        var active = await db.AuditLogs.AsNoTracking().Where(x => x.Action == "Login" && x.UserId != null && (!start.HasValue || x.CreatedAt >= start) && (!end.HasValue || x.CreatedAt < end)).Select(x => x.UserId).Distinct().CountAsync(ct);
        return Ok(new { total = await db.Users.CountAsync(ct), active });
    }

    [HttpGet("locations")]
    public async Task<IActionResult> Locations([FromQuery] string? from, [FromQuery] string? to, CancellationToken ct)
    {
        var start = ParseStart(from); var end = ParseEndExclusive(to);
        var lost = db.LostItems.AsNoTracking().Where(x => x.LocationId != null && (!start.HasValue || x.CreatedAt >= start) && (!end.HasValue || x.CreatedAt < end));
        var found = db.FoundItems.AsNoTracking().Where(x => x.LocationId != null && (!start.HasValue || x.CreatedAt >= start) && (!end.HasValue || x.CreatedAt < end));
        var lostLocations = await lost.GroupBy(x => x.Location!.Name).Select(g => new { name = g.Key, count = g.Count() }).ToListAsync(ct);
        var foundLocations = await found.GroupBy(x => x.Location!.Name).Select(g => new { name = g.Key, count = g.Count() }).ToListAsync(ct);
        return Ok(lostLocations.Concat(foundLocations).GroupBy(x => x.name).Select(g => new { name = g.Key, count = g.Sum(x => x.count) }).OrderByDescending(x => x.count).Take(10));
    }
}

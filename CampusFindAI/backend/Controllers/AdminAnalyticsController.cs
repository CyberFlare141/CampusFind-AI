using CampusFindAI.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Controllers;

[ApiController, Authorize(Roles = "Administrator"), Route("api/admin/analytics")]
public class AdminAnalyticsController(ApplicationDbContext db) : ControllerBase
{
    private static DateTime? Parse(string? value) => DateTime.TryParse(value, out var date) ? DateTime.SpecifyKind(date, DateTimeKind.Utc) : null;
    [HttpGet("overview")]
    public async Task<IActionResult> Overview([FromQuery] string? from, [FromQuery] string? to, CancellationToken ct)
    {
        var start=Parse(from); var end=Parse(to);
        var lost=db.LostItems.AsNoTracking().Where(x => (!start.HasValue || x.CreatedAt >= start) && (!end.HasValue || x.CreatedAt < end.Value.AddDays(1)));
        var found=db.FoundItems.AsNoTracking().Where(x => (!start.HasValue || x.CreatedAt >= start) && (!end.HasValue || x.CreatedAt < end.Value.AddDays(1)));
        var claims=db.Claims.AsNoTracking().Where(x => (!start.HasValue || x.CreatedAt >= start) && (!end.HasValue || x.CreatedAt < end.Value.AddDays(1)));
        return Ok(new { lost=await lost.CountAsync(ct), found=await found.CountAsync(ct), claims=await claims.CountAsync(ct), returned=await claims.CountAsync(x=>x.Status=="Returned",ct), users=await db.Users.CountAsync(ct) });
    }
    [HttpGet("items")]
    public async Task<IActionResult> Items([FromQuery] string? from,[FromQuery] string? to,CancellationToken ct)
    {
        var start=Parse(from);var end=Parse(to);
        var rows=await db.LostItems.AsNoTracking().Where(x=>(!start.HasValue||x.CreatedAt>=start)&&(!end.HasValue||x.CreatedAt<end.Value.AddDays(1))).GroupBy(x=>new{x.CreatedAt.Year,x.CreatedAt.Month}).Select(g=>new{g.Key.Year,g.Key.Month,count=g.Count()}).ToListAsync(ct);
        var found=await db.FoundItems.AsNoTracking().Where(x=>(!start.HasValue||x.CreatedAt>=start)&&(!end.HasValue||x.CreatedAt<end.Value.AddDays(1))).GroupBy(x=>new{x.CreatedAt.Year,x.CreatedAt.Month}).Select(g=>new{g.Key.Year,g.Key.Month,count=g.Count()}).ToListAsync(ct);
        var monthly = rows.Select(x => (x.Year, x.Month, lost: x.count, found: 0))
            .Concat(found.Select(x => (x.Year, x.Month, lost: 0, found: x.count)))
            .GroupBy(x => (x.Year, x.Month)).Select(g => new { year = g.Key.Year, month = g.Key.Month, lost = g.Sum(x => x.lost), found = g.Sum(x => x.found) })
            .OrderBy(x => x.year).ThenBy(x => x.month).ToList();
        var categoriesLost = await db.LostItems.Where(x => (!start.HasValue || x.CreatedAt >= start) && (!end.HasValue || x.CreatedAt < end.Value.AddDays(1))).GroupBy(x => x.Category!.Name).Select(g => new { name = g.Key, count = g.Count() }).ToListAsync(ct);
        var categoriesFound = await db.FoundItems.Where(x => (!start.HasValue || x.CreatedAt >= start) && (!end.HasValue || x.CreatedAt < end.Value.AddDays(1))).GroupBy(x => x.Category!.Name).Select(g => new { name = g.Key, count = g.Count() }).ToListAsync(ct);
        return Ok(new { monthly, categories = categoriesLost.Concat(categoriesFound).GroupBy(x => x.name).Select(g => new { name = g.Key, count = g.Sum(x => x.count) }).OrderByDescending(x => x.count) });
    }
    [HttpGet("claims")]
    public async Task<IActionResult> Claims([FromQuery] string? from, [FromQuery] string? to, CancellationToken ct)
    {
        var start = Parse(from); var end = Parse(to);
        var query = db.Claims.AsNoTracking().Where(x => (!start.HasValue || x.CreatedAt >= start) && (!end.HasValue || x.CreatedAt < end.Value.AddDays(1)));
        var status = await query.GroupBy(x => x.Status).Select(g => new { status = g.Key, count = g.Count() }).ToListAsync(ct);
        var resolution = await query.Where(x => x.ReviewedAt != null).Select(x => EF.Functions.DateDiffMinute(x.CreatedAt, x.ReviewedAt!.Value)).ToListAsync(ct);
        var resolved = status.Where(x => x.status is "Approved" or "Returned" or "Rejected").Sum(x => x.count);
        return Ok(new { status, averageResolutionHours = resolution.Count == 0 ? 0 : Math.Round(resolution.Average() / 60d, 1), recoveryRate = resolved == 0 ? 0 : Math.Round(status.Where(x => x.status == "Returned").Sum(x => x.count) * 100d / resolved, 1) });
    }
    [HttpGet("users")]
    public async Task<IActionResult> Users(CancellationToken ct)
    {
        var active = await db.AuditLogs.Where(x => x.Action == "Login" && x.UserId != null).Select(x => x.UserId).Distinct().CountAsync(ct);
        return Ok(new { total = await db.Users.CountAsync(ct), active });
    }
    [HttpGet("locations")]
    public async Task<IActionResult> Locations(CancellationToken ct)
    {
        var rows=await db.LostItems.Where(x=>x.LocationId!=null).GroupBy(x=>x.Location!.Name).Select(g=>new{name=g.Key,count=g.Count()}).ToListAsync(ct);
        var found=await db.FoundItems.Where(x=>x.LocationId!=null).GroupBy(x=>x.Location!.Name).Select(g=>new{name=g.Key,count=g.Count()}).ToListAsync(ct);
        return Ok(rows.Concat(found).GroupBy(x=>x.name).Select(g=>new{name=g.Key,count=g.Sum(x=>x.count)}).OrderByDescending(x=>x.count).Take(10));
    }
}

using System.Security.Claims;
using CampusFindAI.Api.Data;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Controllers;

[ApiController, Route("api/reputation")]
public class ReputationController(ApplicationDbContext db, IReputationService reputationService) : ControllerBase
{
    [Authorize, HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (id is null) return Unauthorized();
        var score = await reputationService.GetOrCreateAsync(id, ct);
        var history = await db.ReputationHistories.Where(x => x.UserId == id).OrderByDescending(x => x.CreatedAt).Take(100).Select(x => new { x.Id, x.PointChange, x.Reason, x.CreatedAt }).ToListAsync(ct);
        return Ok(new { points = score.Points, level = score.Level, updatedAt = score.UpdatedAt, history });
    }

    [AllowAnonymous, HttpGet("leaderboard")]
    public async Task<IActionResult> Leaderboard(CancellationToken ct)
    {
        var rows = await db.Reputations.AsNoTracking().Where(x => x.Points > 0).OrderByDescending(x => x.Points).Take(10)
            .Select(x => new { fullName = x.User!.UserProfile!.FullName, email = x.User.Email, x.Points, x.Level }).ToListAsync(ct);
        return Ok(rows.Select(x => new { displayName = x.fullName ?? (x.email ?? "Campus user").Split('@')[0], x.Points, x.Level }));
    }
}

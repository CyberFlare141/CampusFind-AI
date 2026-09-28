using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class MatchesController(IMatchService service) : ControllerBase
{
    [HttpGet("my")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<MatchDto>>> GetMy(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrEmpty(userId) ? Unauthorized() : Ok(await service.GetMyMatchesAsync(userId, cancellationToken));
    }

    /// <summary>Security officer "Suggested Matches" queue.</summary>
    [HttpGet("suggested")]
    [Authorize(Roles = "SecurityOfficer,Administrator")]
    public async Task<ActionResult<IReadOnlyList<MatchDto>>> GetSuggested(
        CancellationToken cancellationToken)
    {
        var matches = await service.GetSuggestedMatchesAsync(cancellationToken);

        return Ok(matches);
    }
}

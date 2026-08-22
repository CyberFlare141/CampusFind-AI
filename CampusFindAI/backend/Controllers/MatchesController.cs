using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Authorize(Roles = "SecurityOfficer,Administrator")]
[Route("api/[controller]")]
public class MatchesController(IMatchService service) : ControllerBase
{
    /// <summary>Security officer "Suggested Matches" queue.</summary>
    [HttpGet("suggested")]
    public async Task<ActionResult<IReadOnlyList<MatchDto>>> GetSuggested(
        CancellationToken cancellationToken)
    {
        var matches = await service.GetSuggestedMatchesAsync(cancellationToken);

        return Ok(matches);
    }
}

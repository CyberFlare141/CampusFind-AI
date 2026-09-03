using System.Security.Claims;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

/// <summary>
/// Semantic AI Search endpoint.
/// Distinct from the Smart Matching system (MatchesController).
/// </summary>
[ApiController]
[Authorize]
[Route("api/[controller]")]
public class SearchController(
    ISemanticSearchService searchService,
    ILogger<SearchController> logger) : ControllerBase
{
    /// <summary>
    /// POST /api/search/semantic
    /// Accepts a natural-language query and returns semantically ranked Lost &amp; Found results.
    /// </summary>
    [HttpPost("semantic")]
    public async Task<ActionResult<SemanticSearchResponseDto>> SemanticSearch(
        [FromBody] SemanticSearchRequestDto request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
            return BadRequest(new { message = "Query must not be empty." });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        logger.LogInformation(
            "[SearchController] Semantic search by user={UserId} query=\"{Query}\"",
            userId, request.Query.Length > 80 ? request.Query[..80] + "…" : request.Query);

        var result = await searchService.SearchAsync(request.Query, cancellationToken);
        return Ok(result);
    }
}

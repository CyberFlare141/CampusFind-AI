using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/visual-search")]
public sealed class VisualSearchController(IVisualSearchService service, ILogger<VisualSearchController> logger) : ControllerBase
{
    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<ActionResult<VisualSearchResponseDto>> Search([FromForm] IFormFile? image, CancellationToken cancellationToken)
    {
        if (image is null) return BadRequest(new { message = "Choose an image to search." });
        try { return Ok(await service.SearchAsync(image, cancellationToken)); }
        catch (ArgumentException ex) { logger.LogInformation("Visual search image validation failed: {Reason}", ex.Message); return BadRequest(new { message = ex.Message }); }
        catch (VisualSearchUnavailableException ex) { return StatusCode(503, new { message = ex.Message }); }
    }
}

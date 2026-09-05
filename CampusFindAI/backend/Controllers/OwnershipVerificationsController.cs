using System.Security.Claims;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/ownership-verifications")]
public sealed class OwnershipVerificationsController(IOwnershipVerificationService service) : ControllerBase
{
    [HttpGet("matches/{matchId:guid}/status")]
    public Task<ActionResult<OwnershipVerificationStatusDto>> Status(Guid matchId, CancellationToken cancellationToken) => Execute<OwnershipVerificationStatusDto>(async user => Ok(await service.GetStatusAsync(matchId, user, cancellationToken)));

    [HttpPost("matches/{matchId:guid}/start")]
    public Task<ActionResult<ClaimVerificationResponseDto>> Start(Guid matchId, CancellationToken cancellationToken) => Execute<ClaimVerificationResponseDto>(async user => Ok(await service.StartForMatchAsync(matchId, user, cancellationToken)));

    [HttpPost("matches/{matchId:guid}/submit")]
    public Task<ActionResult<SubmitVerificationResponseDto>> Submit(Guid matchId, SubmitVerificationRequestDto request, CancellationToken cancellationToken) => Execute<SubmitVerificationResponseDto>(async user => Ok(await service.SubmitForMatchAsync(matchId, user, request, cancellationToken)));

    private async Task<ActionResult<T>> Execute<T>(Func<string, Task<ActionResult<T>>> action)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        try { return await action(userId); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}

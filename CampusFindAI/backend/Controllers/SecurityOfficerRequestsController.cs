using System.Security.Claims;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/security-officer-requests")]
public sealed class SecurityOfficerRequestsController(ISecurityOfficerRequestService service) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<SecurityOfficerRequestDto>> Submit(CreateSecurityOfficerRequestDto request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        try { return Ok(await service.SubmitAsync(userId, request, cancellationToken)); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpGet("mine")]
    public async Task<ActionResult<SecurityOfficerRequestDto>> Mine(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var request = await service.GetLatestForUserAsync(userId, cancellationToken);
        return request is null ? NoContent() : Ok(request);
    }

    [HttpGet]
    [Authorize(Roles = "Administrator")]
    public async Task<ActionResult<IReadOnlyList<SecurityOfficerRequestDto>>> All(CancellationToken cancellationToken) => Ok(await service.GetAllAsync(cancellationToken));

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Administrator")]
    public async Task<ActionResult<SecurityOfficerRequestDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var request = await service.GetByIdAsync(id, cancellationToken);
        return request is null ? NotFound() : Ok(request);
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = "Administrator")]
    public async Task<ActionResult<SecurityOfficerRequestDto>> Approve(Guid id, SecurityOfficerRequestDecisionDto request, CancellationToken cancellationToken) => await Decide(id, request, true, cancellationToken);

    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = "Administrator")]
    public async Task<ActionResult<SecurityOfficerRequestDto>> Reject(Guid id, SecurityOfficerRequestDecisionDto request, CancellationToken cancellationToken) => await Decide(id, request, false, cancellationToken);

    private async Task<ActionResult<SecurityOfficerRequestDto>> Decide(Guid id, SecurityOfficerRequestDecisionDto request, bool approve, CancellationToken cancellationToken)
    {
        var administratorId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(administratorId)) return Unauthorized();
        try
        {
            var result = approve
                ? await service.ApproveAsync(id, administratorId, request.AdminNotes, cancellationToken)
                : await service.RejectAsync(id, administratorId, request.AdminNotes, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }
}

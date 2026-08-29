using System.Security.Claims;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ClaimsController(IClaimService service) : ControllerBase
{
    /// <summary>A student files a claim of ownership against a found item.</summary>
    [HttpPost]
    public async Task<ActionResult<ClaimDto>> Create(
        CreateClaimDto request,
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var claim = await service.CreateAsync(userId, request, cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = claim.Id }, claim);
    }

    /// <summary>The current user's own submitted claims.</summary>
    [HttpGet("my")]
    public async Task<ActionResult<IReadOnlyList<ClaimDto>>> GetMyClaims(
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var claims = await service.GetMyClaimsAsync(userId, cancellationToken);

        return Ok(claims);
    }

    /// <summary>Security officer "Pending Claims" queue.</summary>
    [HttpGet("pending")]
    [Authorize(Roles = "SecurityOfficer,Administrator")]
    public async Task<ActionResult<IReadOnlyList<ClaimDto>>> GetPending(
        CancellationToken cancellationToken)
    {
        var claims = await service.GetPendingAsync(cancellationToken);

        return Ok(claims);
    }

    /// <summary>Full claim history (any status), for officers/administrators.</summary>
    [HttpGet]
    [Authorize(Roles = "SecurityOfficer,Administrator")]
    public async Task<ActionResult<IReadOnlyList<ClaimDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var claims = await service.GetAllAsync(cancellationToken);

        return Ok(claims);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ClaimDto>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var claim = await service.GetByIdAsync(id, cancellationToken);

        if (claim is null)
        {
            return NotFound();
        }

        return Ok(claim);
    }

    [HttpGet("{id:guid}/review")]
    [Authorize(Roles = "SecurityOfficer,Administrator")]
    public async Task<ActionResult<ClaimReviewDto>> GetReview(Guid id, CancellationToken cancellationToken)
    {
        var claim = await service.GetReviewAsync(id, cancellationToken);
        return claim is null ? NotFound() : Ok(claim);
    }

    /// <summary>Security officer's claim-verification decision (approve/reject).</summary>
    [HttpPost("{id:guid}/decision")]
    [Authorize(Roles = "SecurityOfficer,Administrator")]
    public async Task<ActionResult<ClaimDto>> Decide(
        Guid id,
        ClaimDecisionDto request,
        CancellationToken cancellationToken)
    {
        var officerId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(officerId))
        {
            return Unauthorized();
        }

        var claim = await service.DecideAsync(id, officerId, request, cancellationToken);

        return Ok(claim);
    }
}

using System.Security.Claims;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/support-payments")]
public sealed class SupportPaymentsController(ISupportPaymentService service) : ControllerBase
{
    [HttpGet("availability")]
    public Task<SupportPaymentAvailabilityDto> Availability(CancellationToken cancellationToken) => service.GetAvailabilityAsync(cancellationToken);

    [HttpPost]
    [EnableRateLimiting("SupportPaymentCreate")]
    public async Task<ActionResult<CreateSupportPaymentResponse>> Create(CreateSupportPaymentRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
        try { return Ok(await service.CreateAsync(userId, request, cancellationToken)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpGet("my")]
    [EnableRateLimiting("SupportPaymentRead")]
    public async Task<ActionResult<IReadOnlyList<SupportPaymentDto>>> Mine(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrWhiteSpace(userId) ? Unauthorized() : Ok(await service.GetMineAsync(userId, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [EnableRateLimiting("SupportPaymentRead")]
    public async Task<ActionResult<SupportPaymentDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
        var payment = await service.GetAsync(userId, id, cancellationToken);
        return payment is null ? NotFound() : Ok(payment); // Ownership is part of the query, preventing IDOR.
    }

    [HttpPost("{id:guid}/manual-reference")]
    [EnableRateLimiting("SupportPaymentCreate")]
    public async Task<ActionResult<SupportPaymentDto>> SubmitManualReference(Guid id, SubmitManualSupportPaymentRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
        try { return Ok(await service.SubmitManualReferenceAsync(userId, id, request, cancellationToken)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    /// <summary>Local-only test checkout result. It has no production route behavior and never contacts a wallet.</summary>
    [HttpPost("{id:guid}/simulate/{outcome}")]
    [EnableRateLimiting("SupportPaymentSimulation")]
    public async Task<ActionResult<SupportPaymentDto>> Simulate(Guid id, string outcome, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
        try { return Ok(await service.SimulateAsync(userId, id, outcome, cancellationToken)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }
}

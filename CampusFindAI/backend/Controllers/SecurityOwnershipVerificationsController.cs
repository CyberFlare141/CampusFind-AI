using System.Security.Claims;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

[ApiController, Authorize(Roles = "SecurityOfficer,Administrator"), Route("api/security/ownership-verifications")]
public sealed class SecurityOwnershipVerificationsController(IOwnershipVerificationService service) : ControllerBase
{
    [HttpGet("pending")] public async Task<ActionResult<IReadOnlyList<OfficerVerificationReviewDto>>> Pending(CancellationToken ct) => Ok(await service.GetPendingSecurityReviewsAsync(ct));
    [HttpGet("{id:guid}")] public async Task<ActionResult<OfficerVerificationReviewDto>> Get(Guid id, CancellationToken ct) { try { return Ok(await service.GetSecurityReviewAsync(id, ct)); } catch (KeyNotFoundException) { return NotFound(); } }
    [HttpPost("{id:guid}/approve")] public Task<ActionResult<OfficerVerificationReviewDto>> Approve(Guid id, SecurityReviewDecisionDto request, CancellationToken ct) => Decide(id, true, request, ct);
    [HttpPost("{id:guid}/reject")] public Task<ActionResult<OfficerVerificationReviewDto>> Reject(Guid id, SecurityReviewDecisionDto request, CancellationToken ct) => Decide(id, false, request, ct);
    private async Task<ActionResult<OfficerVerificationReviewDto>> Decide(Guid id, bool approve, SecurityReviewDecisionDto request, CancellationToken ct) { var officer = User.FindFirstValue(ClaimTypes.NameIdentifier); if (string.IsNullOrEmpty(officer)) return Unauthorized(); try { return Ok(await service.DecideSecurityReviewAsync(id, officer, approve, request.ReviewNote, ct)); } catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); } catch (KeyNotFoundException) { return NotFound(); } }
}

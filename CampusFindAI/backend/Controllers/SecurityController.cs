using System.Security.Claims;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Authorize(Roles = "SecurityOfficer,Administrator")]
[Route("api/[controller]")]
public class SecurityController(
    ISecurityDashboardService dashboardService,
    IAuditLogService auditLogService) : ControllerBase
{
    /// <summary>Counts for the officer landing page (pending claims, suggested matches).</summary>
    [HttpGet("overview")]
    public async Task<ActionResult<SecurityOverviewDto>> GetOverview(
        CancellationToken cancellationToken)
    {
        var overview = await dashboardService.GetOverviewAsync(cancellationToken);

        return Ok(overview);
    }

    /// <summary>"Login Confirmation" — who is signed in and when they last signed in.</summary>
    [HttpGet("login-confirmation")]
    public async Task<ActionResult<LoginConfirmationDto>> GetLoginConfirmation(
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var confirmation = await dashboardService.GetLoginConfirmationAsync(userId, cancellationToken);

        return Ok(confirmation);
    }

    /// <summary>"Login detail" — the officer's recent login/session history.</summary>
    [HttpGet("login-history")]
    public async Task<ActionResult<IReadOnlyList<LoginHistoryEntryDto>>> GetLoginHistory(
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var history = await auditLogService.GetLoginHistoryAsync(
            userId,
            take: 20,
            cancellationToken: cancellationToken);

        return Ok(history);
    }

    /// <summary>A single login-history entry's detail.</summary>
    [HttpGet("login-history/{id:guid}")]
    public async Task<ActionResult<LoginHistoryEntryDto>> GetLoginDetail(
        Guid id,
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var detail = await auditLogService.GetLoginDetailAsync(userId, id, cancellationToken);

        if (detail is null)
        {
            return NotFound();
        }

        return Ok(detail);
    }
}

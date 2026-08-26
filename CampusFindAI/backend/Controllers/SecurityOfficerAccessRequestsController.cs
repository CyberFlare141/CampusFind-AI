using System.Security.Claims;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Route("api/security-officer-requests")]
public class SecurityOfficerAccessRequestsController(ISecurityOfficerAccessRequestService service) : ControllerBase
{
    [HttpPost]
    [Authorize(Roles = "Student")]
    public async Task<ActionResult<AccessRequestDto>> Create(CreateAccessRequestDto request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException();
        return Ok(await service.CreateAsync(userId, request, cancellationToken));
    }

    [HttpGet("my")]
    [Authorize(Roles = "Student,SecurityOfficer,Administrator")]
    public async Task<ActionResult<IReadOnlyList<AccessRequestDto>>> Mine(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException();
        return Ok(await service.GetMineAsync(userId, cancellationToken));
    }

    [HttpGet]
    [Authorize(Roles = "Administrator")]
    public async Task<ActionResult<IReadOnlyList<AccessRequestDto>>> All(CancellationToken cancellationToken) => Ok(await service.GetAllAsync(cancellationToken));

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = "Administrator")]
    public async Task<ActionResult<AccessRequestDto>> Approve(Guid id, CancellationToken cancellationToken)
    {
        var administratorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException();
        return Ok(await service.ApproveAsync(id, administratorId, cancellationToken));
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = "Administrator")]
    public async Task<ActionResult<AccessRequestDto>> Reject(Guid id, RejectAccessRequestDto request, CancellationToken cancellationToken)
    {
        var administratorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException();
        return Ok(await service.RejectAsync(id, administratorId, request, cancellationToken));
    }
}
using System.Security.Claims;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

[ApiController, Authorize, Route("api/founditems/{foundItemId:guid}/claim-chats")]
public sealed class FounderClaimChatsController(IClaimChatService chat) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FounderClaimChatDto>>> Get(Guid foundItemId, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        try { return Ok(await chat.GetFounderChatsAsync(foundItemId, userId, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}

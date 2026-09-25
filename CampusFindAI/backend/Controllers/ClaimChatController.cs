using System.Security.Claims;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Hubs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CampusFindAI.Api.Controllers;

[ApiController, Authorize, Route("api/claims/{claimId:guid}/chat")]
public sealed class ClaimChatController(IClaimChatService chat, IHubContext<ClaimChatHub> hub) : ControllerBase
{
    [HttpGet]
    public Task<ActionResult<ClaimChatConversationDto>> Open(Guid claimId, CancellationToken ct) => WithUser(user => chat.OpenAsync(claimId, user, ct));

    [HttpGet("messages")]
    public Task<ActionResult<ClaimChatMessagesDto>> Messages(Guid claimId, [FromQuery] DateTime? before, [FromQuery] int take = 30, CancellationToken ct = default) => WithUser(user => chat.GetMessagesAsync(claimId, user, before, take, ct));

    [HttpPost("messages")]
    public Task<ActionResult<ClaimChatMessageDto>> Send(Guid claimId, SendClaimChatMessageDto request, CancellationToken ct) => WithUser(async user =>
    {
        var message = await chat.SendAsync(claimId, user, request, ct);
        await hub.Clients.Group(ClaimChatHub.GroupName(message.ConversationId)).SendAsync("MessageReceived", message, ct);
        return message;
    });

    [HttpPost("read")]
    public async Task<ActionResult> MarkRead(Guid claimId, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        try { await chat.MarkReadAsync(claimId, userId, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException exception) { return BadRequest(new { message = exception.Message }); }
    }

    private async Task<ActionResult<T>> WithUser<T>(Func<string, Task<T>> action)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        try { return Ok(await action(userId)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException exception) { return BadRequest(new { message = exception.Message }); }
    }

}

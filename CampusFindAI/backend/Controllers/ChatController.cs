using System.Security.Claims;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/chat")]
public class ChatController(IChatbotService chatbot) : ControllerBase
{
    [HttpPost("messages")]
    public async Task<ActionResult<ChatResponseDto>> Send(SendChatMessageDto request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        try { return Ok(await chatbot.SendAsync(userId, request, cancellationToken)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return StatusCode(StatusCodes.Status429TooManyRequests, new { message = ex.Message }); }
        catch (KeyNotFoundException) { return NotFound(new { message = "Conversation not found." }); }
    }

    [HttpGet("conversations")]
    public async Task<ActionResult<IReadOnlyList<ChatConversationDto>>> Conversations(CancellationToken cancellationToken) =>
        await WithUser(id => chatbot.GetConversationsAsync(id, cancellationToken));

    [HttpPost("conversations")]
    public async Task<ActionResult<ChatConversationDto>> Create(CreateChatConversationDto request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier); if (string.IsNullOrEmpty(userId)) return Unauthorized();
        return Ok(await chatbot.CreateConversationAsync(userId, request, cancellationToken));
    }

    [HttpGet("conversations/{conversationId:guid}/messages")]
    public async Task<ActionResult<IReadOnlyList<ChatMessageDto>>> Messages(Guid conversationId, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier); if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var messages = await chatbot.GetMessagesAsync(userId, conversationId, cancellationToken);
        return messages is null ? NotFound() : Ok(messages);
    }

    [HttpDelete("conversations/{conversationId:guid}")]
    public async Task<IActionResult> Delete(Guid conversationId, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier); if (string.IsNullOrEmpty(userId)) return Unauthorized();
        return await chatbot.DeleteConversationAsync(userId, conversationId, cancellationToken) ? NoContent() : NotFound();
    }

    [HttpDelete("conversations")]
    public async Task<IActionResult> Clear(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier); if (string.IsNullOrEmpty(userId)) return Unauthorized();
        await chatbot.ClearAsync(userId, cancellationToken); return NoContent();
    }

    private async Task<ActionResult<IReadOnlyList<ChatConversationDto>>> WithUser(Func<string, Task<IReadOnlyList<ChatConversationDto>>> action)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier); return string.IsNullOrEmpty(userId) ? Unauthorized() : Ok(await action(userId));
    }
}

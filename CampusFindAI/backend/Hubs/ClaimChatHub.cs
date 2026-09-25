using System.Security.Claims;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace CampusFindAI.Api.Hubs;

[Authorize]
public sealed class ClaimChatHub(IClaimChatService chat) : Hub
{
    public static string GroupName(Guid conversationId) => $"claim-chat-{conversationId}";

    public async Task JoinClaimChat(Guid claimId)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new HubException("Unauthorized.");
        var conversation = await chat.OpenAsync(claimId, userId, Context.ConnectionAborted);
        await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(conversation.Id), Context.ConnectionAborted);
    }

    public Task LeaveClaimChat(Guid conversationId) => Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(conversationId), Context.ConnectionAborted);
}

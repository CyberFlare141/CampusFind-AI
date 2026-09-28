using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface IChatbotService
{
    Task<ChatResponseDto> SendAsync(string userId, SendChatMessageDto request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ChatConversationDto>> GetConversationsAsync(string userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ChatMessageDto>?> GetMessagesAsync(string userId, Guid conversationId, CancellationToken cancellationToken = default);
    Task<ChatConversationDto> CreateConversationAsync(string userId, CreateChatConversationDto request, CancellationToken cancellationToken = default);
    Task<bool> DeleteConversationAsync(string userId, Guid conversationId, CancellationToken cancellationToken = default);
    Task ClearAsync(string userId, CancellationToken cancellationToken = default);
}

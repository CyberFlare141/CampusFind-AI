using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface IClaimChatService
{
    Task<ClaimChatConversationDto> OpenAsync(Guid claimId, string userId, CancellationToken ct = default);
    Task<ClaimChatMessagesDto> GetMessagesAsync(Guid claimId, string userId, DateTime? before, int take, CancellationToken ct = default);
    Task<ClaimChatMessageDto> SendAsync(Guid claimId, string userId, SendClaimChatMessageDto request, CancellationToken ct = default);
    Task MarkReadAsync(Guid claimId, string userId, CancellationToken ct = default);
    Task<IReadOnlyList<FounderClaimChatDto>> GetFounderChatsAsync(Guid foundItemId, string userId, CancellationToken ct = default);
}

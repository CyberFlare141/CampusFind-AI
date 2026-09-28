namespace CampusFindAI.Api.Models;

public sealed class ClaimChatMessage
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public string SenderUserId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }

    public ClaimChatConversation? Conversation { get; set; }
    public ApplicationUser? SenderUser { get; set; }
}

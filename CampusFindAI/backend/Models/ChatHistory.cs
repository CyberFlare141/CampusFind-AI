namespace CampusFindAI.Api.Models;

public class ChatHistory
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public string UserId { get; set; } = string.Empty;
    /// <summary>Only "user" and "assistant" are persisted. Never store verification answers.</summary>
    public string Role { get; set; } = "user";
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser? User { get; set; }
    public ChatConversation? Conversation { get; set; }
}

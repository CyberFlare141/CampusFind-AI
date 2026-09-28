namespace CampusFindAI.Api.Models;

/// <summary>A private, user-owned CampusFind Assistant conversation.</summary>
public class ChatConversation
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = "New conversation";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser? User { get; set; }
    public ICollection<ChatHistory> Messages { get; set; } = new List<ChatHistory>();
}

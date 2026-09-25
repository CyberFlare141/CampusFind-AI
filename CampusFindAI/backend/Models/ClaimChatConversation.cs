namespace CampusFindAI.Api.Models;

/// <summary>Private coordination conversation for one security-approved claim.</summary>
public sealed class ClaimChatConversation
{
    public Guid Id { get; set; }
    public Guid ClaimId { get; set; }
    public string OwnerUserId { get; set; } = string.Empty;
    public string FounderUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }
    public bool IsReadOnly { get; set; }

    public Claim? Claim { get; set; }
    public ICollection<ClaimChatMessage> Messages { get; set; } = new List<ClaimChatMessage>();
}

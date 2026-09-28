namespace CampusFindAI.Api.DTOs;

public sealed class ClaimChatConversationDto
{
    public Guid Id { get; set; }
    public Guid ClaimId { get; set; }
    public string ItemTitle { get; set; } = string.Empty;
    public string OtherParticipantName { get; set; } = "Campus member";
    public bool IsReadOnly { get; set; }
    public int UnreadCount { get; set; }
}

public sealed class ClaimChatMessageDto
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
    public bool IsMine { get; set; }
    public string SenderName { get; set; } = "Campus member";
}

public sealed class ClaimChatMessagesDto
{
    public ClaimChatConversationDto Conversation { get; set; } = new();
    public IReadOnlyList<ClaimChatMessageDto> Messages { get; set; } = [];
    public DateTime? NextBefore { get; set; }
}

public sealed class SendClaimChatMessageDto
{
    public string Content { get; set; } = string.Empty;
}

public sealed class FounderClaimChatDto
{
    public Guid ClaimId { get; set; }
    public string ItemTitle { get; set; } = string.Empty;
    public string OwnerName { get; set; } = "Campus member";
    public int UnreadCount { get; set; }
}

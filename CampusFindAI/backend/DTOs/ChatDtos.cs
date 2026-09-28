using System.ComponentModel.DataAnnotations;

namespace CampusFindAI.Api.DTOs;

public class SendChatMessageDto
{
    public Guid? ConversationId { get; set; }
    [Required, StringLength(2000, MinimumLength = 1)] public string Message { get; set; } = string.Empty;
}

public class CreateChatConversationDto
{
    [StringLength(120)] public string? Title { get; set; }
}

public class ChatConversationDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ChatMessageDto
{
    public Guid Id { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class ChatItemCardDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? Location { get; set; }
    public DateTime? Date { get; set; }
    public string? ImageUrl { get; set; }
    public double? RelevanceScore { get; set; }
    public string Route { get; set; } = string.Empty;
}

public class ChatSummaryCardDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string Route { get; set; } = string.Empty;
    public string? Detail { get; set; }
}

public class ReportDraftDto
{
    public string ReportType { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Description { get; set; }
    public DateTime? OccurredAt { get; set; }
    public string? LocationDetails { get; set; }
}

public class ChatActionDto { public string Label { get; set; } = string.Empty; public string Route { get; set; } = string.Empty; }

public class ChatResponseDto
{
    public Guid ConversationId { get; set; }
    public string Text { get; set; } = string.Empty;
    public string Type { get; set; } = "message";
    public DateTime CreatedAt { get; set; }
    public IReadOnlyList<ChatItemCardDto> Items { get; set; } = [];
    public IReadOnlyList<ChatSummaryCardDto> Cards { get; set; } = [];
    public IReadOnlyList<ChatActionDto> Actions { get; set; } = [];
    public ReportDraftDto? ReportDraft { get; set; }
}

namespace CampusFindAI.Api.DTOs;

public class MatchDto
{
    public Guid Id { get; set; }

    public Guid LostItemId { get; set; }
    public string LostItemTitle { get; set; } = string.Empty;
    public string LostItemUserId { get; set; } = string.Empty;

    public Guid FoundItemId { get; set; }
    public string FoundItemTitle { get; set; } = string.Empty;
    public string FoundItemUserId { get; set; } = string.Empty;

    public decimal ConfidenceScore { get; set; }
}

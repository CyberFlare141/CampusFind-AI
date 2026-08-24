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

    /// <summary>Human-readable rationale for this potential match.</summary>
    public string Explanation { get; set; } = string.Empty;

    /// <summary>The report attributes that contributed to the confidence score.</summary>
    public IReadOnlyList<string> MatchedAttributes { get; set; } = [];
}

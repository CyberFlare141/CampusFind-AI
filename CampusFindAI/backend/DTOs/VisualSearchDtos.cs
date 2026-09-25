namespace CampusFindAI.Api.DTOs;

public sealed class VisualSearchMatchDto
{
    public Guid FoundItemId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public decimal SimilarityScore { get; set; }
    public int SimilarityPercentage { get; set; }
}

public sealed class VisualSearchResponseDto
{
    public IReadOnlyList<VisualSearchMatchDto> Matches { get; set; } = [];
    public string Message { get; set; } = string.Empty;
}

namespace CampusFindAI.Api.Models;

public class Match
{
    public Guid Id { get; set; }
    public Guid LostItemId { get; set; }
    public Guid FoundItemId { get; set; }
    public decimal ConfidenceScore { get; set; }

    public LostItem? LostItem { get; set; }
    public FoundItem? FoundItem { get; set; }
}

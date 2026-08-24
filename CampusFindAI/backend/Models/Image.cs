namespace CampusFindAI.Api.Models;

public class Image
{
    public Guid Id { get; set; }
    public Guid? LostItemId { get; set; }
    public Guid? FoundItemId { get; set; }
    public string Url { get; set; } = string.Empty;
    public LostItem? LostItem { get; set; }
    public FoundItem? FoundItem { get; set; }
}

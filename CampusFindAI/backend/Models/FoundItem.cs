namespace CampusFindAI.Api.Models;

public class FoundItem
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public Guid? CategoryId { get; set; }
    public Guid? LocationId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? FoundAt { get; set; }

    public ApplicationUser? User { get; set; }
    public Category? Category { get; set; }
    public Location? Location { get; set; }
    public ICollection<Image> Images { get; set; } = new List<Image>();
}

namespace CampusFindAI.Api.Models;

public class Category
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<LostItem> LostItems { get; set; } = new List<LostItem>();
    public ICollection<FoundItem> FoundItems { get; set; } = new List<FoundItem>();
}

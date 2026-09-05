namespace CampusFindAI.Api.Models;

public class Location
{
    public Guid Id { get; set; }
    public Guid? BuildingId { get; set; }
    public Guid? FloorId { get; set; }
    public string Name { get; set; } = string.Empty;

    public Building? Building { get; set; }
    public Floor? Floor { get; set; }
    public ICollection<LostItem> LostItems { get; set; } = new List<LostItem>();
    public ICollection<FoundItem> FoundItems { get; set; } = new List<FoundItem>();
}

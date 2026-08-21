namespace CampusFindAI.Api.Models;

public class Building
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<Location> Locations { get; set; } = new List<Location>();
}

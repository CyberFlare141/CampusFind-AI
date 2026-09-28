namespace CampusFindAI.Api.Models;
public class Floor { public Guid Id { get; set; } public Guid BuildingId { get; set; } public int FloorNumber { get; set; } public string Name { get; set; } = string.Empty; public bool IsActive { get; set; } = true; public Building? Building { get; set; } public ICollection<Location> Locations { get; set; } = new List<Location>(); }

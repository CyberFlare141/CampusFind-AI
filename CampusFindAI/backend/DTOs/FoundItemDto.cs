namespace CampusFindAI.Api.DTOs;

public class FoundItemDto
{
    public Guid Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime? FoundAt { get; set; }

    public Guid? CategoryId { get; set; }
    public string? CategoryName { get; set; }

    public Guid? LocationId { get; set; }
    public string? LocationName { get; set; }
    public string? BuildingName { get; set; }
    public string? FloorName { get; set; }
    public string? LocationDetails { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public IReadOnlyList<string> ImageUrls { get; set; } = [];
}

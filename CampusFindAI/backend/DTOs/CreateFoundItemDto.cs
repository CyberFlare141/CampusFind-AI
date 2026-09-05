namespace CampusFindAI.Api.DTOs;

public class CreateFoundItemDto
{
    public List<IFormFile> Images { get; set; } = [];

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    /// <summary>Private identifying facts. Never returned by public Found Item endpoints.</summary>
    public string? PrivateVerificationDetails { get; set; }

    public DateTime? FoundAt { get; set; }

    public Guid? CategoryId { get; set; }

    public Guid? BuildingId { get; set; }
    public Guid? FloorId { get; set; }
    public Guid? LocationId { get; set; }
    public string? LocationDetails { get; set; }
}

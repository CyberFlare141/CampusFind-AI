namespace CampusFindAI.Api.DTOs;

/// <summary>Only user-editable lost-report fields. Ownership and lifecycle fields are server controlled.</summary>
public sealed class UpdateLostItemDto
{
    public List<IFormFile> Images { get; set; } = [];
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? LostAt { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? BuildingId { get; set; }
    public Guid? FloorId { get; set; }
    public Guid? LocationId { get; set; }
    public string? LocationDetails { get; set; }
}

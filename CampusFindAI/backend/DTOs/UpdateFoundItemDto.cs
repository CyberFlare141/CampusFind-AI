namespace CampusFindAI.Api.DTOs;

/// <summary>
/// Only non-sensitive, user-editable found-report fields. Private verification details are deliberately
/// omitted so an ordinary edit cannot disclose or invalidate an ownership-verification workflow.
/// </summary>
public sealed class UpdateFoundItemDto
{
    public List<IFormFile> Images { get; set; } = [];
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? FoundAt { get; set; }
    public Guid? CategoryId { get; set; }
    public Guid? BuildingId { get; set; }
    public Guid? FloorId { get; set; }
    public Guid? LocationId { get; set; }
    public string? LocationDetails { get; set; }
}

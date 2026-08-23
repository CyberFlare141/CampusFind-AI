namespace CampusFindAI.Api.DTOs;

public class LostItemDto
{
    public Guid Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime? LostAt { get; set; }

    public Guid? CategoryId { get; set; }

    public Guid? LocationId { get; set; }

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public IReadOnlyList<string> ImageUrls { get; set; } = [];
}

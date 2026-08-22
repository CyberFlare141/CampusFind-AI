namespace CampusFindAI.Api.DTOs;

public class FoundItemDto
{
    public Guid Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime? FoundAt { get; set; }

    public Guid? CategoryId { get; set; }

    public Guid? LocationId { get; set; }
}
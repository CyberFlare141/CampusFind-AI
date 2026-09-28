namespace CampusFindAI.Api.Models;

public class FoundItem
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public Guid? CategoryId { get; set; }
    public Guid? LocationId { get; set; }
    public string? LocationDetails { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    /// <summary>
    /// Legacy single finder verification detail. New reports use FounderVerificationAnswersJson
    /// instead; this remains so historical reports can still be read safely.
    /// </summary>
    public string? PrivateVerificationDetails { get; set; }
    /// <summary>
    /// JSON payload of the finder's three private answers. It is intentionally omitted from every
    /// public DTO and is only read by the finder and an authorized security-review workflow.
    /// </summary>
    public string? FounderVerificationAnswersJson { get; set; }
    public DateTime? FoundAt { get; set; }
    public string Status { get; set; } = "Available";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser? User { get; set; }
    public Category? Category { get; set; }
    public Location? Location { get; set; }
    public ICollection<Image> Images { get; set; } = new List<Image>();
}

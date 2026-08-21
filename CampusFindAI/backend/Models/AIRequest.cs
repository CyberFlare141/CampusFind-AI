namespace CampusFindAI.Api.Models;

public class AIRequest
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string RequestType { get; set; } = string.Empty;
    public string? Input { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser? User { get; set; }
}

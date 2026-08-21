namespace CampusFindAI.Api.Models;

public class Feedback
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? Comment { get; set; }
    public int? Rating { get; set; }

    public ApplicationUser? User { get; set; }
}

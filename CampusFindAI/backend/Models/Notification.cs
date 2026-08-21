namespace CampusFindAI.Api.Models;

public class Notification
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }

    public ApplicationUser? User { get; set; }
}

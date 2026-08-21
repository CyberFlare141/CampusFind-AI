namespace CampusFindAI.Api.Models;

public class AuditLog
{
    public Guid Id { get; set; }
    public string? UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser? User { get; set; }
}

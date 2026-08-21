namespace CampusFindAI.Api.Models;

public class Reputation
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int Points { get; set; }

    public ApplicationUser? User { get; set; }
}

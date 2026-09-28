namespace CampusFindAI.Api.Models;

public class Reputation
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int Points { get; set; } = 0;
    public string Level { get; set; } = "New";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser? User { get; set; }
    public ICollection<ReputationHistory> History { get; set; } = new List<ReputationHistory>();
}

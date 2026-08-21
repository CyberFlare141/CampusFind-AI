namespace CampusFindAI.Api.Models;

public class Claim
{
    public Guid Id { get; set; }
    public Guid FoundItemId { get; set; }
    public string ClaimantUserId { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";

    public FoundItem? FoundItem { get; set; }
    public ApplicationUser? ClaimantUser { get; set; }
}

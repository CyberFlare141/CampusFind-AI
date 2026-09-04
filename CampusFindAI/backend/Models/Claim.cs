namespace CampusFindAI.Api.Models;

public class Claim
{
    public Guid Id { get; set; }
    public Guid FoundItemId { get; set; }
    public string ClaimantUserId { get; set; } = string.Empty;

    /// <summary>
    /// The claimant's explanation of why the found item belongs to them
    /// (identifying details, proof of ownership, etc.).
    /// </summary>
    public string? ClaimantNotes { get; set; }

    /// <summary>Pending, Approved, or Rejected.</summary>
    public string Status { get; set; } = "Pending";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? DecisionNotes { get; set; }

    public FoundItem? FoundItem { get; set; }
    public ApplicationUser? ClaimantUser { get; set; }
    public ApplicationUser? ReviewedByUser { get; set; }
    public ClaimVerification? Verification { get; set; }
}

namespace CampusFindAI.Api.Models;

/// <summary>
/// Immutable audit record of every reputation point change for a user.
/// Never updated — only inserted. Prevents duplicate events via a unique index
/// on (UserId, RelatedEntityType, RelatedEntityId, Reason).
/// </summary>
public class ReputationHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string UserId { get; set; } = string.Empty;

    /// <summary>Positive or negative point change for this event.</summary>
    public int PointChange { get; set; }

    /// <summary>Human-readable reason shown to the user in their history.</summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>e.g. "Claim", "FoundItem". Used with RelatedEntityId for idempotency.</summary>
    public string? RelatedEntityType { get; set; }

    /// <summary>The PK of the related entity (Claim.Id, FoundItem.Id, etc.).</summary>
    public Guid? RelatedEntityId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser? User { get; set; }
    public Reputation? Reputation { get; set; }
}

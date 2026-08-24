namespace CampusFindAI.Api.DTOs;

public class CreateClaimDto
{
    public Guid FoundItemId { get; set; }

    /// <summary>Identifying details / proof of ownership supplied by the claimant.</summary>
    public string? ClaimantNotes { get; set; }
}

public class ClaimDto
{
    public Guid Id { get; set; }

    public Guid FoundItemId { get; set; }
    public string FoundItemTitle { get; set; } = string.Empty;
    public string? FoundItemDescription { get; set; }

    public string ClaimantUserId { get; set; } = string.Empty;
    public string ClaimantEmail { get; set; } = string.Empty;
    public string? ClaimantNotes { get; set; }

    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public string? ReviewedByUserId { get; set; }
    public string? ReviewedByEmail { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? DecisionNotes { get; set; }
}

public class ClaimDecisionDto
{
    /// <summary>True to approve the claim, false to reject it.</summary>
    public bool Approve { get; set; }

    public string? DecisionNotes { get; set; }
}

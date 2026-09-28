namespace CampusFindAI.Api.Models;

public enum SecurityOfficerRequestStatus
{
    Pending,
    Approved,
    Rejected
}

public class SecurityOfficerRequest
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string AdditionalInformation { get; set; } = string.Empty;
    public SecurityOfficerRequestStatus Status { get; set; } = SecurityOfficerRequestStatus.Pending;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedByUserId { get; set; }
    public string? AdminNotes { get; set; }

    public ApplicationUser? User { get; set; }
    public ApplicationUser? ReviewedByUser { get; set; }
}

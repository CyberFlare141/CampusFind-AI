namespace CampusFindAI.Api.Models;

public enum AccessRequestStatus
{
    Pending,
    Approved,
    Rejected
}

public class SecurityOfficerAccessRequest
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? StaffId { get; set; }
    public string? Department { get; set; }
    public string Reason { get; set; } = string.Empty;
    public AccessRequestStatus Status { get; set; } = AccessRequestStatus.Pending;
    public string? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
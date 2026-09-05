using System.ComponentModel.DataAnnotations;

namespace CampusFindAI.Api.DTOs;

public class CreateSecurityOfficerRequestDto
{
    [Required, StringLength(500)] public string Reason { get; set; } = string.Empty;
    [Required, StringLength(2000)] public string AdditionalInformation { get; set; } = string.Empty;
}

public class SecurityOfficerRequestDecisionDto
{
    [StringLength(1000)] public string? AdminNotes { get; set; }
}

public class SecurityOfficerRequestDto
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public string? University { get; set; }
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public string? StudentId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string AdditionalInformation { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedByUserId { get; set; }
    public string? AdminNotes { get; set; }
}

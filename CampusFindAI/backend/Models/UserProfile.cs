namespace CampusFindAI.Api.Models;

public class UserProfile
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public string? Semester { get; set; }
    public string? StudentId { get; set; }
    public string? Phone { get; set; }

    public ApplicationUser? User { get; set; }
}

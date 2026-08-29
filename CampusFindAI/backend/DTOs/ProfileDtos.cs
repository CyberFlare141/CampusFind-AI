using System.ComponentModel.DataAnnotations;

namespace CampusFindAI.Api.DTOs;

public class ProfileDto
{
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public string? Semester { get; set; }
    public string? StudentId { get; set; }
    public string? Phone { get; set; }
}

public class UpdateProfileDto
{
    [StringLength(120)] public string? FullName { get; set; }
    [StringLength(120)] public string? Department { get; set; }
    [StringLength(120)] public string? JobTitle { get; set; }
    [StringLength(40)] public string? Semester { get; set; }
    [StringLength(50)] public string? StudentId { get; set; }
    [Phone, StringLength(30)] public string? Phone { get; set; }
}

public class ChangePasswordDto
{
    [Required] public string CurrentPassword { get; set; } = string.Empty;
    [Required] public string NewPassword { get; set; } = string.Empty;
}

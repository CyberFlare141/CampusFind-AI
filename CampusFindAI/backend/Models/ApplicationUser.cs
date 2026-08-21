using Microsoft.AspNetCore.Identity;

namespace CampusFindAI.Api.Models;

public class ApplicationUser : IdentityUser
{
    public UserRole Role { get; set; } = UserRole.Student;

    public UserProfile? UserProfile { get; set; }
    public Reputation? Reputation { get; set; }
}

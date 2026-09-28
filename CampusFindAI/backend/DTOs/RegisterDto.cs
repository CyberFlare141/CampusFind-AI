using System.ComponentModel.DataAnnotations;

namespace CampusFindAI.Api.DTOs;

public class RegisterDto
{
    [Required, EmailAddress, StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

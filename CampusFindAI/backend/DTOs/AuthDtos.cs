using System.ComponentModel.DataAnnotations;

namespace CampusFindAI.Api.DTOs;

public class ConfirmEmailDto
{
    [Required]
    public string UserId { get; set; } = string.Empty;

    [Required]
    public string Token { get; set; } = string.Empty;
}

public class ResendConfirmationDto
{
    [Required, EmailAddress, StringLength(256)]
    public string Email { get; set; } = string.Empty;
}

public class ForgotPasswordDto
{
    [Required, EmailAddress, StringLength(256)]
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordDto
{
    [Required]
    public string UserId { get; set; } = string.Empty;

    [Required]
    public string Token { get; set; } = string.Empty;

    [Required, StringLength(20, MinimumLength = 8)]
    public string NewPassword { get; set; } = string.Empty;
}

public class RegisterResponseDto
{
    public bool RequiresEmailConfirmation { get; set; } = true;
    public string Email { get; set; } = string.Empty;
    public string MaskedEmail { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class AuthMessageResponseDto
{
    public string Message { get; set; } = string.Empty;
}


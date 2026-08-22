namespace CampusFindAI.Api.DTOs;

public class SecurityOverviewDto
{
    public int PendingClaimsCount { get; set; }
    public int SuggestedMatchesCount { get; set; }
}

/// <summary>
/// Returned right after a security officer authenticates, so the UI can
/// display a "you are signed in as ..." confirmation screen.
/// </summary>
public class LoginConfirmationDto
{
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;

    /// <summary>Timestamp of the officer's previous successful login, if any.</summary>
    public DateTime? LastLoginAt { get; set; }

    public DateTime ConfirmedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>A single entry in the officer's login/session audit trail ("Login detail").</summary>
public class LoginHistoryEntryDto
{
    public Guid Id { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; }
}

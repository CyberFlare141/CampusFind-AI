namespace CampusFindAI.Api.Services;

/// <summary>Central configuration for ownership-verification eligibility and retries.</summary>
public sealed class OwnershipVerificationOptions
{
    public const string SectionName = "OwnershipVerification";
    public decimal MatchEligibilityThreshold { get; init; } = .60m;
    public int QuestionCount { get; init; } = 3;
    public int MaxAttempts { get; init; } = 2;
}

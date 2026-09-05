namespace CampusFindAI.Api.Models;

public class ClaimVerification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClaimId { get; set; }
    /// <summary>The AI match this verification is bound to. Nullable only for legacy records.</summary>
    public Guid? MatchId { get; set; }
    public Guid? LostItemId { get; set; }

    /// <summary>
    /// AES-256 encrypted payload of generated questions and expected answers (via IDataProtector).
    /// Answers are NEVER stored in plaintext in the database.
    /// </summary>
    public string SecureQuestionsPayload { get; set; } = string.Empty;

    /// <summary>
    /// Sanitized JSON containing only question text, ids, and types for safe student retrieval.
    /// </summary>
    public string PublicQuestionsJson { get; set; } = string.Empty;

    /// <summary>
    /// JSON serialized array of claimant's submitted answers.
    /// </summary>
    public string? SubmittedAnswersJson { get; set; }

    /// <summary>
    /// Officer-only evaluation report containing AI reasoning, question match indicators, and breakdown.
    /// </summary>
    public string? EvaluationResultJson { get; set; }

    public decimal? ConfidenceScore { get; set; }
    public int? MatchedCount { get; set; }
    public int TotalQuestions { get; set; } = 3;

    public bool? Passed { get; set; }

    /// <summary>Pending, Completed, Locked</summary>
    public string Status { get; set; } = "Pending";

    public int AttemptCount { get; set; } = 0;
    public int MaxAttempts { get; set; } = 2;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SubmittedAt { get; set; }
    public DateTime? PassedAt { get; set; }
    public string? SecurityReviewedByUserId { get; set; }
    public DateTime? SecurityReviewedAt { get; set; }
    public string? SecurityReviewNote { get; set; }

    public Claim? Claim { get; set; }
}

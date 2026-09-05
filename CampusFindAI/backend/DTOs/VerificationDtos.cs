namespace CampusFindAI.Api.DTOs;

public class VerificationQuestionDto
{
    public int Id { get; set; }
    public string Question { get; set; } = string.Empty;
    public string Type { get; set; } = "text";
}

public class ClaimVerificationResponseDto
{
    public Guid ClaimId { get; set; }
    public Guid? MatchId { get; set; }
    public string Status { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int AttemptCount { get; set; }
    public int MaxAttempts { get; set; }
    public bool IsSubmitted { get; set; }
    public bool FallbackUsed { get; set; }
    public string? Message { get; set; }
    public bool CanAccessHandoverChat { get; set; }
    public IReadOnlyList<VerificationQuestionDto> Questions { get; set; } = [];
}

public class SubmitVerificationRequestDto
{
    public List<string> Answers { get; set; } = [];
}

public class SubmitVerificationResponseDto
{
    public string Status { get; set; } = "PendingSecurityReview";
    public int AttemptsRemaining { get; set; }
    public string? Message { get; set; }
    public bool CanAccessHandoverChat { get; set; }
}

public class OwnershipVerificationStatusDto
{
    public Guid MatchId { get; set; }
    public bool Eligible { get; set; }
    public bool CanStart { get; set; }
    public bool CanAccessHandoverChat { get; set; }
    public string Status { get; set; } = "Unavailable";
    public decimal MatchConfidenceScore { get; set; }
    public int AttemptCount { get; set; }
    public int MaxAttempts { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class OfficerQuestionEvaluationDto
{
    public int Id { get; set; }
    public string Question { get; set; } = string.Empty;
    public string? ExpectedAnswer { get; set; }
    public string? StudentAnswer { get; set; }
}

public class OfficerVerificationReviewDto
{
    public Guid VerificationId { get; set; }
    public Guid ClaimId { get; set; }
    public string ClaimNumber { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string StudentEmail { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int AttemptCount { get; set; }
    public int MaxAttempts { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public string? FinderName { get; set; }
    public string FoundItemTitle { get; set; } = string.Empty;
    public string? FinderEmail { get; set; }
    public string? PrivateVerificationDetails { get; set; }
    public decimal MatchConfidenceScore { get; set; }
    public string? SecurityReviewedByUserId { get; set; }
    public DateTime? SecurityReviewedAt { get; set; }
    public string? SecurityReviewNote { get; set; }
    public IReadOnlyList<OfficerQuestionEvaluationDto> Questions { get; set; } = [];
}

public class SecurityReviewDecisionDto { public string? ReviewNote { get; set; } }

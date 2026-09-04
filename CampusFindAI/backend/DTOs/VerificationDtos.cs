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
    public string Status { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int AttemptCount { get; set; }
    public int MaxAttempts { get; set; }
    public bool IsSubmitted { get; set; }
    public bool FallbackUsed { get; set; }
    public string? Message { get; set; }
    public IReadOnlyList<VerificationQuestionDto> Questions { get; set; } = [];
}

public class SubmitVerificationRequestDto
{
    public List<string> Answers { get; set; } = [];
}

public class SubmitVerificationResponseDto
{
    public bool Passed { get; set; }
    public decimal Score { get; set; }
    public string Status { get; set; } = "verification_completed";
    public int AttemptsRemaining { get; set; }
    public string? Message { get; set; }
}

public class OfficerQuestionEvaluationDto
{
    public int Id { get; set; }
    public string Question { get; set; } = string.Empty;
    public string? ExpectedAnswer { get; set; }
    public string? StudentAnswer { get; set; }
    public bool Matched { get; set; }
    public decimal Confidence { get; set; }
    public string? Reasoning { get; set; }
}

public class OfficerVerificationReviewDto
{
    public Guid ClaimId { get; set; }
    public string ClaimNumber { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string StudentEmail { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int MatchedCount { get; set; }
    public int TotalQuestions { get; set; }
    public decimal ConfidenceScore { get; set; }
    public bool Passed { get; set; }
    public int AttemptCount { get; set; }
    public int MaxAttempts { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public IReadOnlyList<OfficerQuestionEvaluationDto> Questions { get; set; } = [];
}

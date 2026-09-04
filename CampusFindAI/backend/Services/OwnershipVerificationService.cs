using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using Microsoft.AspNetCore.DataProtection;

namespace CampusFindAI.Api.Services;

public partial class OwnershipVerificationService(
    IClaimRepository claimRepository,
    IFoundItemRepository foundItemRepository,
    IClaimVerificationRepository verificationRepository,
    IAuditLogService auditLogService,
    IDataProtectionProvider dataProtectionProvider,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<OwnershipVerificationService> logger)
    : IOwnershipVerificationService
{
    private const string GeminiUrlTemplate =
        "https://generativelanguage.googleapis.com/v1beta/models/{0}:generateContent?key={1}";

    private readonly IDataProtector _protector =
        dataProtectionProvider.CreateProtector("CampusFindAI.OwnershipVerification.v1");

    private const string QuestionGenPromptTemplate = """
        You are a university lost and found security intelligence agent.
        A student has filed a claim for a found item.
        Your task is to generate exactly 3 ownership verification questions with their expected answers based on the found item report.

        CRITICAL SECURITY REQUIREMENTS:
        1. Questions MUST focus on distinctive physical characteristics that ONLY the genuine owner would know:
           - distinctive physical characteristics, color, scratches, stickers, contents, unique markings, accessories, identifying details
        2. Avoid questions where the answer is obvious from the public item listing.
           Bad: "What category is this item?"
           Good: "What color is the small logo printed on the inside?" or "What sticker or keychain is attached?"
        3. Derive expected answers from the details below. If a detail is not explicitly mentioned, choose a plausible distinctive question about the item (such as internal pocket contents, lock pattern, brand model, or scratches) where an owner would know the detail.
        4. Output strictly valid JSON ONLY — no markdown backticks, no preamble:
        {
          "questions": [
            {
              "question": "What color is the zipper or trim on the item?",
              "answer": "silver",
              "type": "text"
            },
            {
              "question": "What distinctive stickers, marks, or scratches does the item have?",
              "answer": "small scratch on bottom corner",
              "type": "text"
            },
            {
              "question": "Describe any cards, contents, or attachments inside or on the item.",
              "answer": "blue lanyard",
              "type": "text"
            }
          ]
        }

        Found Item Report:
        Title: {TITLE}
        Category: {CATEGORY}
        Reported Location: {LOCATION}
        Date Found: {FOUND_AT}
        Report Details: {DESCRIPTION}
        """;

    private const string EvaluationPromptTemplate = """
        You are a campus security officer evaluating a student's answers to item ownership verification questions.
        For each question, compare the student's answer with the expected answer.
        Determine if the student's answer accurately matches the expected answer in substance.
        Allow for minor typos, abbreviations, or common synonyms (e.g. "navy" vs "dark blue", "it was silver" vs "silver", "initials M.S." vs "M.S.").
        Each question focuses on one specific aspect (such as markings, color, or contents). If the student correctly identifies that specific detail, mark matched: true with confidence >= 0.85. Do not penalize the student for not mentioning details that belong to other questions.
        Reject blank, evasive, or incorrect answers.

        Question and Answer Pairs:
        {QA_PAIRS}

        Output strictly valid JSON ONLY — no markdown backticks, no preamble:
        {
          "evaluations": [
            {
              "id": 1,
              "matched": true,
              "confidence": 0.95,
              "reasoning": "Correctly identified color."
            }
          ],
          "overallScore": 0.92,
          "passed": true
        }
        Rule: "passed" is true if overallScore >= 0.70 and at least 2 answers matched.
        """;

    public async Task<ClaimVerificationResponseDto> GetOrGenerateVerificationAsync(
        Guid claimId,
        string currentUserId,
        CancellationToken cancellationToken = default)
    {
        var claim = await claimRepository.GetByIdAsync(claimId, cancellationToken)
            ?? throw new KeyNotFoundException("Claim not found.");

        // Authorization check: claimant or officer/admin can access
        if (claim.ClaimantUserId != currentUserId)
        {
            // Note: Officers can also inspect through officer review endpoint
            throw new UnauthorizedAccessException("You are not authorized to access verification for this claim.");
        }

        // Check if verification already exists for this claim
        var existing = await verificationRepository.GetByClaimIdAsync(claimId, cancellationToken);
        if (existing is not null)
        {
            var publicQuestions = DeserializePublicQuestions(existing.PublicQuestionsJson);
            return new ClaimVerificationResponseDto
            {
                ClaimId = existing.ClaimId,
                Status = existing.Status,
                TotalQuestions = existing.TotalQuestions,
                AttemptCount = existing.AttemptCount,
                MaxAttempts = existing.MaxAttempts,
                IsSubmitted = existing.Status is "Completed" or "Locked",
                FallbackUsed = false,
                Questions = publicQuestions
            };
        }

        // Claim must be Pending to generate questions
        if (claim.Status != "Pending")
        {
            throw new InvalidOperationException($"Cannot generate verification questions for a {claim.Status.ToLowerInvariant()} claim.");
        }

        // Generate questions using AI (or fallback)
        var foundItem = await foundItemRepository.GetByIdAsync(claim.FoundItemId, cancellationToken);
        var (internalQuestions, fallbackUsed) = await GenerateQuestionsWithAIAsync(claim, foundItem, cancellationToken);

        // Sanitize for public student consumption (NO ANSWERS EXPOSED)
        var publicList = internalQuestions.Select(q => new VerificationQuestionDto
        {
            Id = q.Id,
            Question = q.Question,
            Type = q.Type
        }).ToList();

        var publicJson = JsonSerializer.Serialize(publicList);
        var unencryptedJson = JsonSerializer.Serialize(internalQuestions);
        var encryptedPayload = _protector.Protect(unencryptedJson);

        var verification = new ClaimVerification
        {
            Id = Guid.NewGuid(),
            ClaimId = claimId,
            SecureQuestionsPayload = encryptedPayload,
            PublicQuestionsJson = publicJson,
            TotalQuestions = internalQuestions.Count,
            AttemptCount = 0,
            MaxAttempts = 2,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        await verificationRepository.AddAsync(verification, cancellationToken);

        // Audit Log: Sensitive answers are NOT logged
        await auditLogService.LogAsync(
            currentUserId,
            "VerificationGenerated",
            $"Ownership verification questions generated for Claim {claim.Id}. FallbackUsed: {fallbackUsed}.",
            cancellationToken);

        return new ClaimVerificationResponseDto
        {
            ClaimId = verification.ClaimId,
            Status = verification.Status,
            TotalQuestions = verification.TotalQuestions,
            AttemptCount = verification.AttemptCount,
            MaxAttempts = verification.MaxAttempts,
            IsSubmitted = false,
            FallbackUsed = fallbackUsed,
            Message = fallbackUsed ? "AI verification is operating in fallback mode; security will verify details." : null,
            Questions = publicList
        };
    }

    public async Task<SubmitVerificationResponseDto> SubmitVerificationAsync(
        Guid claimId,
        string currentUserId,
        SubmitVerificationRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var claim = await claimRepository.GetByIdAsync(claimId, cancellationToken)
            ?? throw new KeyNotFoundException("Claim not found.");

        if (claim.ClaimantUserId != currentUserId)
        {
            throw new UnauthorizedAccessException("You are not authorized to submit verification for this claim.");
        }

        if (claim.Status != "Pending")
        {
            throw new InvalidOperationException($"Cannot submit verification for a claim that has already been {claim.Status.ToLowerInvariant()}.");
        }

        var verification = await verificationRepository.GetByClaimIdAsync(claimId, cancellationToken)
            ?? throw new InvalidOperationException("Verification has not been initialized for this claim.");

        if (verification.Status == "Locked")
        {
            throw new InvalidOperationException("Maximum verification attempts exceeded. Please consult campus security for in-person verification.");
        }

        if (verification.Status == "Completed" && verification.Passed == true)
        {
            throw new InvalidOperationException("Verification has already been successfully submitted and approved for officer review.");
        }

        if (verification.AttemptCount >= verification.MaxAttempts)
        {
            verification.Status = "Locked";
            await verificationRepository.UpdateAsync(verification, cancellationToken);
            throw new InvalidOperationException("Maximum verification attempts exceeded. Please consult campus security for in-person verification.");
        }

        // Decrypt expected questions & answers
        List<InternalQuestionItem> expectedQuestions;
        try
        {
            var decryptedJson = _protector.Unprotect(verification.SecureQuestionsPayload);
            expectedQuestions = JsonSerializer.Deserialize<List<InternalQuestionItem>>(decryptedJson) ?? [];
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to decrypt verification questions for Claim {ClaimId}", claimId);
            throw new InvalidOperationException("Verification data integrity error. Please contact campus security.");
        }

        var submittedAnswers = request.Answers ?? [];

        // Increment attempt count
        verification.AttemptCount++;

        // Evaluate answers using AI (with deterministic fuzzy fallback)
        var (evaluations, score, passed) = await EvaluateAnswersAsync(expectedQuestions, submittedAnswers, cancellationToken);

        verification.ConfidenceScore = score * 100m; // Store as percentage 0-100
        verification.MatchedCount = evaluations.Count(e => e.Matched);
        verification.Passed = passed;
        verification.SubmittedAt = DateTime.UtcNow;
        verification.SubmittedAnswersJson = JsonSerializer.Serialize(submittedAnswers);
        verification.EvaluationResultJson = JsonSerializer.Serialize(evaluations);

        if (passed)
        {
            verification.Status = "Completed";
        }
        else
        {
            verification.Status = verification.AttemptCount >= verification.MaxAttempts ? "Locked" : "Pending";
        }

        await verificationRepository.UpdateAsync(verification, CancellationToken.None);

        // Audit Log: Sensitive answers are NOT logged
        await auditLogService.LogAsync(
            currentUserId,
            "VerificationSubmitted",
            $"Verification submitted for Claim {claimId}. Outcome: {(passed ? "Passed" : "Failed")}, Score: {score:P0}, Attempt: {verification.AttemptCount}/{verification.MaxAttempts}.",
            CancellationToken.None);

        var attemptsRemaining = Math.Max(0, verification.MaxAttempts - verification.AttemptCount);

        return new SubmitVerificationResponseDto
        {
            Passed = passed,
            Score = Math.Round(score, 2),
            Status = "verification_completed",
            AttemptsRemaining = attemptsRemaining,
            Message = passed
                ? "Your answers have been verified and submitted for campus security review."
                : attemptsRemaining > 0
                    ? $"Some answers could not be verified. You have {attemptsRemaining} attempt(s) remaining."
                    : "Maximum verification attempts reached. Campus Security will manually verify your claim in person."
        };
    }

    public async Task<OfficerVerificationReviewDto> GetOfficerReviewAsync(
        Guid claimId,
        CancellationToken cancellationToken = default)
    {
        var claim = await claimRepository.GetByIdAsync(claimId, cancellationToken)
            ?? throw new KeyNotFoundException("Claim not found.");

        var verification = await verificationRepository.GetByClaimIdAsync(claimId, cancellationToken);

        var claimNumber = $"CF-{claim.Id.ToString("N")[..6].ToUpperInvariant()}";
        var studentName = claim.ClaimantUser?.UserProfile?.FullName ?? claim.ClaimantUser?.UserName ?? "Student Claimant";
        var studentEmail = claim.ClaimantUser?.Email ?? string.Empty;

        if (verification is null)
        {
            return new OfficerVerificationReviewDto
            {
                ClaimId = claimId,
                ClaimNumber = claimNumber,
                StudentName = studentName,
                StudentEmail = studentEmail,
                Status = "Not Started",
                TotalQuestions = 0,
                MatchedCount = 0,
                ConfidenceScore = 0m,
                Passed = false,
                AttemptCount = 0,
                MaxAttempts = 2,
                Questions = []
            };
        }

        // Decrypt expected questions
        List<InternalQuestionItem> expectedQuestions = [];
        try
        {
            var decrypted = _protector.Unprotect(verification.SecureQuestionsPayload);
            expectedQuestions = JsonSerializer.Deserialize<List<InternalQuestionItem>>(decrypted) ?? [];
        }
        catch
        {
            // If decrypt fails, fallback gracefully
        }

        // Parse evaluations
        List<InternalOfficerEvaluationItem> evaluations = [];
        if (!string.IsNullOrWhiteSpace(verification.EvaluationResultJson))
        {
            try
            {
                evaluations = JsonSerializer.Deserialize<List<InternalOfficerEvaluationItem>>(verification.EvaluationResultJson) ?? [];
            }
            catch
            {
                // Fallback
            }
        }

        // Map into officer question evaluations
        var officerQuestions = new List<OfficerQuestionEvaluationDto>();
        for (var i = 0; i < expectedQuestions.Count; i++)
        {
            var q = expectedQuestions[i];
            var eval = evaluations.FirstOrDefault(e => e.Id == q.Id);
            officerQuestions.Add(new OfficerQuestionEvaluationDto
            {
                Id = q.Id,
                Question = q.Question,
                ExpectedAnswer = q.Answer,
                StudentAnswer = eval?.StudentAnswer,
                Matched = eval?.Matched ?? false,
                Confidence = eval?.Confidence ?? 0m,
                Reasoning = eval?.Reasoning
            });
        }

        return new OfficerVerificationReviewDto
        {
            ClaimId = claimId,
            ClaimNumber = claimNumber,
            StudentName = studentName,
            StudentEmail = studentEmail,
            Status = verification.Status,
            MatchedCount = verification.MatchedCount ?? 0,
            TotalQuestions = verification.TotalQuestions,
            ConfidenceScore = verification.ConfidenceScore ?? 0m,
            Passed = verification.Passed ?? false,
            AttemptCount = verification.AttemptCount,
            MaxAttempts = verification.MaxAttempts,
            SubmittedAt = verification.SubmittedAt,
            Questions = officerQuestions
        };
    }

    // ── AI Question Generation ────────────────────────────────────────────────

    private async Task<(List<InternalQuestionItem> Questions, bool FallbackUsed)> GenerateQuestionsWithAIAsync(
        Claim claim,
        FoundItem? foundItem,
        CancellationToken cancellationToken)
    {
        var title = foundItem?.Title ?? "Found Item";
        var category = foundItem?.Category?.Name ?? "General Item";
        var location = foundItem?.Location?.Name ?? "Campus";
        var foundAt = foundItem?.FoundAt?.ToString("yyyy-MM-dd") ?? "Recently";
        var description = foundItem?.Description ?? string.Empty;

        var prompt = QuestionGenPromptTemplate
            .Replace("{TITLE}", title)
            .Replace("{CATEGORY}", category)
            .Replace("{LOCATION}", location)
            .Replace("{FOUND_AT}", foundAt)
            .Replace("{DESCRIPTION}", string.IsNullOrWhiteSpace(description) ? "No detailed intake notes provided." : description);

        try
        {
            var rawJson = await CallGeminiAsync(prompt, cancellationToken);
            if (!string.IsNullOrWhiteSpace(rawJson))
            {
                var parsed = ParseQuestionsJson(rawJson);
                if (parsed.Count >= 2)
                {
                    // Ensure sequential IDs (1, 2, 3)
                    for (var i = 0; i < parsed.Count; i++)
                    {
                        parsed[i].Id = i + 1;
                        parsed[i].Type = "text";
                    }

                    return (parsed.Take(3).ToList(), false);
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Gemini question generation failed for claim {ClaimId}. Using controlled fallback.", claim.Id);
        }

        // Controlled Fallback Generation
        return (CreateFallbackQuestions(title, category, description), true);
    }

    private static List<InternalQuestionItem> CreateFallbackQuestions(string title, string category, string description)
    {
        var descLower = description.ToLowerInvariant();
        var colorDetail = ExtractColorOrFeature(descLower) ?? "black";

        var phrases = description.Split(new[] { '.', ';', ',', '\n' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(p => p.Length > 3)
            .ToList();

        var markDetail = phrases.FirstOrDefault(p =>
            p.Contains("initial", StringComparison.OrdinalIgnoreCase) ||
            p.Contains("engrav", StringComparison.OrdinalIgnoreCase) ||
            p.Contains("scratch", StringComparison.OrdinalIgnoreCase) ||
            p.Contains("sticker", StringComparison.OrdinalIgnoreCase) ||
            p.Contains("mark", StringComparison.OrdinalIgnoreCase) ||
            p.Contains("zipper", StringComparison.OrdinalIgnoreCase))
            ?? (phrases.Count > 1 ? phrases[1] : "distinguishing marks or brand identifier");

        var contentDetail = phrases.FirstOrDefault(p =>
            p.Contains("contain", StringComparison.OrdinalIgnoreCase) ||
            p.Contains("inside", StringComparison.OrdinalIgnoreCase) ||
            p.Contains("lanyard", StringComparison.OrdinalIgnoreCase) ||
            p.Contains("card", StringComparison.OrdinalIgnoreCase) ||
            p.Contains("attach", StringComparison.OrdinalIgnoreCase) ||
            p.Contains("key", StringComparison.OrdinalIgnoreCase))
            ?? (phrases.Count > 2 ? phrases[2] : (phrases.Count > 0 ? phrases[0] : "attached accessories or contents"));

        return
        [
            new InternalQuestionItem
            {
                Id = 1,
                Question = $"What is the exact color, shade, or pattern of this {title}?",
                Answer = colorDetail,
                Type = "text"
            },
            new InternalQuestionItem
            {
                Id = 2,
                Question = $"Are there any distinctive marks, scratches, stickers, or brand markings on the {title}?",
                Answer = markDetail,
                Type = "text"
            },
            new InternalQuestionItem
            {
                Id = 3,
                Question = $"Describe any contents, attached accessories, keychains, or tags with this {title}.",
                Answer = contentDetail,
                Type = "text"
            }
        ];
    }

    private static string? ExtractColorOrFeature(string text)
    {
        string[] colors = ["black", "blue", "red", "silver", "white", "grey", "gray", "green", "brown", "yellow", "purple", "pink", "gold"];
        foreach (var c in colors)
        {
            if (text.Contains(c)) return c;
        }
        return null;
    }

    // ── AI Answer Evaluation ──────────────────────────────────────────────────

    private async Task<(List<InternalOfficerEvaluationItem> Evaluations, decimal OverallScore, bool Passed)> EvaluateAnswersAsync(
        List<InternalQuestionItem> expectedQuestions,
        List<string> submittedAnswers,
        CancellationToken cancellationToken)
    {
        var sb = new StringBuilder();
        for (var i = 0; i < expectedQuestions.Count; i++)
        {
            var q = expectedQuestions[i];
            var studentAns = i < submittedAnswers.Count ? submittedAnswers[i] : string.Empty;
            sb.AppendLine($"Question {q.Id}: \"{q.Question}\"");
            sb.AppendLine($"Expected Detail/Answer: \"{q.Answer}\"");
            sb.AppendLine($"Student Submitted Answer: \"{studentAns}\"");
            sb.AppendLine();
        }

        var prompt = EvaluationPromptTemplate.Replace("{QA_PAIRS}", sb.ToString());

        try
        {
            var rawJson = await CallGeminiAsync(prompt, cancellationToken);
            if (!string.IsNullOrWhiteSpace(rawJson))
            {
                using var doc = JsonDocument.Parse(rawJson);
                var root = doc.RootElement;

                var overallScore = root.TryGetProperty("overallScore", out var os) ? os.GetDecimal() : 0m;
                var passed = root.TryGetProperty("passed", out var p) && p.GetBoolean();

                var evalList = new List<InternalOfficerEvaluationItem>();
                if (root.TryGetProperty("evaluations", out var evalsArray) && evalsArray.ValueKind == JsonValueKind.Array)
                {
                    foreach (var elem in evalsArray.EnumerateArray())
                    {
                        var id = elem.TryGetProperty("id", out var idProp) ? idProp.GetInt32() : evalList.Count + 1;
                        var matched = elem.TryGetProperty("matched", out var mProp) && mProp.GetBoolean();
                        var conf = elem.TryGetProperty("confidence", out var cProp) ? cProp.GetDecimal() : (matched ? 0.9m : 0.2m);
                        var reasoning = elem.TryGetProperty("reasoning", out var rProp) ? rProp.GetString() ?? "" : "";

                        var matchingQuestion = expectedQuestions.FirstOrDefault(q => q.Id == id)
                            ?? expectedQuestions.ElementAtOrDefault(evalList.Count)
                            ?? new InternalQuestionItem();

                        var studentAns = (id - 1 < submittedAnswers.Count && id - 1 >= 0) ? submittedAnswers[id - 1] : "";

                        evalList.Add(new InternalOfficerEvaluationItem
                        {
                            Id = id,
                            Question = matchingQuestion.Question,
                            ExpectedAnswer = matchingQuestion.Answer,
                            StudentAnswer = studentAns,
                            Matched = matched,
                            Confidence = conf,
                            Reasoning = reasoning
                        });
                    }
                }

                if (evalList.Count == expectedQuestions.Count)
                {
                    return (evalList, Math.Clamp(overallScore, 0m, 1m), passed);
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Gemini answer evaluation failed. Falling back to deterministic fuzzy semantic evaluation.");
        }

        // Fallback evaluation: Fuzzy token overlap & semantic substring matching
        return DeterministicEvaluate(expectedQuestions, submittedAnswers);
    }

    private static (List<InternalOfficerEvaluationItem> Evaluations, decimal OverallScore, bool Passed) DeterministicEvaluate(
        List<InternalQuestionItem> expectedQuestions,
        List<string> submittedAnswers)
    {
        var evalList = new List<InternalOfficerEvaluationItem>();
        var totalScore = 0m;

        for (var i = 0; i < expectedQuestions.Count; i++)
        {
            var q = expectedQuestions[i];
            var studentAns = i < submittedAnswers.Count ? (submittedAnswers[i] ?? "").Trim() : "";

            var score = CalculateSimilarity(studentAns, q.Answer);
            var matched = score >= 0.35m;

            totalScore += score;
            evalList.Add(new InternalOfficerEvaluationItem
            {
                Id = q.Id,
                Question = q.Question,
                ExpectedAnswer = q.Answer,
                StudentAnswer = studentAns,
                Matched = matched,
                Confidence = Math.Round(score, 2),
                Reasoning = matched
                    ? "Substantial overlap with reported item details."
                    : string.IsNullOrWhiteSpace(studentAns) ? "No answer provided." : "Insufficient match with reported intake details."
            });
        }

        var avgScore = expectedQuestions.Count > 0 ? totalScore / expectedQuestions.Count : 0m;
        var passed = avgScore >= 0.45m && evalList.Count(e => e.Matched) >= 2;

        return (evalList, Math.Clamp(avgScore, 0m, 1m), passed);
    }

    private static decimal CalculateSimilarity(string studentAnswer, string expectedAnswer)
    {
        if (string.IsNullOrWhiteSpace(studentAnswer) || string.IsNullOrWhiteSpace(expectedAnswer))
            return 0m;

        var sNorm = Normalize(studentAnswer);
        var eNorm = Normalize(expectedAnswer);

        if (sNorm == eNorm || sNorm.Contains(eNorm) || eNorm.Contains(sNorm))
            return 0.95m;

        var sTokens = Tokenize(sNorm);
        var eTokens = Tokenize(eNorm);

        if (sTokens.Count == 0 || eTokens.Count == 0)
            return 0m;

        var intersection = sTokens.Intersect(eTokens).Count();
        if (intersection > 0)
        {
            var recall = (decimal)intersection / eTokens.Count;
            var precision = (decimal)intersection / sTokens.Count;
            var jaccard = (decimal)intersection / sTokens.Union(eTokens).Count();
            return Math.Clamp(Math.Max(Math.Max(recall, precision * 0.9m), jaccard), 0m, 1m);
        }

        return 0m;
    }

    private static string Normalize(string text)
    {
        return Regex.Replace(text.ToLowerInvariant(), @"[^\w\s]", " ").Trim();
    }

    private static HashSet<string> Tokenize(string text)
    {
        string[] stopWords = ["the", "a", "an", "it", "was", "is", "my", "in", "on", "with", "and", "or", "to", "of"];
        return text.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length > 2 && !stopWords.Contains(t))
            .ToHashSet();
    }

    // ── HTTP Call to Gemini ───────────────────────────────────────────────────

    private async Task<string?> CallGeminiAsync(string prompt, CancellationToken cancellationToken)
    {
        var apiKey = configuration["Gemini:ApiKey"];
        var model = configuration["Gemini:Model"] ?? "gemini-2.0-flash";

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey is "YOUR_GEMINI_API_KEY_HERE")
        {
            logger.LogWarning("Gemini API key is not configured; using fallback logic.");
            return null;
        }

        var requestBody = new
        {
            contents = new[] { new { parts = new[] { new { text = prompt } } } },
            generationConfig = new { temperature = 0.2, maxOutputTokens = 1024 }
        };

        var url = string.Format(GeminiUrlTemplate, model, apiKey);
        using var client = httpClientFactory.CreateClient("Gemini");
        using var content = new StringContent(
            JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(10));

        using var response = await client.PostAsync(url, content, cts.Token);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cts.Token);
            logger.LogWarning("Gemini API error {StatusCode}: {Error}", response.StatusCode, err);
            return null;
        }

        var rawJson = await response.Content.ReadAsStringAsync(cts.Token);
        using var doc = JsonDocument.Parse(rawJson);

        var text = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString();

        return CleanMarkdownJson(text);
    }

    private static string? CleanMarkdownJson(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;

        var cleaned = text.Trim();
        if (cleaned.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            cleaned = cleaned[7..];
        }
        else if (cleaned.StartsWith("```"))
        {
            cleaned = cleaned[3..];
        }

        if (cleaned.EndsWith("```"))
        {
            cleaned = cleaned[..^3];
        }

        return cleaned.Trim();
    }

    private static List<InternalQuestionItem> ParseQuestionsJson(string rawJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(rawJson);
            if (doc.RootElement.TryGetProperty("questions", out var qArray) && qArray.ValueKind == JsonValueKind.Array)
            {
                var list = new List<InternalQuestionItem>();
                var idx = 1;
                foreach (var q in qArray.EnumerateArray())
                {
                    var questionText = q.TryGetProperty("question", out var qProp) ? qProp.GetString() : null;
                    var answerText = q.TryGetProperty("answer", out var aProp) ? aProp.GetString() : null;
                    var typeText = q.TryGetProperty("type", out var tProp) ? tProp.GetString() : "text";

                    if (!string.IsNullOrWhiteSpace(questionText) && !string.IsNullOrWhiteSpace(answerText))
                    {
                        list.Add(new InternalQuestionItem
                        {
                            Id = idx++,
                            Question = questionText.Trim(),
                            Answer = answerText.Trim(),
                            Type = string.IsNullOrWhiteSpace(typeText) ? "text" : typeText.Trim()
                        });
                    }
                }
                return list;
            }
        }
        catch
        {
            // Invalid JSON
        }
        return [];
    }

    private static IReadOnlyList<VerificationQuestionDto> DeserializePublicQuestions(string publicJson)
    {
        try
        {
            return JsonSerializer.Deserialize<List<VerificationQuestionDto>>(publicJson) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private class InternalQuestionItem
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("question")]
        public string Question { get; set; } = string.Empty;

        [JsonPropertyName("answer")]
        public string Answer { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = "text";
    }

    private class InternalOfficerEvaluationItem
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("question")]
        public string Question { get; set; } = string.Empty;

        [JsonPropertyName("expectedAnswer")]
        public string ExpectedAnswer { get; set; } = string.Empty;

        [JsonPropertyName("studentAnswer")]
        public string StudentAnswer { get; set; } = string.Empty;

        [JsonPropertyName("matched")]
        public bool Matched { get; set; }

        [JsonPropertyName("confidence")]
        public decimal Confidence { get; set; }

        [JsonPropertyName("reasoning")]
        public string Reasoning { get; set; } = string.Empty;
    }
}

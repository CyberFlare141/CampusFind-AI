using System.Text.Json;
using System.Security.Cryptography;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;

namespace CampusFindAI.Api.Services;

/// <summary>Binds the finder's private three-answer evidence to an authenticated owner's AI match.</summary>
public sealed class OwnershipVerificationService(
    IClaimRepository claims, IFoundItemRepository foundItems, IMatchRepository matches,
    IClaimVerificationRepository verifications, IUserRepository users, IAuditLogService audit,
    INotificationService notifications, IDataProtectionProvider protection,
    IOptions<OwnershipVerificationOptions> options) : IOwnershipVerificationService
{
    private readonly OwnershipVerificationOptions _options = options.Value;
    private readonly IDataProtector _protector = protection.CreateProtector("CampusFindAI.OwnershipVerification.v4");

    public async Task<OwnershipVerificationStatusDto> GetStatusAsync(Guid matchId, string userId, CancellationToken ct = default)
    {
        var match = await OwnedMatch(matchId, userId, ct);
        var verification = await verifications.GetByMatchIdAsync(matchId, ct);
        // MatchRepository only loads the public match projection. Founder answers
        // are private report evidence, so check the complete found-item record.
        var found = await foundItems.GetByIdAsync(match.FoundItemId, ct);
        var finderReady = FinderReady(found);
        var eligible = Eligible(match) && finderReady;
        var approved = verification?.Status == "Approved";
        var message = !finderReady
            ? "Ownership verification is not available because the finder has not completed the required verification information."
            : verification?.Status switch
            {
                "PendingSecurityReview" => "Your answers are waiting for review by a Security Officer.",
                "Approved" => "Ownership verification approved by Security Officer.",
                "Rejected" => verification.AttemptCount < verification.MaxAttempts ? "Ownership verification was not approved. You may try again." : "Ownership verification attempts exhausted.",
                "AttemptsExhausted" => "Ownership verification attempts exhausted.",
                _ when eligible => "Ownership verification is ready.",
                _ => "Ownership verification is unavailable for this match."
            };
        return new()
        {
            MatchId = matchId, Eligible = eligible,
            // An unfinished verification is safe to reopen: StartForMatchAsync
            // returns the same match-bound record and does not create a new claim.
            CanStart = eligible && (verification is null || verification.Status == "InProgress" || (verification.Status == "Rejected" && verification.AttemptCount < verification.MaxAttempts)),
            CanAccessHandoverChat = approved, Status = verification?.Status ?? (eligible ? "Ready" : "Unavailable"),
            MatchConfidenceScore = match.ConfidenceScore, AttemptCount = verification?.AttemptCount ?? 0,
            MaxAttempts = verification?.MaxAttempts ?? _options.MaxAttempts, Message = message
        };
    }

    public async Task<ClaimVerificationResponseDto> StartForMatchAsync(Guid matchId, string userId, CancellationToken ct = default)
    {
        var match = await OwnedMatch(matchId, userId, ct);
        if (!Eligible(match)) throw new InvalidOperationException("Ownership verification is unavailable for this AI match.");
        var found = await foundItems.GetByIdAsync(match.FoundItemId, ct) ?? throw new KeyNotFoundException("Found item not found.");
        var founderAnswers = OwnershipVerificationQuestions.ReadFounderAnswers(found.FounderVerificationAnswersJson);
        if (founderAnswers.Count != OwnershipVerificationQuestions.All.Count)
            throw new InvalidOperationException("Ownership verification is not available because the finder has not completed the required verification information.");

        var existing = await verifications.GetByMatchIdAsync(matchId, ct);
        if (existing is not null && existing.Status is not "Rejected") return Public(existing, match);
        if (existing?.Status == "Rejected" && existing.AttemptCount >= existing.MaxAttempts)
        {
            existing.Status = "AttemptsExhausted";
            await verifications.UpdateAsync(existing, ct);
            throw new InvalidOperationException("Verification attempts are exhausted.");
        }

        var claim = (await claims.GetByClaimantIdAsync(userId, ct)).FirstOrDefault(x => x.FoundItemId == match.FoundItemId);
        if (claim is null)
        {
            claim = new Claim { Id = Guid.NewGuid(), FoundItemId = match.FoundItemId, ClaimantUserId = userId, Status = "Pending", CreatedAt = DateTime.UtcNow };
            await claims.AddAsync(claim, ct);
            await claims.SaveChangesAsync(ct);
        }

        // Snapshot the finder's answers at claim start. Security review never reads mutable report data.
        var snapshot = OwnershipVerificationQuestions.All.Select(question => new OwnershipQuestion(question.Id, question.Question,
            founderAnswers.Single(answer => answer.QuestionId == question.Id).Answer, question.Type)).ToList();
        var verification = existing ?? new ClaimVerification { Id = Guid.NewGuid(), ClaimId = claim.Id, MatchId = matchId, LostItemId = match.LostItemId, MaxAttempts = _options.MaxAttempts, CreatedAt = DateTime.UtcNow };
        verification.SecureQuestionsPayload = _protector.Protect(JsonSerializer.Serialize(snapshot));
        verification.PublicQuestionsJson = JsonSerializer.Serialize(OwnershipVerificationQuestions.All);
        verification.TotalQuestions = snapshot.Count;
        verification.Status = "InProgress";
        verification.Passed = false;
        verification.SubmittedAnswersJson = null;
        verification.SecurityReviewedAt = null;
        verification.SecurityReviewedByUserId = null;
        verification.SecurityReviewNote = null;
        if (existing is null) await verifications.AddAsync(verification, ct); else await verifications.UpdateAsync(verification, ct);
        await audit.LogAsync(userId, existing is null ? "VerificationStarted" : "VerificationRetryStarted", $"Ownership verification started for match {matchId}.", ct);
        return Public(verification, match);
    }

    public async Task<SubmitVerificationResponseDto> SubmitForMatchAsync(Guid matchId, string userId, SubmitVerificationRequestDto request, CancellationToken ct = default)
    {
        var match = await OwnedMatch(matchId, userId, ct);
        if (!Current(match)) throw new InvalidOperationException("This match is no longer active.");
        var verification = await verifications.GetByMatchIdAsync(matchId, ct) ?? throw new InvalidOperationException("Verification has not been started from this AI match.");
        if (verification.Status != "InProgress") throw new InvalidOperationException("This verification cannot be edited after submission.");
        var answers = OwnershipVerificationQuestions.NormalizeAnswers(request.Answers);
        verification.SubmittedAnswersJson = _protector.Protect(JsonSerializer.Serialize(answers));
        verification.AttemptCount++;
        verification.Status = "PendingSecurityReview";
        verification.SubmittedAt = DateTime.UtcNow;
        verification.Passed = false;
        verification.ConfidenceScore = null;
        verification.MatchedCount = null;
        verification.EvaluationResultJson = null;
        await verifications.UpdateAsync(verification, ct);
        await audit.LogAsync(userId, "VerificationSubmitted", $"Ownership verification submitted for Security review for match {matchId}.", ct);
        foreach (var officer in (await users.GetByRoleAsync(UserRole.SecurityOfficer, ct)).Concat(await users.GetByRoleAsync(UserRole.Administrator, ct)).DistinctBy(x => x.Id))
            await notifications.CreateAsync(officer.Id, $"Ownership verification requires review for Claim #{verification.ClaimId.ToString("N")[..8].ToUpperInvariant()}.", "/security/ownership-verifications", "verification-review", ct);
        return new() { Status = verification.Status, AttemptsRemaining = Math.Max(0, verification.MaxAttempts - verification.AttemptCount), CanAccessHandoverChat = false, Message = "Ownership verification submitted. Your answers are waiting for review by a Security Officer." };
    }

    public async Task<IReadOnlyList<OfficerVerificationReviewDto>> GetPendingSecurityReviewsAsync(CancellationToken ct = default)
    {
        var reviews = new List<OfficerVerificationReviewDto>();
        foreach (var verification in await verifications.GetPendingSecurityReviewAsync(ct))
        {
            try { reviews.Add(await SecurityReview(verification, ct)); }
            catch { /* a corrupt legacy record must not hide other reviews */ }
        }
        return reviews;
    }

    public async Task<OfficerVerificationReviewDto> GetSecurityReviewAsync(Guid verificationId, CancellationToken ct = default)
    {
        var verification = (await verifications.GetPendingSecurityReviewAsync(ct)).FirstOrDefault(x => x.Id == verificationId) ?? throw new KeyNotFoundException("Verification not found or is not pending review.");
        return await SecurityReview(verification, ct);
    }

    public async Task<OfficerVerificationReviewDto> DecideSecurityReviewAsync(Guid verificationId, string officerId, bool approve, string? note, CancellationToken ct = default)
    {
        var verification = (await verifications.GetPendingSecurityReviewAsync(ct)).FirstOrDefault(x => x.Id == verificationId) ?? throw new InvalidOperationException("Verification is not pending Security review.");
        var match = await matches.GetByIdAsync(verification.MatchId!.Value, ct) ?? throw new KeyNotFoundException("AI match not found.");
        var claim = await claims.GetByIdAsync(verification.ClaimId, ct) ?? throw new KeyNotFoundException("Claim not found.");
        if (approve)
        {
            var alreadyApproved = await claims.GetByFoundItemIdAsync(claim.FoundItemId, ct);
            if (alreadyApproved.Any(existing => existing.Id != claim.Id && existing.Status is "Approved" or "Returned"))
                throw new InvalidOperationException("Another claim for this item has already been approved or handed over.");

            claim.ReviewedByUserId = officerId;
            claim.ReviewedAt = DateTime.UtcNow;
            claim.DecisionNotes = note?.Trim();
            claim.HandoverQrToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
            claim.HandoverQrCreatedAt = DateTime.UtcNow;
            if (!await claims.TryApproveAsync(claim, ct))
                throw new InvalidOperationException("This claim can no longer be approved because the item has another completed approval.");
            claim.Status = "Approved";
            await foundItems.UpdateStatusAsync(claim.FoundItemId, "Claimed", ct);
        }

        verification.Status = approve ? "Approved" : verification.AttemptCount >= verification.MaxAttempts ? "AttemptsExhausted" : "Rejected";
        verification.Passed = approve;
        verification.PassedAt = approve ? DateTime.UtcNow : null;
        verification.SecurityReviewedByUserId = officerId;
        verification.SecurityReviewedAt = DateTime.UtcNow;
        verification.SecurityReviewNote = note?.Trim();
        await verifications.UpdateAsync(verification, ct);
        await audit.LogAsync(officerId, approve ? "VerificationSecurityApproved" : "VerificationSecurityRejected", $"Security reviewed ownership verification {verification.Id}; approved={approve}.", ct);
        await notifications.CreateAsync(match.LostItem!.UserId, approve ? $"Your claim for {claim.FoundItem?.Title ?? "the found item"} was approved. You can now contact the finder to arrange handover." : "Ownership verification was not approved by Security.", "/my-claims", approve ? "verification-approved" : "verification-rejected", ct);
        if (approve)
        {
            await notifications.CreateAsync(match.FoundItem!.UserId, $"An ownership claim for {claim.FoundItem?.Title ?? "your found item"} was approved. You can now contact the owner to arrange handover.", $"/found-items/{claim.FoundItemId}", "verification-approved", ct);
            await audit.LogAsync(officerId, "HandoverChatUnlocked", $"Handover chat eligibility unlocked for match {match.Id}.", ct);
        }
        return await SecurityReview(verification, ct);
    }

    public async Task<bool> CanAccessHandoverChatAsync(Guid matchId, string userId, CancellationToken ct = default) => (await GetStatusAsync(matchId, userId, ct)).CanAccessHandoverChat;

    // Legacy endpoints can only continue an already match-bound verification; they cannot create a general-found-item claim.
    public async Task<ClaimVerificationResponseDto> GetOrGenerateVerificationAsync(Guid claimId, string userId, CancellationToken ct = default)
    {
        var verification = await verifications.GetByClaimIdAsync(claimId, ct) ?? throw new InvalidOperationException("Use an eligible AI match to start verification.");
        return await StartForMatchAsync(verification.MatchId!.Value, userId, ct);
    }
    public async Task<SubmitVerificationResponseDto> SubmitVerificationAsync(Guid claimId, string userId, SubmitVerificationRequestDto request, CancellationToken ct = default)
    {
        var verification = await verifications.GetByClaimIdAsync(claimId, ct) ?? throw new InvalidOperationException("Verification not found.");
        return await SubmitForMatchAsync(verification.MatchId!.Value, userId, request, ct);
    }
    public async Task<OfficerVerificationReviewDto> GetOfficerReviewAsync(Guid claimId, CancellationToken ct = default)
    {
        var verification = await verifications.GetByClaimIdAsync(claimId, ct) ?? throw new KeyNotFoundException("Verification not found.");
        return await SecurityReview(verification, ct);
    }

    private async Task<OfficerVerificationReviewDto> SecurityReview(ClaimVerification verification, CancellationToken ct)
    {
        var claim = await claims.GetReviewByIdAsync(verification.ClaimId, ct) ?? throw new KeyNotFoundException("Claim not found.");
        var found = await foundItems.GetByIdAsync(claim.FoundItemId, ct) ?? throw new KeyNotFoundException("Found item not found.");
        var match = await matches.GetByIdAsync(verification.MatchId!.Value, ct) ?? throw new KeyNotFoundException("AI match not found.");
        var questions = DecryptQuestions(verification);
        var answers = DecryptAnswers(verification);
        return new()
        {
            VerificationId = verification.Id, ClaimId = claim.Id, ClaimNumber = $"CF-{claim.Id.ToString("N")[..8].ToUpperInvariant()}", FoundItemTitle = found.Title,
            StudentName = claim.ClaimantUser?.UserProfile?.FullName ?? string.Empty, StudentEmail = claim.ClaimantUser?.Email ?? claim.ClaimantUserId,
            FinderName = claim.FoundItem?.User?.UserProfile?.FullName, FinderEmail = claim.FoundItem?.User?.Email ?? found.UserId,
            MatchConfidenceScore = match.ConfidenceScore, Status = verification.Status, TotalQuestions = verification.TotalQuestions,
            AttemptCount = verification.AttemptCount, MaxAttempts = verification.MaxAttempts, SubmittedAt = verification.SubmittedAt,
            SecurityReviewedByUserId = verification.SecurityReviewedByUserId, SecurityReviewedAt = verification.SecurityReviewedAt, SecurityReviewNote = verification.SecurityReviewNote,
            Questions = questions.Select((question, index) => new OfficerQuestionEvaluationDto { Id = question.Id, Question = question.Question, FounderAnswer = question.ExpectedAnswer, OwnerAnswer = index < answers.Count ? answers[index] : null }).ToList()
        };
    }

    private async Task<Match> OwnedMatch(Guid id, string userId, CancellationToken ct)
    {
        var match = await matches.GetByIdAsync(id, ct) ?? throw new KeyNotFoundException("AI match not found.");
        if (match.LostItem?.UserId != userId || match.FoundItem?.UserId == userId) throw new UnauthorizedAccessException("Only the owner of the linked lost report may verify.");
        return match;
    }
    private bool Eligible(Match match) => (match.ConfidenceScore > 1 ? match.ConfidenceScore / 100 : match.ConfidenceScore) >= _options.MatchEligibilityThreshold && Current(match);
    private static bool Current(Match match) => match.LostItem?.Status == "Open" && match.FoundItem?.Status == "Available";
    private static bool FinderReady(FoundItem? foundItem) => foundItem is not null && OwnershipVerificationQuestions.ReadFounderAnswers(foundItem.FounderVerificationAnswersJson).Count == OwnershipVerificationQuestions.All.Count;
    private List<OwnershipQuestion> DecryptQuestions(ClaimVerification verification)
    {
        try { if (!string.IsNullOrWhiteSpace(verification.SecureQuestionsPayload)) return JsonSerializer.Deserialize<List<OwnershipQuestion>>(_protector.Unprotect(verification.SecureQuestionsPayload)) ?? []; } catch { }
        try { return JsonSerializer.Deserialize<List<VerificationQuestionDto>>(verification.PublicQuestionsJson)?.Select(question => new OwnershipQuestion(question.Id, question.Question, string.Empty, question.Type)).ToList() ?? []; } catch { return []; }
    }
    private List<string> DecryptAnswers(ClaimVerification verification)
    {
        try { return string.IsNullOrWhiteSpace(verification.SubmittedAnswersJson) ? [] : JsonSerializer.Deserialize<List<string>>(_protector.Unprotect(verification.SubmittedAnswersJson)) ?? []; } catch { return []; }
    }
    private static ClaimVerificationResponseDto Public(ClaimVerification verification, Match match) => new()
    {
        ClaimId = verification.ClaimId, MatchId = verification.MatchId, Status = verification.Status, TotalQuestions = verification.TotalQuestions,
        AttemptCount = verification.AttemptCount, MaxAttempts = verification.MaxAttempts, IsSubmitted = verification.Status == "PendingSecurityReview",
        FallbackUsed = false, CanAccessHandoverChat = verification.Status == "Approved",
        Questions = JsonSerializer.Deserialize<List<VerificationQuestionDto>>(verification.PublicQuestionsJson) ?? []
    };
}

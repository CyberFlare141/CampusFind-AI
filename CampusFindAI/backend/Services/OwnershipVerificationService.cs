using System.Text.Json;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;

namespace CampusFindAI.Api.Services;

/// <summary>AI creates safe questions; Security Officers alone decide ownership approval.</summary>
public sealed class OwnershipVerificationService(
    IClaimRepository claims, IFoundItemRepository foundItems, IMatchRepository matches, IClaimVerificationRepository verifications,
    IUserRepository users, IAuditLogService audit, INotificationService notifications, IDataProtectionProvider protection,
    IOwnershipQuestionGenerator generator, IOptions<OwnershipVerificationOptions> options) : IOwnershipVerificationService
{
    private readonly OwnershipVerificationOptions _options = options.Value;
    private readonly IDataProtector _protector = protection.CreateProtector("CampusFindAI.OwnershipVerification.v3");

    public async Task<OwnershipVerificationStatusDto> GetStatusAsync(Guid matchId, string userId, CancellationToken ct = default)
    {
        var match = await OwnedMatch(matchId, userId, ct); var v = await verifications.GetByMatchIdAsync(matchId, ct); var eligible = Eligible(match);
        var approved = v?.Status == "Approved" && Current(match);
        var message = v?.Status switch { "PendingSecurityReview" => "Your answers are waiting for review by a Security Officer.", "Approved" => "Ownership verification approved by Security Officer.", "Rejected" => v.AttemptCount < v.MaxAttempts ? "Ownership verification was not approved. You may try again." : "Ownership verification attempts exhausted.", "AttemptsExhausted" => "Ownership verification attempts exhausted.", _ when eligible => "Eligible for ownership verification.", _ => "Ownership verification unavailable for this match." };
        return new() { MatchId = matchId, Eligible = eligible, CanStart = eligible && (v is null || (v.Status == "Rejected" && v.AttemptCount < v.MaxAttempts)), CanAccessHandoverChat = approved, Status = v?.Status ?? (eligible ? "Eligible" : "Unavailable"), MatchConfidenceScore = match.ConfidenceScore, AttemptCount = v?.AttemptCount ?? 0, MaxAttempts = v?.MaxAttempts ?? _options.MaxAttempts, Message = message };
    }

    public async Task<ClaimVerificationResponseDto> StartForMatchAsync(Guid matchId, string userId, CancellationToken ct = default)
    {
        var match = await OwnedMatch(matchId, userId, ct); if (!Eligible(match)) throw new InvalidOperationException("Ownership verification is unavailable for this AI match.");
        var existing = await verifications.GetByMatchIdAsync(matchId, ct);
        if (existing is not null && existing.Status is not "Rejected") return Public(existing, false, match);
        if (existing?.Status == "Rejected" && existing.AttemptCount >= existing.MaxAttempts) { existing.Status = "AttemptsExhausted"; await verifications.UpdateAsync(existing, ct); throw new InvalidOperationException("Verification attempts are exhausted."); }
        var found = await foundItems.GetByIdAsync(match.FoundItemId, ct) ?? throw new KeyNotFoundException("Found item not found.");
        if (string.IsNullOrWhiteSpace(found.PrivateVerificationDetails)) throw new InvalidOperationException("The finder did not provide private verification details.");
        var claim = (await claims.GetByClaimantIdAsync(userId, ct)).FirstOrDefault(x => x.FoundItemId == match.FoundItemId);
        if (claim is null) { claim = new Claim { Id = Guid.NewGuid(), FoundItemId = match.FoundItemId, ClaimantUserId = userId, Status = "Pending", CreatedAt = DateTime.UtcNow }; await claims.AddAsync(claim, ct); await claims.SaveChangesAsync(ct); }
        var generated = await generator.GenerateAsync(found.PrivateVerificationDetails, _options.QuestionCount, ct);
        if (generated.Questions.Count != _options.QuestionCount) throw new InvalidOperationException("Questions could not be generated safely.");
        var v = existing ?? new ClaimVerification { Id = Guid.NewGuid(), ClaimId = claim.Id, MatchId = matchId, LostItemId = match.LostItemId, MaxAttempts = _options.MaxAttempts, CreatedAt = DateTime.UtcNow };
        v.SecureQuestionsPayload = _protector.Protect(JsonSerializer.Serialize(generated.Questions)); v.PublicQuestionsJson = JsonSerializer.Serialize(generated.Questions.Select((q, i) => new VerificationQuestionDto { Id = i + 1, Question = q.Question, Type = q.Type })); v.TotalQuestions = generated.Questions.Count; v.Status = "InProgress"; v.Passed = false; v.SubmittedAnswersJson = null; v.SecurityReviewedAt = null; v.SecurityReviewedByUserId = null; v.SecurityReviewNote = null;
        if (existing is null) await verifications.AddAsync(v, ct); else await verifications.UpdateAsync(v, ct);
        await audit.LogAsync(userId, existing is null ? "VerificationStarted" : "VerificationRetryStarted", $"Ownership verification started for match {matchId}.", ct);
        return Public(v, generated.FallbackUsed, match);
    }

    public async Task<SubmitVerificationResponseDto> SubmitForMatchAsync(Guid matchId, string userId, SubmitVerificationRequestDto request, CancellationToken ct = default)
    {
        var match = await OwnedMatch(matchId, userId, ct); if (!Current(match)) throw new InvalidOperationException("This match is no longer active.");
        var v = await verifications.GetByMatchIdAsync(matchId, ct) ?? throw new InvalidOperationException("Verification has not been started.");
        if (v.Status != "InProgress") throw new InvalidOperationException("This verification cannot be edited after submission.");
        var answers = Answers(request.Answers, v.TotalQuestions);
        v.SubmittedAnswersJson = _protector.Protect(JsonSerializer.Serialize(answers)); v.AttemptCount++; v.Status = "PendingSecurityReview"; v.SubmittedAt = DateTime.UtcNow; v.Passed = false; v.ConfidenceScore = null; v.MatchedCount = null; v.EvaluationResultJson = null;
        await verifications.UpdateAsync(v, ct); await audit.LogAsync(userId, "VerificationSubmitted", $"Ownership verification submitted for Security review for match {matchId}.", ct);
        foreach (var officer in (await users.GetByRoleAsync(UserRole.SecurityOfficer, ct)).Concat(await users.GetByRoleAsync(UserRole.Administrator, ct)).DistinctBy(x => x.Id)) await notifications.CreateAsync(officer.Id, $"Ownership verification requires review for Claim #{v.ClaimId.ToString("N")[..8].ToUpperInvariant()}.", ct);
        return new() { Status = v.Status, AttemptsRemaining = Math.Max(0, v.MaxAttempts - v.AttemptCount), CanAccessHandoverChat = false, Message = "Ownership verification submitted. Your answers are waiting for review by a Security Officer." };
    }

    public async Task<IReadOnlyList<OfficerVerificationReviewDto>> GetPendingSecurityReviewsAsync(CancellationToken ct = default) => await Task.WhenAll((await verifications.GetPendingSecurityReviewAsync(ct)).Select(v => SecurityReview(v, ct)));
    public async Task<OfficerVerificationReviewDto> GetSecurityReviewAsync(Guid verificationId, CancellationToken ct = default) { var v = (await verifications.GetPendingSecurityReviewAsync(ct)).FirstOrDefault(x => x.Id == verificationId) ?? throw new KeyNotFoundException("Verification not found or is not pending review."); return await SecurityReview(v, ct); }
    public async Task<OfficerVerificationReviewDto> DecideSecurityReviewAsync(Guid verificationId, string officerId, bool approve, string? note, CancellationToken ct = default)
    {
        var v = (await verifications.GetPendingSecurityReviewAsync(ct)).FirstOrDefault(x => x.Id == verificationId) ?? throw new InvalidOperationException("Verification is not pending Security review.");
        var match = await matches.GetByIdAsync(v.MatchId!.Value, ct) ?? throw new KeyNotFoundException("AI match not found.");
        v.Status = approve ? "Approved" : v.AttemptCount >= v.MaxAttempts ? "AttemptsExhausted" : "Rejected"; v.Passed = approve; v.PassedAt = approve ? DateTime.UtcNow : null; v.SecurityReviewedByUserId = officerId; v.SecurityReviewedAt = DateTime.UtcNow; v.SecurityReviewNote = note?.Trim(); await verifications.UpdateAsync(v, ct);
        await audit.LogAsync(officerId, approve ? "VerificationSecurityApproved" : "VerificationSecurityRejected", $"Security reviewed ownership verification {v.Id}; approved={approve}.", ct);
        await notifications.CreateAsync(match.LostItem!.UserId, approve ? "Ownership verification approved. Secure handover chat is now available." : "Ownership verification was not approved by Security.", ct);
        if (approve) { await notifications.CreateAsync(match.FoundItem!.UserId, "Ownership verification for your found item was approved. Secure handover chat is now available.", ct); await audit.LogAsync(officerId, "HandoverChatUnlocked", $"Handover chat eligibility unlocked for match {match.Id}.", ct); }
        return await SecurityReview(v, ct);
    }
    public Task<bool> CanAccessHandoverChatAsync(Guid matchId, string userId, CancellationToken ct = default) => CanChat(matchId, userId, ct);
    private async Task<bool> CanChat(Guid id, string user, CancellationToken ct) { var s = await GetStatusAsync(id, user, ct); return s.CanAccessHandoverChat; }
    public Task<ClaimVerificationResponseDto> GetOrGenerateVerificationAsync(Guid claimId, string userId, CancellationToken ct = default) => LegacyStart(claimId, userId, ct);
    private async Task<ClaimVerificationResponseDto> LegacyStart(Guid claimId, string userId, CancellationToken ct) { var v = await verifications.GetByClaimIdAsync(claimId, ct) ?? throw new InvalidOperationException("Use an eligible AI match to start verification."); return await StartForMatchAsync(v.MatchId!.Value, userId, ct); }
    public Task<SubmitVerificationResponseDto> SubmitVerificationAsync(Guid claimId, string userId, SubmitVerificationRequestDto request, CancellationToken ct = default) => LegacySubmit(claimId, userId, request, ct);
    private async Task<SubmitVerificationResponseDto> LegacySubmit(Guid claimId, string userId, SubmitVerificationRequestDto request, CancellationToken ct) { var v = await verifications.GetByClaimIdAsync(claimId, ct) ?? throw new InvalidOperationException("Verification not found."); return await SubmitForMatchAsync(v.MatchId!.Value, userId, request, ct); }
    public async Task<OfficerVerificationReviewDto> GetOfficerReviewAsync(Guid claimId, CancellationToken ct = default) { var v = await verifications.GetByClaimIdAsync(claimId, ct) ?? throw new KeyNotFoundException("Verification not found."); return await SecurityReview(v, ct); }
    private async Task<OfficerVerificationReviewDto> SecurityReview(ClaimVerification v, CancellationToken ct)
    {
        var claim = await claims.GetReviewByIdAsync(v.ClaimId, ct) ?? throw new KeyNotFoundException("Claim not found."); var found = await foundItems.GetByIdAsync(claim.FoundItemId, ct) ?? throw new KeyNotFoundException("Found item not found."); var match = await matches.GetByIdAsync(v.MatchId!.Value, ct) ?? throw new KeyNotFoundException("AI match not found.");
        var qs = DecryptQuestions(v); var answers = DecryptAnswers(v); return new() { VerificationId = v.Id, ClaimId = claim.Id, ClaimNumber = $"CF-{claim.Id.ToString("N")[..8].ToUpperInvariant()}", FoundItemTitle = found.Title, StudentName = claim.ClaimantUser?.UserProfile?.FullName ?? string.Empty, StudentEmail = claim.ClaimantUser?.Email ?? claim.ClaimantUserId, FinderName = claim.FoundItem?.User?.UserProfile?.FullName, FinderEmail = claim.FoundItem?.User?.Email ?? found.UserId, PrivateVerificationDetails = found.PrivateVerificationDetails, MatchConfidenceScore = match.ConfidenceScore, Status = v.Status, TotalQuestions = v.TotalQuestions, AttemptCount = v.AttemptCount, MaxAttempts = v.MaxAttempts, SubmittedAt = v.SubmittedAt, SecurityReviewedByUserId = v.SecurityReviewedByUserId, SecurityReviewedAt = v.SecurityReviewedAt, SecurityReviewNote = v.SecurityReviewNote, Questions = qs.Select((q,i) => new OfficerQuestionEvaluationDto { Id=i+1, Question=q.Question, ExpectedAnswer=q.ExpectedAnswer, StudentAnswer=i < answers.Count ? answers[i] : null }).ToList() };
    }
    private async Task<Match> OwnedMatch(Guid id,string user,CancellationToken ct) { var m=await matches.GetByIdAsync(id,ct)??throw new KeyNotFoundException("AI match not found."); if(m.LostItem?.UserId!=user||m.FoundItem?.UserId==user)throw new UnauthorizedAccessException("Only the owner of the linked lost report may verify."); return m; }
    private bool Eligible(Match m)=>(m.ConfidenceScore>1?m.ConfidenceScore/100:m.ConfidenceScore)>=_options.MatchEligibilityThreshold&&Current(m); private static bool Current(Match m)=>m.LostItem?.Status=="Open"&&m.FoundItem?.Status=="Available";
    private static List<string> Answers(List<string>? a,int n){if(a is null||a.Count!=n)throw new InvalidOperationException("Please answer every question.");var x=a.Select(v=>v?.Trim()??"").ToList();if(x.Any(v=>v.Length==0||v.Length>1000||v.Any(char.IsControl)))throw new InvalidOperationException("Each answer must be plain text between 1 and 1000 characters.");return x;}
    private List<OwnershipQuestion> DecryptQuestions(ClaimVerification v){try{return JsonSerializer.Deserialize<List<OwnershipQuestion>>(_protector.Unprotect(v.SecureQuestionsPayload))??[];}catch{throw new InvalidOperationException("Verification data integrity error.");}} private List<string> DecryptAnswers(ClaimVerification v){try{return string.IsNullOrWhiteSpace(v.SubmittedAnswersJson)?[]:JsonSerializer.Deserialize<List<string>>(_protector.Unprotect(v.SubmittedAnswersJson))??[];}catch{throw new InvalidOperationException("Verification answer data integrity error.");}}
    private ClaimVerificationResponseDto Public(ClaimVerification v,bool fallback,Match m)=>new(){ClaimId=v.ClaimId,MatchId=v.MatchId,Status=v.Status,TotalQuestions=v.TotalQuestions,AttemptCount=v.AttemptCount,MaxAttempts=v.MaxAttempts,IsSubmitted=v.Status=="PendingSecurityReview",FallbackUsed=fallback,CanAccessHandoverChat=v.Status=="Approved"&&Current(m),Questions=JsonSerializer.Deserialize<List<VerificationQuestionDto>>(v.PublicQuestionsJson)??[]};
}

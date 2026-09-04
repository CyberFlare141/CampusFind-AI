using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;

namespace CampusFindAI.Api.Services;

public class ClaimService(
    IClaimRepository claimRepository,
    IFoundItemRepository foundItemRepository,
    IImageRepository imageRepository,
    IAuditLogService auditLogService,
    IClaimVerificationRepository verificationRepository) : IClaimService
{
    private const string StatusPending = "Pending";
    private const string StatusApproved = "Approved";
    private const string StatusRejected = "Rejected";

    public async Task<ClaimDto> CreateAsync(
        string claimantUserId,
        CreateClaimDto request,
        CancellationToken cancellationToken = default)
    {
        var foundItem = await foundItemRepository.GetByIdAsync(request.FoundItemId, cancellationToken)
            ?? throw new InvalidOperationException("Found item does not exist.");

        var claim = new Claim
        {
            Id = Guid.NewGuid(),
            FoundItemId = foundItem.Id,
            ClaimantUserId = claimantUserId,
            ClaimantNotes = request.ClaimantNotes?.Trim(),
            Status = StatusPending,
            CreatedAt = DateTime.UtcNow
        };

        await claimRepository.AddAsync(claim, cancellationToken);
        await claimRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogAsync(
            claimantUserId,
            "ClaimSubmitted",
            $"Claim {claim.Id} submitted for found item {foundItem.Id}.",
            cancellationToken);

        var saved = await claimRepository.GetByIdAsync(claim.Id, cancellationToken);
        return MapToDto(saved!);
    }

    public async Task<IReadOnlyList<ClaimDto>> GetPendingAsync(
        CancellationToken cancellationToken = default)
    {
        var claims = await claimRepository.GetByStatusAsync(StatusPending, cancellationToken);
        var dtos = new List<ClaimDto>();
        foreach (var claim in claims)
        {
            var v = await verificationRepository.GetByClaimIdAsync(claim.Id, cancellationToken);
            dtos.Add(MapToDto(claim, v));
        }
        return dtos;
    }

    public async Task<IReadOnlyList<ClaimDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var claims = await claimRepository.GetAllAsync(cancellationToken);
        var dtos = new List<ClaimDto>();
        foreach (var claim in claims)
        {
            var v = await verificationRepository.GetByClaimIdAsync(claim.Id, cancellationToken);
            dtos.Add(MapToDto(claim, v));
        }
        return dtos;
    }

    public async Task<IReadOnlyList<ClaimDto>> GetMyClaimsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var claims = await claimRepository.GetByClaimantIdAsync(userId, cancellationToken);
        var dtos = new List<ClaimDto>();
        foreach (var claim in claims)
        {
            var v = await verificationRepository.GetByClaimIdAsync(claim.Id, cancellationToken);
            dtos.Add(MapToDto(claim, v));
        }
        return dtos;
    }

    public async Task<ClaimDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var claim = await claimRepository.GetByIdAsync(id, cancellationToken);
        if (claim is null) return null;
        var v = await verificationRepository.GetByClaimIdAsync(claim.Id, cancellationToken);
        return MapToDto(claim, v);
    }

    public async Task<ClaimReviewDto?> GetReviewAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var claim = await claimRepository.GetReviewByIdAsync(id, cancellationToken);
        if (claim is null) return null;
        var images = await imageRepository.GetByFoundItemIdsAsync([claim.FoundItemId], cancellationToken);
        var v = await verificationRepository.GetByClaimIdAsync(claim.Id, cancellationToken);
        return new ClaimReviewDto
        {
            Id = claim.Id, FoundItemId = claim.FoundItemId, FoundItemTitle = claim.FoundItem?.Title ?? string.Empty,
            FoundItemDescription = claim.FoundItem?.Description, ClaimantUserId = claim.ClaimantUserId,
            ClaimantEmail = claim.ClaimantUser?.Email ?? string.Empty, ClaimantNotes = claim.ClaimantNotes,
            Status = claim.Status, CreatedAt = claim.CreatedAt, ReviewedByUserId = claim.ReviewedByUserId,
            ReviewedByEmail = claim.ReviewedByUser?.Email, ReviewedAt = claim.ReviewedAt, DecisionNotes = claim.DecisionNotes,
            FoundAt = claim.FoundItem?.FoundAt,
            ImageUrls = images.Select(image => image.Url).ToList(),
            Claimant = MapPerson(claim.ClaimantUser), Reporter = MapPerson(claim.FoundItem?.User),
            VerificationStatus = v?.Status,
            VerificationScore = v?.ConfidenceScore,
            VerificationMatchedCount = v?.MatchedCount,
            VerificationTotalQuestions = v?.TotalQuestions,
            VerificationPassed = v?.Passed,
            VerificationAttemptsRemaining = v is not null ? Math.Max(0, v.MaxAttempts - v.AttemptCount) : null
        };
    }

    public async Task<ClaimDto> DecideAsync(
        Guid claimId,
        string officerUserId,
        ClaimDecisionDto request,
        CancellationToken cancellationToken = default)
    {
        var claim = await claimRepository.GetByIdAsync(claimId, cancellationToken)
            ?? throw new InvalidOperationException("Claim not found.");

        if (claim.Status != StatusPending)
        {
            throw new InvalidOperationException(
                $"This claim has already been {claim.Status.ToLowerInvariant()}.");
        }

        claim.Status = request.Approve ? StatusApproved : StatusRejected;
        claim.ReviewedByUserId = officerUserId;
        claim.ReviewedAt = DateTime.UtcNow;
        claim.DecisionNotes = request.DecisionNotes?.Trim();

        claimRepository.Update(claim);
        await claimRepository.SaveChangesAsync(cancellationToken);

        await auditLogService.LogAsync(
            officerUserId,
            request.Approve ? "ClaimApproved" : "ClaimRejected",
            $"Claim {claim.Id} was {claim.Status.ToLowerInvariant()}.",
            cancellationToken);

        var updated = await claimRepository.GetByIdAsync(claim.Id, cancellationToken);
        return MapToDto(updated!);
    }

    private static ClaimDto MapToDto(Claim claim, ClaimVerification? verification = null)
    {
        return new ClaimDto
        {
            Id = claim.Id,
            FoundItemId = claim.FoundItemId,
            FoundItemTitle = claim.FoundItem?.Title ?? string.Empty,
            FoundItemDescription = claim.FoundItem?.Description,
            ClaimantUserId = claim.ClaimantUserId,
            ClaimantEmail = claim.ClaimantUser?.Email ?? string.Empty,
            ClaimantNotes = claim.ClaimantNotes,
            Status = claim.Status,
            CreatedAt = claim.CreatedAt,
            ReviewedByUserId = claim.ReviewedByUserId,
            ReviewedByEmail = claim.ReviewedByUser?.Email,
            ReviewedAt = claim.ReviewedAt,
            DecisionNotes = claim.DecisionNotes,
            VerificationStatus = verification?.Status,
            VerificationScore = verification?.ConfidenceScore,
            VerificationMatchedCount = verification?.MatchedCount,
            VerificationTotalQuestions = verification?.TotalQuestions,
            VerificationPassed = verification?.Passed,
            VerificationAttemptsRemaining = verification is not null ? Math.Max(0, verification.MaxAttempts - verification.AttemptCount) : null
        };
    }

    private static ClaimPersonDto MapPerson(ApplicationUser? user) => new()
    {
        UserId = user?.Id ?? string.Empty, Email = user?.Email ?? string.Empty,
        FullName = user?.UserProfile?.FullName, Department = user?.UserProfile?.Department,
        JobTitle = user?.UserProfile?.JobTitle, Semester = user?.UserProfile?.Semester,
        StudentId = user?.UserProfile?.StudentId, Phone = user?.UserProfile?.Phone
    };
}

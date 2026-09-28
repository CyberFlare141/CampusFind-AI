using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using System.Security.Cryptography;
using System.Text.Json;

namespace CampusFindAI.Api.Services;

public class ClaimService(
    IClaimRepository claimRepository,
    IFoundItemRepository foundItemRepository,
    IImageRepository imageRepository,
    IAuditLogService auditLogService,
    IClaimVerificationRepository verificationRepository,
    INotificationService notificationService,
    ILostItemRepository lostItemRepository,
    IMatchRepository matchRepository,
    IReputationService reputationService) : IClaimService
{
    private const string StatusPending = "Pending";
    private const string StatusApproved = "Approved";
    private const string StatusRejected = "Rejected";
    private static readonly TimeSpan HandoverQrLifetime = TimeSpan.FromMinutes(15);

    public async Task<ClaimDto> CreateAsync(
        string claimantUserId,
        CreateClaimDto request,
        CancellationToken cancellationToken = default)
    {
        var foundItem = await foundItemRepository.GetByIdAsync(request.FoundItemId, cancellationToken)
            ?? throw new InvalidOperationException("Found item does not exist.");

        if (foundItem.UserId == claimantUserId)
        {
            throw new InvalidOperationException("You cannot submit a claim for an item you reported.");
        }

        if (foundItem.Status != "Available")
        {
            throw new InvalidOperationException("This item is no longer available for new ownership claims.");
        }

        var existingClaims = await claimRepository.GetByClaimantIdAsync(claimantUserId, cancellationToken);
        if (existingClaims.Any(existing => existing.FoundItemId == foundItem.Id))
        {
            throw new InvalidOperationException("You have already submitted a claim for this item.");
        }

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

        await CreateNotificationAsync(
            claimantUserId,
            "Your ownership claim has been submitted for Security review.",
            "/my-claims",
            "CLAIM_SUBMITTED",
            cancellationToken);

        await CreateNotificationAsync(
            foundItem.UserId,
            $"A new ownership claim was submitted for your found-item report: {foundItem.Title}.",
            $"/found-items/{foundItem.Id}",
            "CLAIM_SUBMITTED",
            cancellationToken);

        var saved = await claimRepository.GetByIdAsync(claim.Id, cancellationToken);
        return MapToDto(saved!);
    }

    public async Task<IReadOnlyList<ClaimDto>> GetPendingAsync(
        CancellationToken cancellationToken = default)
    {
        var claims = await claimRepository.GetByStatusAsync(StatusPending, cancellationToken);
        return await MapClaimsToDtosAsync(claims, cancellationToken);
    }

    public async Task<IReadOnlyList<ClaimDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var claims = await claimRepository.GetAllAsync(cancellationToken);
        return await MapClaimsToDtosAsync(claims, cancellationToken);
    }

    public async Task<IReadOnlyList<ClaimDto>> GetOfficerDecisionHistoryAsync(
        string officerUserId,
        CancellationToken cancellationToken = default)
    {
        var claims = await claimRepository.GetByOfficerIdAsync(officerUserId, cancellationToken);
        return await MapClaimsToDtosAsync(claims, cancellationToken);
    }

    public async Task<IReadOnlyList<ClaimDto>> GetApprovedClaimsAsync(
        CancellationToken cancellationToken = default)
    {
        var claims = await claimRepository.GetApprovedClaimsAsync(cancellationToken);
        return await MapClaimsToDtosAsync(claims, cancellationToken);
    }

    public async Task<IReadOnlyList<ClaimDto>> GetMyClaimsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var claims = await claimRepository.GetByClaimantIdAsync(userId, cancellationToken);
        return await MapClaimsToDtosAsync(claims, cancellationToken);
    }

    public async Task<ClaimDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var claim = await claimRepository.GetByIdAsync(id, cancellationToken);
        if (claim is null) return null;
        var images = await imageRepository.GetByFoundItemIdsAsync([claim.FoundItemId], cancellationToken);
        var v = await verificationRepository.GetByClaimIdAsync(claim.Id, cancellationToken);
        return MapToDto(claim, v, images.Select(i => i.Url).ToList());
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
            HandedOverByUserId = claim.HandedOverByUserId, HandedOverAt = claim.HandedOverAt, HandoverNotes = claim.HandoverNotes,
            FoundAt = claim.FoundItem?.FoundAt,
            ImageUrls = images.Select(image => image.Url).ToList(),
            Claimant = MapPerson(claim.ClaimantUser), Reporter = MapPerson(claim.FoundItem?.User),
            VerificationStatus = v?.Status,
            VerificationScore = v?.ConfidenceScore,
            VerificationMatchedCount = v?.MatchedCount,
            VerificationTotalQuestions = v?.TotalQuestions,
            VerificationPassed = v?.Passed,
            VerificationAttemptsRemaining = v is not null ? Math.Max(0, v.MaxAttempts - v.AttemptCount) : null,
            VerificationMatchId = v?.MatchId
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

        if (request.Approve)
        {
            var existingApproved = await claimRepository.GetByFoundItemIdAsync(claim.FoundItemId, cancellationToken);
            if (existingApproved.Any(existing => (existing.Status is StatusApproved or "Returned") && existing.Id != claim.Id))
            {
                throw new InvalidOperationException("Another claim for this item has already been approved or handed over.");
            }
        }

        claim.ReviewedByUserId = officerUserId;
        claim.ReviewedAt = DateTime.UtcNow;
        claim.DecisionNotes = request.DecisionNotes?.Trim();
        if (request.Approve)
        {
            claim.HandoverQrToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
            claim.HandoverQrCreatedAt = DateTime.UtcNow;
            if (!await claimRepository.TryApproveAsync(claim, cancellationToken))
                throw new InvalidOperationException("This claim can no longer be approved because the item has another completed approval.");
            claim.Status = StatusApproved;
        }
        else
        {
            claim.Status = StatusRejected;
            claimRepository.Update(claim);
            await claimRepository.SaveChangesAsync(cancellationToken);
        }

        if (request.Approve)
        {
            await foundItemRepository.UpdateStatusAsync(claim.FoundItemId, "Claimed", cancellationToken);
        }

        await auditLogService.LogAsync(
            officerUserId,
            request.Approve ? "ClaimApproved" : "ClaimRejected",
            $"Claim {claim.Id} was {claim.Status.ToLowerInvariant()}.",
            cancellationToken);

        await CreateNotificationAsync(
            claim.ClaimantUserId,
            request.Approve
                ? $"Your ownership claim for {claim.FoundItem?.Title ?? "the found item"} was approved."
                : $"Your ownership claim for {claim.FoundItem?.Title ?? "the found item"} was not approved.",
            "/my-claims",
            request.Approve ? "CLAIM_APPROVED" : "CLAIM_REJECTED",
            cancellationToken);

        var updated = await claimRepository.GetByIdAsync(claim.Id, cancellationToken);
        return MapToDto(updated!);
    }

    public async Task<CompleteHandoverResponseDto> CompleteHandoverAsync(
        Guid claimId,
        string officerUserId,
        CompleteHandoverDto request,
        CancellationToken cancellationToken = default)
    {
        var claim = await claimRepository.GetByIdAsync(claimId, cancellationToken)
            ?? throw new InvalidOperationException("Claim not found.");

        if (claim.Status != StatusApproved)
        {
            throw new InvalidOperationException("Only an approved claim can be completed as a handover.");
        }
        var scannedToken = NormalizeHandoverToken(request.Token);
        if (string.IsNullOrWhiteSpace(scannedToken) || claim.HandoverQrUsedAt is not null || IsQrExpired(claim) || !CryptographicOperations.FixedTimeEquals(System.Text.Encoding.UTF8.GetBytes(claim.HandoverQrToken ?? string.Empty), System.Text.Encoding.UTF8.GetBytes(scannedToken)))
        {
            throw new InvalidOperationException("This QR code is invalid, expired, or has already been used.");
        }

        claim.HandedOverByUserId = officerUserId;
        claim.HandedOverAt = DateTime.UtcNow;
        claim.HandoverNotes = request.HandoverNotes?.Trim();
        claim.HandoverQrUsedAt = DateTime.UtcNow;
        if (!await claimRepository.TryCompleteHandoverAsync(claim, DateTime.UtcNow, cancellationToken))
            throw new InvalidOperationException("This QR code is invalid, expired, or has already been used.");
        await reputationService.AwardPointsAsync(claim.ClaimantUserId, 10, "Item returned to owner", "Claim", claim.Id, cancellationToken);
        var finder = await foundItemRepository.GetByIdAsync(claim.FoundItemId, cancellationToken);
        if (finder is not null)
            await reputationService.AwardPointsAsync(finder.UserId, 5, "Found item returned to owner", "Claim", claim.Id, cancellationToken);
        claim.Status = "Returned";
        await foundItemRepository.UpdateStatusAsync(claim.FoundItemId, "Returned", cancellationToken);

        var linkedMatches = await matchRepository.GetByFoundItemIdAsync(claim.FoundItemId, cancellationToken);
        var reportsToClose = linkedMatches
            .Where(match => match.LostItem?.UserId == claim.ClaimantUserId && match.LostItem.Status == "Open")
            .Select(match => match.LostItemId)
            .Distinct()
            .ToArray();
        foreach (var lostItemId in reportsToClose)
        {
            await lostItemRepository.UpdateStatusAsync(lostItemId, "Closed", cancellationToken);
        }

        await auditLogService.LogAsync(
            officerUserId,
            "ItemHandedOver",
            $"Claim {claim.Id} was completed and found item {claim.FoundItemId} was returned.",
            cancellationToken);

        var title = claim.FoundItem?.Title ?? "the found item";
        await CreateNotificationAsync(claim.ClaimantUserId, "The item handover was completed successfully.", "/my-claims", "HANDOVER_COMPLETED", cancellationToken);
        var foundItem = await foundItemRepository.GetByIdAsync(claim.FoundItemId, cancellationToken);
        if (foundItem is not null)
        {
            await CreateNotificationAsync(foundItem.UserId, "The item return was completed successfully.", $"/found-items/{foundItem.Id}", "HANDOVER_COMPLETED", cancellationToken);
        }

        var updated = await claimRepository.GetByIdAsync(claim.Id, cancellationToken);
        return new CompleteHandoverResponseDto
        {
            Claim = MapToDto(updated!),
            ClosedLostReportsCount = reportsToClose.Length,
        };
    }

    public async Task<HandoverQrDto> GetHandoverQrAsync(Guid claimId, string claimantUserId, CancellationToken cancellationToken = default)
    {
        var claim = await claimRepository.GetByIdAsync(claimId, cancellationToken)
            ?? throw new KeyNotFoundException("Claim not found.");
        if (claim.ClaimantUserId != claimantUserId) throw new UnauthorizedAccessException();
        if (claim.Status != StatusApproved || claim.HandoverQrUsedAt is not null)
            throw new InvalidOperationException("A handover QR code is not available for this claim.");

        if (string.IsNullOrWhiteSpace(claim.HandoverQrToken) || IsQrExpired(claim))
        {
            claim.HandoverQrToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
            claim.HandoverQrCreatedAt = DateTime.UtcNow;
            claim.HandoverQrUsedAt = null;
            claimRepository.Update(claim);
            await claimRepository.SaveChangesAsync(cancellationToken);
        }

        var createdAt = claim.HandoverQrCreatedAt ?? DateTime.UtcNow;
        return new HandoverQrDto { ClaimId = claim.Id, Token = claim.HandoverQrToken, CreatedAt = createdAt, ExpiresAt = createdAt.Add(HandoverQrLifetime) };
    }

    public async Task<CompleteHandoverResponseDto> ConfirmHandoverQrAsync(Guid claimId, string officerUserId, HandoverQrConfirmationDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(NormalizeHandoverToken(request.Token))) throw new InvalidOperationException("Scan the student's QR code or paste its value before confirming.");
        return await CompleteHandoverAsync(claimId, officerUserId, new CompleteHandoverDto { Token = request.Token, HandoverNotes = request.HandoverNotes }, cancellationToken);
    }

    private static string NormalizeHandoverToken(string? rawToken)
    {
        var token = Uri.UnescapeDataString(rawToken?.Trim().Trim('"', '\'') ?? string.Empty);
        if (token.StartsWith('{') && token.EndsWith('}'))
        {
            try
            {
                using var payload = JsonDocument.Parse(token);
                if (payload.RootElement.TryGetProperty("token", out var tokenProperty))
                    token = tokenProperty.GetString()?.Trim() ?? string.Empty;
            }
            catch (JsonException)
            {
                return string.Empty;
            }
        }

        if (Uri.TryCreate(token, UriKind.Absolute, out var uri))
        {
            var queryToken = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(uri.Query)["token"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(queryToken)) return queryToken.Trim().ToUpperInvariant();
        }

        return new string(token.Where(character => !char.IsWhiteSpace(character)).ToArray()).ToUpperInvariant();
    }

    private static bool IsQrExpired(Claim claim) =>
        !claim.HandoverQrCreatedAt.HasValue || claim.HandoverQrCreatedAt.Value.Add(HandoverQrLifetime) <= DateTime.UtcNow;

    private Task CreateNotificationAsync(string userId, string message, string link, string category, CancellationToken cancellationToken) =>
        notificationService.CreateAsync(userId, message, link, category, cancellationToken);

    private async Task<IReadOnlyList<ClaimDto>> MapClaimsToDtosAsync(IReadOnlyList<Claim> claims, CancellationToken cancellationToken)
    {
        if (claims.Count == 0) return [];
        var foundItemIds = claims.Select(c => c.FoundItemId).Distinct().ToArray();
        var allImages = await imageRepository.GetByFoundItemIdsAsync(foundItemIds, cancellationToken);
        var imagesByItem = allImages.GroupBy(img => img.FoundItemId).ToDictionary(g => g.Key ?? Guid.Empty, g => g.Select(x => x.Url).ToList());

        var dtos = new List<ClaimDto>();
        foreach (var claim in claims)
        {
            var v = await verificationRepository.GetByClaimIdAsync(claim.Id, cancellationToken);
            imagesByItem.TryGetValue(claim.FoundItemId, out var images);
            var isItemClaimedOrReturned = claim.FoundItem?.Status is "Claimed" or "Returned";
            dtos.Add(MapToDto(claim, v, images, isItemClaimedOrReturned));
        }
        // A claimant may have an obsolete pre-match claim from an earlier version
        // of the app plus the current match-bound claim for the same found item.
        // Present one claim journey, preferring the secured match-bound record.
        return dtos
            .GroupBy(dto => new { dto.ClaimantUserId, dto.FoundItemId })
            .Select(group => group
                .OrderByDescending(dto => dto.VerificationMatchId.HasValue)
                .ThenByDescending(dto => dto.CreatedAt)
                .First())
            .OrderByDescending(dto => dto.CreatedAt)
            .ToList();
    }

    private static ClaimDto MapToDto(Claim claim, ClaimVerification? verification = null, IReadOnlyList<string>? imageUrls = null, bool? isItemClaimed = null)
    {
        var isClaimed = isItemClaimed ?? (claim.FoundItem?.Status is "Claimed" or "Returned");
        return new ClaimDto
        {
            Id = claim.Id,
            FoundItemId = claim.FoundItemId,
            FoundItemTitle = claim.FoundItem?.Title ?? string.Empty,
            FoundItemDescription = claim.FoundItem?.Description,
            FoundItemStatus = claim.FoundItem?.Status,
            IsItemAlreadyClaimed = isClaimed,
            ImageUrls = imageUrls ?? [],
            ClaimantUserId = claim.ClaimantUserId,
            ClaimantEmail = claim.ClaimantUser?.Email ?? string.Empty,
            ClaimantNotes = claim.ClaimantNotes,
            Status = claim.Status,
            CreatedAt = claim.CreatedAt,
            ReviewedByUserId = claim.ReviewedByUserId,
            ReviewedByEmail = claim.ReviewedByUser?.Email,
            ReviewedAt = claim.ReviewedAt,
            DecisionNotes = claim.DecisionNotes,
            HandedOverByUserId = claim.HandedOverByUserId,
            HandedOverAt = claim.HandedOverAt,
            HandoverNotes = claim.HandoverNotes,
            VerificationStatus = verification?.Status,
            VerificationScore = verification?.ConfidenceScore,
            VerificationMatchedCount = verification?.MatchedCount,
            VerificationTotalQuestions = verification?.TotalQuestions,
            VerificationPassed = verification?.Passed,
            VerificationAttemptsRemaining = verification is not null ? Math.Max(0, verification.MaxAttempts - verification.AttemptCount) : null,
            VerificationMatchId = verification?.MatchId
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

using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface IClaimService
{
    Task<ClaimDto> CreateAsync(
        string claimantUserId,
        CreateClaimDto request,
        CancellationToken cancellationToken = default);

    /// <summary>The security officer's "Pending Claims" queue.</summary>
    Task<IReadOnlyList<ClaimDto>> GetPendingAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ClaimDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ClaimDto>> GetMyClaimsAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task<ClaimDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<ClaimReviewDto?> GetReviewAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    /// <summary>Records the officer's approve/reject verification decision.</summary>
    Task<ClaimDto> DecideAsync(
        Guid claimId,
        string officerUserId,
        ClaimDecisionDto request,
        CancellationToken cancellationToken = default);
}

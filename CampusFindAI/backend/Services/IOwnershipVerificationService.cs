using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface IOwnershipVerificationService
{
    Task<ClaimVerificationResponseDto> GetOrGenerateVerificationAsync(
        Guid claimId,
        string currentUserId,
        CancellationToken cancellationToken = default);

    Task<SubmitVerificationResponseDto> SubmitVerificationAsync(
        Guid claimId,
        string currentUserId,
        SubmitVerificationRequestDto request,
        CancellationToken cancellationToken = default);

    Task<OfficerVerificationReviewDto> GetOfficerReviewAsync(
        Guid claimId,
        CancellationToken cancellationToken = default);
}

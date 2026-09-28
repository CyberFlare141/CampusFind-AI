using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface IOwnershipVerificationService
{
    Task<OwnershipVerificationStatusDto> GetStatusAsync(Guid matchId, string currentUserId, CancellationToken cancellationToken = default);
    Task<ClaimVerificationResponseDto> StartForMatchAsync(Guid matchId, string currentUserId, CancellationToken cancellationToken = default);
    Task<SubmitVerificationResponseDto> SubmitForMatchAsync(Guid matchId, string currentUserId, SubmitVerificationRequestDto request, CancellationToken cancellationToken = default);
    Task<bool> CanAccessHandoverChatAsync(Guid matchId, string currentUserId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<OfficerVerificationReviewDto>> GetPendingSecurityReviewsAsync(CancellationToken cancellationToken = default);
    Task<OfficerVerificationReviewDto> GetSecurityReviewAsync(Guid verificationId, CancellationToken cancellationToken = default);
    Task<OfficerVerificationReviewDto> DecideSecurityReviewAsync(Guid verificationId, string officerId, bool approve, string? note, CancellationToken cancellationToken = default);
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

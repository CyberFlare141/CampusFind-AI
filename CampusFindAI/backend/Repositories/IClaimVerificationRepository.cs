using CampusFindAI.Api.Models;

namespace CampusFindAI.Api.Repositories;

public interface IClaimVerificationRepository
{
    Task<ClaimVerification?> GetByClaimIdAsync(Guid claimId, CancellationToken cancellationToken = default);
    Task<ClaimVerification?> GetByMatchIdAsync(Guid matchId, CancellationToken cancellationToken = default)
        => Task.FromResult<ClaimVerification?>(null);
    Task<IReadOnlyList<ClaimVerification>> GetPendingSecurityReviewAsync(CancellationToken cancellationToken = default)
        => Task.FromResult((IReadOnlyList<ClaimVerification>)[]);
    Task AddAsync(ClaimVerification verification, CancellationToken cancellationToken = default);
    Task UpdateAsync(ClaimVerification verification, CancellationToken cancellationToken = default);
    Task EnsureTableCreatedAsync(CancellationToken cancellationToken = default);
}

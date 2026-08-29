using CampusFindAI.Api.Models;

namespace CampusFindAI.Api.Repositories;

public interface IClaimRepository
{
    Task AddAsync(
        Claim claim,
        CancellationToken cancellationToken = default);

    Task<Claim?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<Claim?> GetReviewByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Claim>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Claim>> GetByStatusAsync(
        string status,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Claim>> GetByClaimantIdAsync(
        string claimantUserId,
        CancellationToken cancellationToken = default);

    void Update(Claim claim);

    Task SaveChangesAsync(
        CancellationToken cancellationToken = default);
}

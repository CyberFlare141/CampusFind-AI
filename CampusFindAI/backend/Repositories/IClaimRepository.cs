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

    Task<IReadOnlyList<Claim>> GetByFoundItemIdAsync(
        Guid foundItemId,
        CancellationToken cancellationToken = default);

    /// <summary>Atomically approves a pending claim only when no other claim for the item has been approved or returned.</summary>
    Task<bool> TryApproveAsync(Claim claim, CancellationToken cancellationToken = default)
        => Task.FromResult(false);

    /// <summary>Atomically consumes a valid handover token exactly once.</summary>
    Task<bool> TryCompleteHandoverAsync(Claim claim, DateTime utcNow, CancellationToken cancellationToken = default)
        => Task.FromResult(false);

    void Update(Claim claim);

    Task SaveChangesAsync(
        CancellationToken cancellationToken = default);
}

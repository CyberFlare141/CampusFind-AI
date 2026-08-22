using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Repositories;

public class ClaimRepository(ApplicationDbContext context) : IClaimRepository
{
    public async Task AddAsync(
        Claim claim,
        CancellationToken cancellationToken = default)
    {
        await context.Claims.AddAsync(claim, cancellationToken);
    }

    public async Task<Claim?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        // Tracked (no AsNoTracking) so the verification-decision workflow can
        // mutate and save the same instance it just loaded.
        return await context.Claims
            .Include(x => x.FoundItem)
            .Include(x => x.ClaimantUser)
            .Include(x => x.ReviewedByUser)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<Claim>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await context.Claims
            .AsNoTracking()
            .Include(x => x.FoundItem)
            .Include(x => x.ClaimantUser)
            .Include(x => x.ReviewedByUser)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Claim>> GetByStatusAsync(
        string status,
        CancellationToken cancellationToken = default)
    {
        return await context.Claims
            .AsNoTracking()
            .Include(x => x.FoundItem)
            .Include(x => x.ClaimantUser)
            .Include(x => x.ReviewedByUser)
            .Where(x => x.Status == status)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Claim>> GetByClaimantIdAsync(
        string claimantUserId,
        CancellationToken cancellationToken = default)
    {
        return await context.Claims
            .AsNoTracking()
            .Include(x => x.FoundItem)
            .Include(x => x.ReviewedByUser)
            .Where(x => x.ClaimantUserId == claimantUserId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public void Update(Claim claim) => context.Claims.Update(claim);

    public Task SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        return context.SaveChangesAsync(cancellationToken);
    }
}

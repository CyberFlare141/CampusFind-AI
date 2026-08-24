using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Repositories;

public class MatchRepository(ApplicationDbContext context) : IMatchRepository
{
    public async Task<IReadOnlyList<Match>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await context.Matches
            .AsNoTracking()
            .Include(x => x.LostItem)
            .Include(x => x.FoundItem)
            .OrderByDescending(x => x.ConfidenceScore)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> ExistsAsync(
        Guid lostItemId,
        Guid foundItemId,
        CancellationToken cancellationToken = default)
    {
        return await context.Matches
            .AsNoTracking()
            .AnyAsync(
                x => x.LostItemId == lostItemId && x.FoundItemId == foundItemId,
                cancellationToken);
    }

    public async Task AddAsync(
        Match match,
        CancellationToken cancellationToken = default)
    {
        await context.Matches.AddAsync(match, cancellationToken);
    }

    public Task SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        return context.SaveChangesAsync(cancellationToken);
    }
}

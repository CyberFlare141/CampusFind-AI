using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Repositories;

public class FoundItemRepository(ApplicationDbContext context)
    : IFoundItemRepository
{
    public async Task AddAsync(
        FoundItem item,
        CancellationToken cancellationToken = default)
    {
        await context.FoundItems.AddAsync(item, cancellationToken);
    }

    public async Task<FoundItem?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await context.FoundItems
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<FoundItem>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await context.FoundItems
            .AsNoTracking()
            .OrderByDescending(x => x.FoundAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<FoundItem>> GetByUserIdAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        return await context.FoundItems
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.FoundAt)
            .ToListAsync(cancellationToken);
    }

    public Task SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        return context.SaveChangesAsync(cancellationToken);
    }
}
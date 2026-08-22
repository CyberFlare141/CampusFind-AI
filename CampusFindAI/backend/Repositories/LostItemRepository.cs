using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Repositories;

public class LostItemRepository(ApplicationDbContext context)
    : ILostItemRepository
{
    public async Task AddAsync(
        LostItem item,
        CancellationToken cancellationToken = default)
    {
        await context.LostItems.AddAsync(item, cancellationToken);
    }

    public async Task<LostItem?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await context.LostItems
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<LostItem>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await context.LostItems
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<LostItem>> GetByUserIdAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        return await context.LostItems
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        return context.SaveChangesAsync(cancellationToken);
    }
}
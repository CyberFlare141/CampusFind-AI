using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Repositories;

public class AuditLogRepository(ApplicationDbContext context) : IAuditLogRepository
{
    public async Task AddAsync(
        AuditLog log,
        CancellationToken cancellationToken = default)
    {
        await context.AuditLogs.AddAsync(log, cancellationToken);
    }

    public async Task<IReadOnlyList<AuditLog>> GetByUserAndActionAsync(
        string userId,
        string? action,
        int take,
        CancellationToken cancellationToken = default)
    {
        var query = context.AuditLogs
            .AsNoTracking()
            .Where(x => x.UserId == userId);

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(x => x.Action == action);
        }

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(take)
            .ToListAsync(cancellationToken);
    }

    public async Task<AuditLog?> GetByIdForUserAsync(
        string userId,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await context.AuditLogs
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Id == id && x.UserId == userId,
                cancellationToken);
    }

    public Task SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        return context.SaveChangesAsync(cancellationToken);
    }
}

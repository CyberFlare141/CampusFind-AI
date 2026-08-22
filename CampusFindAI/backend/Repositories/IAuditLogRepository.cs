using CampusFindAI.Api.Models;

namespace CampusFindAI.Api.Repositories;

public interface IAuditLogRepository
{
    Task AddAsync(
        AuditLog log,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AuditLog>> GetByUserAndActionAsync(
        string userId,
        string? action,
        int take,
        CancellationToken cancellationToken = default);

    Task<AuditLog?> GetByIdForUserAsync(
        string userId,
        Guid id,
        CancellationToken cancellationToken = default);

    Task SaveChangesAsync(
        CancellationToken cancellationToken = default);
}

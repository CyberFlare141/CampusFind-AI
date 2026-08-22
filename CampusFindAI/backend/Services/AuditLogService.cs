using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;

namespace CampusFindAI.Api.Services;

public class AuditLogService(IAuditLogRepository repository) : IAuditLogService
{
    public async Task LogAsync(
        string? userId,
        string action,
        string? details = null,
        CancellationToken cancellationToken = default)
    {
        var log = new AuditLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Action = action,
            Details = details,
            CreatedAt = DateTime.UtcNow
        };

        await repository.AddAsync(log, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<LoginHistoryEntryDto>> GetLoginHistoryAsync(
        string userId,
        int take = 20,
        CancellationToken cancellationToken = default)
    {
        var logs = await repository.GetByUserAndActionAsync(
            userId,
            "Login",
            take,
            cancellationToken);

        return logs.Select(MapToDto).ToList();
    }

    public async Task<LoginHistoryEntryDto?> GetLoginDetailAsync(
        string userId,
        Guid auditLogId,
        CancellationToken cancellationToken = default)
    {
        var log = await repository.GetByIdForUserAsync(userId, auditLogId, cancellationToken);
        return log is null ? null : MapToDto(log);
    }

    private static LoginHistoryEntryDto MapToDto(AuditLog log)
    {
        return new LoginHistoryEntryDto
        {
            Id = log.Id,
            Action = log.Action,
            Details = log.Details,
            CreatedAt = log.CreatedAt
        };
    }
}

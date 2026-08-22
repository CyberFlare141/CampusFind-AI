using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface IAuditLogService
{
    Task LogAsync(
        string? userId,
        string action,
        string? details = null,
        CancellationToken cancellationToken = default);

    /// <summary>The officer's login history ("Login detail" list).</summary>
    Task<IReadOnlyList<LoginHistoryEntryDto>> GetLoginHistoryAsync(
        string userId,
        int take = 20,
        CancellationToken cancellationToken = default);

    Task<LoginHistoryEntryDto?> GetLoginDetailAsync(
        string userId,
        Guid auditLogId,
        CancellationToken cancellationToken = default);
}

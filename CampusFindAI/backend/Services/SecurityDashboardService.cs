using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Repositories;

namespace CampusFindAI.Api.Services;

public class SecurityDashboardService(
    IClaimRepository claimRepository,
    IMatchService matchService,
    IAuditLogRepository auditLogRepository,
    IUserRepository userRepository,
    ILostItemRepository lostItemRepository,
    IFoundItemRepository foundItemRepository) : ISecurityDashboardService
{
    public async Task<SecurityOverviewDto> GetOverviewAsync(
        CancellationToken cancellationToken = default)
    {
        var pendingTask    = claimRepository.GetByStatusAsync("Pending", cancellationToken);
        var matchesTask    = matchService.GetSuggestedMatchesAsync(cancellationToken);
        var allClaimsTask  = claimRepository.GetAllAsync(cancellationToken);
        var lostTask       = lostItemRepository.GetAllAsync(cancellationToken);
        var foundTask      = foundItemRepository.GetAllAsync(cancellationToken);

        await Task.WhenAll(pendingTask, matchesTask, allClaimsTask, lostTask, foundTask);

        var decisionsMade = allClaimsTask.Result.Count(c =>
            c.Status is "Approved" or "Rejected" or "Returned");

        return new SecurityOverviewDto
        {
            PendingClaimsCount    = pendingTask.Result.Count,
            SuggestedMatchesCount = matchesTask.Result.Count,
            LostItemsCount        = lostTask.Result.Count,
            FoundItemsCount       = foundTask.Result.Count,
            DecisionsMadeCount    = decisionsMade,
        };
    }

    public async Task<LoginConfirmationDto> GetLoginConfirmationAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        var recentLogins = await auditLogRepository.GetByUserAndActionAsync(
            userId,
            "Login",
            take: 2,
            cancellationToken);

        var previousLogin = recentLogins.Skip(1).FirstOrDefault();

        return new LoginConfirmationDto
        {
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            Role = user.Role.ToString(),
            LastLoginAt = previousLogin?.CreatedAt,
            ConfirmedAt = DateTime.UtcNow
        };
    }
}

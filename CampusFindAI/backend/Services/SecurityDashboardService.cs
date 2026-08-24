using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Repositories;

namespace CampusFindAI.Api.Services;

public class SecurityDashboardService(
    IClaimRepository claimRepository,
    IMatchService matchService,
    IAuditLogRepository auditLogRepository,
    IUserRepository userRepository) : ISecurityDashboardService
{
    public async Task<SecurityOverviewDto> GetOverviewAsync(
        CancellationToken cancellationToken = default)
    {
        var pendingClaims = await claimRepository.GetByStatusAsync("Pending", cancellationToken);
        var matches = await matchService.GetSuggestedMatchesAsync(cancellationToken);

        return new SecurityOverviewDto
        {
            PendingClaimsCount = pendingClaims.Count,
            SuggestedMatchesCount = matches.Count
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

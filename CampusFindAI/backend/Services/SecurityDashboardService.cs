using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using Microsoft.AspNetCore.Identity;

namespace CampusFindAI.Api.Services;

public class SecurityDashboardService(
    IClaimRepository claimRepository,
    IMatchRepository matchRepository,
    IAuditLogRepository auditLogRepository,
    UserManager<ApplicationUser> userManager) : ISecurityDashboardService
{
    public async Task<SecurityOverviewDto> GetOverviewAsync(
        CancellationToken cancellationToken = default)
    {
        var pendingClaims = await claimRepository.GetByStatusAsync("Pending", cancellationToken);
        var matches = await matchRepository.GetAllAsync(cancellationToken);

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
        var user = await userManager.FindByIdAsync(userId)
            ?? throw new InvalidOperationException("User not found.");

        // The two most recent "Login" entries: index 0 is the session that's
        // asking for confirmation right now, index 1 (if present) is the
        // officer's previous login.
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

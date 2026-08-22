using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface ISecurityDashboardService
{
    Task<SecurityOverviewDto> GetOverviewAsync(
        CancellationToken cancellationToken = default);

    Task<LoginConfirmationDto> GetLoginConfirmationAsync(
        string userId,
        CancellationToken cancellationToken = default);
}

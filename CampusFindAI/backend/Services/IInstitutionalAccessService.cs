namespace CampusFindAI.Api.Services;

public interface IInstitutionalAccessService
{
    Task<bool> CanPerformInstitutionalActionsAsync(string userId, CancellationToken cancellationToken = default);
}

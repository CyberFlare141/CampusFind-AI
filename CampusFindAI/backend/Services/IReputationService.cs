using CampusFindAI.Api.Models;

namespace CampusFindAI.Api.Services;

public interface IReputationService
{
    Task<Reputation> GetOrCreateAsync(string userId, CancellationToken cancellationToken = default);
    Task AwardPointsAsync(string userId, int points, string reason, string relatedEntityType, Guid relatedEntityId, CancellationToken cancellationToken = default);
}

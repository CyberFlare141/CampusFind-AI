using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface IMatchService
{
    /// <summary>
    /// Computes explainable candidate lost/found matches using text, category,
    /// location, time and image similarity and returns them ranked for review.
    /// </summary>
    Task<IReadOnlyList<MatchDto>> GetSuggestedMatchesAsync(
        CancellationToken cancellationToken = default);

    /// <summary>Refreshes matching suggestions after a report is submitted.</summary>
    Task RefreshForLostItemAsync(Guid lostItemId, CancellationToken cancellationToken = default);

    /// <summary>Refreshes matching suggestions after a report is submitted.</summary>
    Task RefreshForFoundItemAsync(Guid foundItemId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<MatchDto>> GetMyMatchesAsync(string userId, CancellationToken cancellationToken = default);
}

using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface IMatchService
{
    /// <summary>
    /// Computes candidate lost/found matches (title, category, location, and
    /// date-proximity heuristics), persists newly discovered pairs, and
    /// returns every known match ordered by confidence for the officer's
    /// "Suggested Matches" queue.
    /// </summary>
    Task<IReadOnlyList<MatchDto>> GetSuggestedMatchesAsync(
        CancellationToken cancellationToken = default);
}

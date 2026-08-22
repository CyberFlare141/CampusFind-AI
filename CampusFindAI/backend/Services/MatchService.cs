using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;

namespace CampusFindAI.Api.Services;

public class MatchService(
    ILostItemRepository lostItemRepository,
    IFoundItemRepository foundItemRepository,
    IMatchRepository matchRepository) : IMatchService
{
    // Below this score a pair is not considered worth surfacing to an officer.
    private const decimal SuggestionThreshold = 30m;

    public async Task<IReadOnlyList<MatchDto>> GetSuggestedMatchesAsync(
        CancellationToken cancellationToken = default)
    {
        var lostItems = await lostItemRepository.GetAllAsync(cancellationToken);
        var foundItems = await foundItemRepository.GetAllAsync(cancellationToken);

        var openLostItems = lostItems.Where(x => x.Status == "Open").ToList();

        foreach (var lostItem in openLostItems)
        {
            foreach (var foundItem in foundItems)
            {
                var score = ComputeConfidenceScore(lostItem, foundItem);

                if (score < SuggestionThreshold)
                {
                    continue;
                }

                var alreadyExists = await matchRepository.ExistsAsync(
                    lostItem.Id,
                    foundItem.Id,
                    cancellationToken);

                if (alreadyExists)
                {
                    continue;
                }

                await matchRepository.AddAsync(
                    new Match
                    {
                        Id = Guid.NewGuid(),
                        LostItemId = lostItem.Id,
                        FoundItemId = foundItem.Id,
                        ConfidenceScore = score
                    },
                    cancellationToken);
            }
        }

        await matchRepository.SaveChangesAsync(cancellationToken);

        var matches = await matchRepository.GetAllAsync(cancellationToken);

        return matches.Select(MapToDto).ToList();
    }

    private static decimal ComputeConfidenceScore(LostItem lostItem, FoundItem foundItem)
    {
        decimal score = 0;

        if (lostItem.CategoryId.HasValue &&
            foundItem.CategoryId.HasValue &&
            lostItem.CategoryId == foundItem.CategoryId)
        {
            score += 35;
        }

        if (lostItem.LocationId.HasValue &&
            foundItem.LocationId.HasValue &&
            lostItem.LocationId == foundItem.LocationId)
        {
            score += 15;
        }

        score += TextSimilarity(lostItem.Title, foundItem.Title) * 40;
        score += TextSimilarity(lostItem.Description, foundItem.Description) * 10;

        if (lostItem.LostAt.HasValue && foundItem.FoundAt.HasValue)
        {
            var dayGap = Math.Abs((foundItem.FoundAt.Value - lostItem.LostAt.Value).TotalDays);

            if (dayGap <= 7)
            {
                score += 10;
            }
        }

        return Math.Round(Math.Min(score, 100m), 2);
    }

    private static decimal TextSimilarity(string? left, string? right)
    {
        var leftTokens = Tokenize(left);
        var rightTokens = Tokenize(right);

        if (leftTokens.Count == 0 || rightTokens.Count == 0)
        {
            return 0m;
        }

        var intersection = leftTokens.Intersect(rightTokens).Count();
        var union = leftTokens.Union(rightTokens).Count();

        return union == 0 ? 0m : (decimal)intersection / union;
    }

    private static HashSet<string> Tokenize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return [];
        }

        return value
            .ToLowerInvariant()
            .Split(
                [' ', ',', '.', '-', '_', '/', '\\'],
                StringSplitOptions.RemoveEmptyEntries)
            .Where(token => token.Length > 2)
            .ToHashSet();
    }

    private static MatchDto MapToDto(Match match)
    {
        return new MatchDto
        {
            Id = match.Id,
            LostItemId = match.LostItemId,
            LostItemTitle = match.LostItem?.Title ?? string.Empty,
            LostItemUserId = match.LostItem?.UserId ?? string.Empty,
            FoundItemId = match.FoundItemId,
            FoundItemTitle = match.FoundItem?.Title ?? string.Empty,
            FoundItemUserId = match.FoundItem?.UserId ?? string.Empty,
            ConfidenceScore = match.ConfidenceScore
        };
    }
}

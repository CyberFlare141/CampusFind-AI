using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;

namespace CampusFindAI.Api.Services;

public class MatchService(ILostItemRepository lostItemRepository, IFoundItemRepository foundItemRepository, IImageRepository imageRepository, IImageSimilarityService imageSimilarityService, IMatchRepository matchRepository) : IMatchService
{
    private const decimal SuggestionThreshold = 35m;

    public async Task<IReadOnlyList<MatchDto>> GetSuggestedMatchesAsync(CancellationToken cancellationToken = default)
    {
        var lost = (await lostItemRepository.GetAllAsync(cancellationToken)).Where(item => item.Status == "Open").ToList();
        var suggestions = await AnalysePairsAsync(lost, await foundItemRepository.GetAllAsync(cancellationToken), cancellationToken);
        await PersistNewSuggestionsAsync(suggestions, cancellationToken);
        return suggestions.OrderByDescending(match => match.ConfidenceScore).ToList();
    }

    public async Task RefreshForLostItemAsync(Guid lostItemId, CancellationToken cancellationToken = default)
    {
        var lost = await lostItemRepository.GetByIdAsync(lostItemId, cancellationToken);
        if (lost is null || lost.Status != "Open") return;
        await PersistNewSuggestionsAsync(await AnalysePairsAsync([lost], await foundItemRepository.GetAllAsync(cancellationToken), cancellationToken), cancellationToken);
    }

    public async Task RefreshForFoundItemAsync(Guid foundItemId, CancellationToken cancellationToken = default)
    {
        var found = await foundItemRepository.GetByIdAsync(foundItemId, cancellationToken);
        if (found is null) return;
        var lost = (await lostItemRepository.GetAllAsync(cancellationToken)).Where(item => item.Status == "Open").ToList();
        await PersistNewSuggestionsAsync(await AnalysePairsAsync(lost, [found], cancellationToken), cancellationToken);
    }

    private async Task<IReadOnlyList<MatchDto>> AnalysePairsAsync(IReadOnlyList<LostItem> lostItems, IReadOnlyList<FoundItem> foundItems, CancellationToken cancellationToken)
    {
        var lostImages = (await imageRepository.GetByLostItemIdsAsync(lostItems.Select(item => item.Id).ToArray(), cancellationToken)).Where(image => image.LostItemId.HasValue).GroupBy(image => image.LostItemId!.Value).ToDictionary(group => group.Key, group => (IReadOnlyList<string>)group.Select(image => image.Url).ToList());
        var foundImages = (await imageRepository.GetByFoundItemIdsAsync(foundItems.Select(item => item.Id).ToArray(), cancellationToken)).Where(image => image.FoundItemId.HasValue).GroupBy(image => image.FoundItemId!.Value).ToDictionary(group => group.Key, group => (IReadOnlyList<string>)group.Select(image => image.Url).ToList());
        var matches = new List<MatchDto>();
        foreach (var lost in lostItems)
        foreach (var found in foundItems)
        {
            var match = await AnalyseAsync(lost, found, lostImages.GetValueOrDefault(lost.Id, []), foundImages.GetValueOrDefault(found.Id, []), cancellationToken);
            if (match.ConfidenceScore >= SuggestionThreshold) matches.Add(match);
        }
        return matches;
    }

    private async Task<MatchDto> AnalyseAsync(LostItem lost, FoundItem found, IReadOnlyCollection<string> lostImages, IReadOnlyCollection<string> foundImages, CancellationToken cancellationToken)
    {
        var signals = new List<(decimal Weight, decimal Value, string Label)>();
        var text = (TextSimilarity($"{lost.Title} {lost.Description}", $"{found.Title} {found.Description}") + TextSimilarity(lost.Title, found.Title)) / 2m;
        signals.Add((32m, text, "Similar description and identifying details"));
        if (lost.CategoryId.HasValue && found.CategoryId.HasValue) signals.Add((22m, lost.CategoryId == found.CategoryId ? 1m : 0m, "Same item category"));
        if (lost.LocationId.HasValue && found.LocationId.HasValue) signals.Add((16m, lost.LocationId == found.LocationId ? 1m : 0m, "Same reported location"));
        if (lost.LostAt.HasValue && found.FoundAt.HasValue) signals.Add((12m, TimeCompatibility(lost.LostAt.Value, found.FoundAt.Value), "Compatible lost/found date and time"));
        var visualSimilarity = await imageSimilarityService.GetBestSimilarityAsync(lostImages, foundImages, cancellationToken);
        if (visualSimilarity.HasValue) signals.Add((18m, visualSimilarity.Value, "Visual similarity between report images"));

        var score = signals.Sum(signal => signal.Weight) == 0 ? 0 : signals.Sum(signal => signal.Weight * signal.Value) / signals.Sum(signal => signal.Weight) * 100m;
        var matched = signals.Where(signal => signal.Value >= .55m).OrderByDescending(signal => signal.Weight * signal.Value).Select(signal => signal.Label).ToList();
        if (matched.Count == 0 && text >= .3m) matched.Add("Some overlap in the item descriptions");
        return new MatchDto
        {
            Id = Guid.NewGuid(),
            LostItemId = lost.Id, LostItemTitle = lost.Title, LostItemUserId = lost.UserId, FoundItemId = found.Id, FoundItemTitle = found.Title, FoundItemUserId = found.UserId,
            ConfidenceScore = Math.Round(Math.Min(score, 100m), 2), MatchedAttributes = matched,
            Explanation = matched.Count == 0 ? "Potential match based on available report details; review manually." : $"Potential match based on {string.Join(", ", matched.Select(value => value.ToLowerInvariant()))}."
        };
    }

    private async Task PersistNewSuggestionsAsync(IReadOnlyList<MatchDto> suggestions, CancellationToken cancellationToken)
    {
        foreach (var suggestion in suggestions)
        {
            if (await matchRepository.ExistsAsync(suggestion.LostItemId, suggestion.FoundItemId, cancellationToken)) continue;
            await matchRepository.AddAsync(new Match { Id = Guid.NewGuid(), LostItemId = suggestion.LostItemId, FoundItemId = suggestion.FoundItemId, ConfidenceScore = suggestion.ConfidenceScore }, cancellationToken);
        }
        await matchRepository.SaveChangesAsync(cancellationToken);
    }

    private static decimal TimeCompatibility(DateTime lostAt, DateTime foundAt)
    {
        var hours = (foundAt - lostAt).TotalHours;
        if (hours is >= -24 and <= 24) return 1m;
        if (hours is >= -72 and <= 168) return .8m;
        return Math.Abs(hours) <= 30 * 24 ? .4m : 0m;
    }

    private static decimal TextSimilarity(string? left, string? right)
    {
        var leftTokens = Tokenize(left); var rightTokens = Tokenize(right);
        return leftTokens.Count == 0 || rightTokens.Count == 0 ? 0 : (decimal)leftTokens.Intersect(rightTokens).Count() / leftTokens.Union(rightTokens).Count();
    }

    private static HashSet<string> Tokenize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return [];
        var aliases = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) { ["cellphone"] = "phone", ["mobile"] = "phone", ["spectacles"] = "glasses", ["purse"] = "wallet", ["backpack"] = "bag" };
        var ignored = new HashSet<string>(["the", "and", "with", "from", "near", "item", "lost", "found", "was", "this", "that", "have"]);
        return value.ToLowerInvariant().Split([' ', ',', '.', '-', '_', '/', '\\', ':', ';', '(', ')'], StringSplitOptions.RemoveEmptyEntries).Where(token => token.Length > 2 && !ignored.Contains(token)).Select(token => aliases.GetValueOrDefault(token, token)).ToHashSet();
    }
}

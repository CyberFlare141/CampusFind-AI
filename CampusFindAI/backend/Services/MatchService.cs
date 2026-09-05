using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using Regex = System.Text.RegularExpressions.Regex;

namespace CampusFindAI.Api.Services;

public class MatchService(ILostItemRepository lostItemRepository, IFoundItemRepository foundItemRepository, IImageRepository imageRepository, IImageSimilarityService imageSimilarityService, IMatchRepository matchRepository, INotificationService notificationService, IReferenceDataService referenceDataService) : IMatchService
{
    private const decimal SuggestionThreshold = 35m;
    private const decimal NotificationThreshold = 70m;

    public async Task<IReadOnlyList<MatchDto>> GetSuggestedMatchesAsync(CancellationToken cancellationToken = default)
    {
        var lost = (await lostItemRepository.GetAllAsync(cancellationToken)).Where(item => item.Status == "Open").ToList();
        var found = (await foundItemRepository.GetAllAsync(cancellationToken)).Where(item => item.Status == "Available").ToList();
        var suggestions = await AnalysePairsAsync(lost, found, cancellationToken);
        await PersistNewSuggestionsAsync(suggestions, cancellationToken);
        return suggestions.OrderByDescending(match => match.ConfidenceScore).ToList();
    }

    public async Task RefreshForLostItemAsync(Guid lostItemId, CancellationToken cancellationToken = default)
    {
        var lost = await lostItemRepository.GetByIdAsync(lostItemId, cancellationToken);
        if (lost is null || lost.Status != "Open") return;
        var foundItems = (await foundItemRepository.GetAllAsync(cancellationToken)).Where(item => item.Status == "Available").ToList();
        await PersistNewSuggestionsAsync(await AnalysePairsAsync([lost], foundItems, cancellationToken), cancellationToken);
    }

    public async Task RefreshForFoundItemAsync(Guid foundItemId, CancellationToken cancellationToken = default)
    {
        var found = await foundItemRepository.GetByIdAsync(foundItemId, cancellationToken);
        if (found is null || found.Status != "Available") return;
        var lost = (await lostItemRepository.GetAllAsync(cancellationToken)).Where(item => item.Status == "Open").ToList();
        await PersistNewSuggestionsAsync(await AnalysePairsAsync(lost, [found], cancellationToken), cancellationToken);
    }

    public async Task<IReadOnlyList<MatchDto>> GetMyMatchesAsync(string userId, CancellationToken cancellationToken = default)
    {
        var matches = await matchRepository.GetByLostItemUserIdAsync(userId, cancellationToken);
        var categories = await referenceDataService.GetCategoriesAsync(cancellationToken);
        var locations = await referenceDataService.GetLocationsAsync(cancellationToken);
        var images = await imageRepository.GetByFoundItemIdsAsync(matches.Select(match => match.FoundItemId).ToArray(), cancellationToken);
        return matches.Select(match =>
        {
            var lost = match.LostItem!; var found = match.FoundItem!;
            var attributes = new List<string>();
            if (lost.CategoryId.HasValue && lost.CategoryId == found.CategoryId) attributes.Add("Same item category");
            var lostLocation = locations.FirstOrDefault(location => location.Id == lost.LocationId);
            var foundLocation = locations.FirstOrDefault(location => location.Id == found.LocationId);
            var locationSignal = GetReportedLocationSignal(lost, found, lostLocation, foundLocation);
            if (locationSignal.Value > 0) attributes.Add(locationSignal.Label);
            return new MatchDto
            {
                Id = match.Id, LostItemId = lost.Id, LostItemTitle = lost.Title, FoundItemId = found.Id, FoundItemTitle = found.Title,
                ConfidenceScore = match.ConfidenceScore, MatchedAttributes = attributes,
                Explanation = attributes.Count == 0 ? "Potential match based on report details and timing." : $"Potential match based on {string.Join(" and ", attributes.Select(attribute => attribute.ToLowerInvariant()))}.",
                LostCategoryName = categories.FirstOrDefault(category => category.Id == lost.CategoryId)?.Name,
                LostLocationName = lost.LocationDetails ?? FormatLocation(lostLocation),
                FoundCategoryName = categories.FirstOrDefault(category => category.Id == found.CategoryId)?.Name,
                FoundLocationName = found.LocationDetails ?? FormatLocation(foundLocation),
                FoundImageUrl = images.FirstOrDefault(image => image.FoundItemId == found.Id)?.Url
            };
        }).OrderByDescending(match => match.ConfidenceScore).ToList();
    }

    private async Task<IReadOnlyList<MatchDto>> AnalysePairsAsync(IReadOnlyList<LostItem> lostItems, IReadOnlyList<FoundItem> foundItems, CancellationToken cancellationToken)
    {
        var lostImages = (await imageRepository.GetByLostItemIdsAsync(lostItems.Select(item => item.Id).ToArray(), cancellationToken)).Where(image => image.LostItemId.HasValue).GroupBy(image => image.LostItemId!.Value).ToDictionary(group => group.Key, group => (IReadOnlyList<string>)group.Select(image => image.Url).ToList());
        var foundImages = (await imageRepository.GetByFoundItemIdsAsync(foundItems.Select(item => item.Id).ToArray(), cancellationToken)).Where(image => image.FoundItemId.HasValue).GroupBy(image => image.FoundItemId!.Value).ToDictionary(group => group.Key, group => (IReadOnlyList<string>)group.Select(image => image.Url).ToList());
        var locations = (await referenceDataService.GetLocationsAsync(cancellationToken)).ToDictionary(location => location.Id);
        var matches = new List<MatchDto>();
        foreach (var lost in lostItems)
        foreach (var found in foundItems)
        {
            var match = await AnalyseAsync(lost, found, lostImages.GetValueOrDefault(lost.Id, []), foundImages.GetValueOrDefault(found.Id, []), locations, cancellationToken);
            if (match.ConfidenceScore >= SuggestionThreshold) matches.Add(match);
        }
        return matches;
    }

    private async Task<MatchDto> AnalyseAsync(LostItem lost, FoundItem found, IReadOnlyCollection<string> lostImages, IReadOnlyCollection<string> foundImages, IReadOnlyDictionary<Guid, ReferenceLocationDto> locations, CancellationToken cancellationToken)
    {
        var signals = new List<(decimal Weight, decimal Value, string Label)>();
        var text = (TextSimilarity($"{lost.Title} {lost.Description} {NormalizeCampusLocation(lost.LocationDetails)}", $"{found.Title} {found.Description} {NormalizeCampusLocation(found.LocationDetails)}") + TextSimilarity(lost.Title, found.Title)) / 2m;
        signals.Add((32m, text, "Similar description and identifying details"));
        if (lost.CategoryId.HasValue && found.CategoryId.HasValue) signals.Add((22m, lost.CategoryId == found.CategoryId ? 1m : 0m, "Same item category"));
        if (!string.IsNullOrWhiteSpace(lost.LocationDetails) && !string.IsNullOrWhiteSpace(found.LocationDetails))
        {
            signals.Add((16m, TextSimilarity(NormalizeCampusLocation(lost.LocationDetails), NormalizeCampusLocation(found.LocationDetails)), "Similar reported location"));
        }
        else if (lost.LocationId.HasValue && found.LocationId.HasValue)
        {
            locations.TryGetValue(lost.LocationId.Value, out var lostLocation);
            locations.TryGetValue(found.LocationId.Value, out var foundLocation);
            var locationSignal = lost.LocationId == found.LocationId && (lostLocation is null || foundLocation is null)
                ? (Value: 1m, Label: "Same reported location")
                : GetLocationSignal(lostLocation, foundLocation);
            signals.Add((16m, locationSignal.Value, locationSignal.Label));
        }
        if (lost.LostAt.HasValue && found.FoundAt.HasValue) signals.Add((12m, TimeCompatibility(lost.LostAt.Value, found.FoundAt.Value), "Compatible lost/found date and time"));
        var visualSimilarity = await imageSimilarityService.GetBestSimilarityAsync(lostImages, foundImages, cancellationToken);
        if (visualSimilarity.HasValue) signals.Add((18m, visualSimilarity.Value, "High visual similarity between report images"));

        var score = signals.Sum(signal => signal.Weight) == 0 ? 0 : signals.Sum(signal => signal.Weight * signal.Value) / signals.Sum(signal => signal.Weight) * 100m;
        var matched = signals.Where(signal => signal.Value >= .55m || signal.Label == "Same block").OrderByDescending(signal => signal.Weight * signal.Value).Select(signal => signal.Label).ToList();
        if (matched.Count == 0 && text >= .3m) matched.Add("Some overlap in the item descriptions");
        return new MatchDto
        {
            Id = Guid.NewGuid(),
            LostItemId = lost.Id, LostItemTitle = lost.Title, LostItemUserId = lost.UserId, FoundItemId = found.Id, FoundItemTitle = found.Title, FoundItemUserId = found.UserId,
            ConfidenceScore = Math.Round(Math.Min(score, 100m), 2), MatchedAttributes = matched,
            Explanation = matched.Count == 0 ? "Potential match based on available report details; review manually." : $"Potential match based on {string.Join(", ", matched.Select(value => value.ToLowerInvariant()))}."
        };
    }

    private static (decimal Value, string Label) GetLocationSignal(ReferenceLocationDto? lost, ReferenceLocationDto? found)
    {
        if (lost is null || found is null || !lost.BuildingId.HasValue || lost.BuildingId != found.BuildingId)
            return (0m, "Different block");
        if (lost.Id == found.Id)
            return (1m, "Same location");
        if (lost.FloorId.HasValue && lost.FloorId == found.FloorId)
            return (.625m, "Same floor");
        return (.3125m, "Same block");
    }

    private static (decimal Value, string Label) GetReportedLocationSignal(LostItem lost, FoundItem found, ReferenceLocationDto? lostLocation, ReferenceLocationDto? foundLocation)
    {
        if (!string.IsNullOrWhiteSpace(lost.LocationDetails) && !string.IsNullOrWhiteSpace(found.LocationDetails))
            return (TextSimilarity(NormalizeCampusLocation(lost.LocationDetails), NormalizeCampusLocation(found.LocationDetails)), "Similar reported location");

        return lost.LocationId == found.LocationId && (lostLocation is null || foundLocation is null)
            ? (1m, "Same reported location")
            : GetLocationSignal(lostLocation, foundLocation);
    }

    private static string? FormatLocation(ReferenceLocationDto? location)
    {
        if (location is null) return null;
        return string.Join(" • ", new[] { location.BuildingName, location.FloorName, location.Name }
            .Where(value => !string.IsNullOrWhiteSpace(value)));
    }

    private async Task PersistNewSuggestionsAsync(IReadOnlyList<MatchDto> suggestions, CancellationToken cancellationToken)
    {
        foreach (var suggestion in suggestions)
        {
            if (await matchRepository.ExistsAsync(suggestion.LostItemId, suggestion.FoundItemId, cancellationToken)) continue;
            await matchRepository.AddAsync(new Match { Id = Guid.NewGuid(), LostItemId = suggestion.LostItemId, FoundItemId = suggestion.FoundItemId, ConfidenceScore = suggestion.ConfidenceScore }, cancellationToken);
            if (suggestion.ConfidenceScore >= NotificationThreshold)
                await notificationService.CreateAsync(suggestion.LostItemUserId, $"Possible match found: Your {suggestion.LostItemTitle} has a {Math.Round(suggestion.ConfidenceScore)}% match with a recently found item.", cancellationToken);
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

    private static string NormalizeCampusLocation(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        var normalized = value.ToLowerInvariant().Replace('-', ' ');
        normalized = Regex.Replace(normalized, @"\b(?:block\s*([a-z])|([a-z])\s*block)\b", match => $" block{(match.Groups[1].Success ? match.Groups[1].Value : match.Groups[2].Value)} ");
        normalized = Regex.Replace(normalized, @"\b(?:floor|level)\s*(\d+)\b|\b(\d+)(?:st|nd|rd|th)?\s*(?:floor|level)\b", match => $" floor{(match.Groups[1].Success ? match.Groups[1].Value : match.Groups[2].Value)} ");
        normalized = Regex.Replace(normalized, @"\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s*(?:floor|level)\b", match => $" floor{OrdinalFloor(match.Groups[1].Value)} ");
        return normalized.Replace("elevator", "lift", StringComparison.Ordinal);
    }

    private static int OrdinalFloor(string value) => value switch
    {
        "first" => 1, "second" => 2, "third" => 3, "fourth" => 4, "fifth" => 5,
        "sixth" => 6, "seventh" => 7, "eighth" => 8, "ninth" => 9, "tenth" => 10,
        _ => 0
    };

    private static HashSet<string> Tokenize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return [];
        var aliases = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) { ["cellphone"] = "phone", ["mobile"] = "phone", ["spectacles"] = "glasses", ["purse"] = "wallet", ["backpack"] = "bag" };
        var ignored = new HashSet<string>(["the", "and", "with", "from", "near", "item", "lost", "found", "was", "this", "that", "have"]);
        return value.ToLowerInvariant().Split([' ', ',', '.', '-', '_', '/', '\\', ':', ';', '(', ')'], StringSplitOptions.RemoveEmptyEntries).Where(token => token.Length > 2 && !ignored.Contains(token)).Select(token => aliases.GetValueOrDefault(token, token)).ToHashSet();
    }
}

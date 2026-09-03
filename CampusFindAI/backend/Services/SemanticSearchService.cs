using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using CampusFindAI.Api.Data;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Services;

/// <summary>
/// Semantic AI Search — completely separate from AI Smart Matching.
///
/// Flow:
///   1. Send user query to Gemini REST API → receive structured JSON intent
///   2. Validate / parse JSON (falls back to keyword-only on any failure)
///   3. Fetch LostItems + FoundItems via existing repositories (no full DB dump to AI)
///   4. Filter + rank in-memory using the structured intent
///   5. Return SemanticSearchResponseDto
///
/// The AI only interprets; the database is always the single source of truth.
/// </summary>
public class SemanticSearchService(
    ILostItemRepository lostItemRepository,
    IFoundItemRepository foundItemRepository,
    IImageRepository imageRepository,
    ApplicationDbContext dbContext,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<SemanticSearchService> logger)
    : ISemanticSearchService
{
    private const string GeminiUrlTemplate =
        "https://generativelanguage.googleapis.com/v1beta/models/{0}:generateContent?key={1}";

    private const string PromptTemplate = """
        You are a university Lost & Found search assistant.
        Return ONLY a single valid JSON object — no markdown, no explanation.

        JSON schema (all fields required, use null where unknown):
        {
          "intent":     "lost_item" | "found_item" | "unknown",
          "item":       string | null,
          "category":   string | null,
          "color":      string | null,
          "location":   string | null,
          "dateFrom":   "YYYY-MM-DD" | null,
          "dateTo":     "YYYY-MM-DD" | null,
          "keywords":   [string],
          "confidence": number
        }

        Rules:
        - intent: "lost_item" if the user is looking for something they lost. "found_item" if they found something. "unknown" if unclear.
        - item: the physical item name (e.g. "wallet", "ID card", "water bottle"). null if vague.
        - category: best-fit category (e.g. "wallet", "electronics", "bag", "keys", "id card", "clothing"). null if unknown.
        - color: only if explicitly stated (e.g. "black", "blue"). null otherwise.
        - location: campus location keyword only if stated (e.g. "library", "cafeteria"). null if not mentioned.
        - dateFrom/dateTo: resolve relative dates using today's UTC date: TODAY_DATE.
            "yesterday" → dateFrom=yesterday, dateTo=yesterday
            "today"/"this morning" → dateFrom=today, dateTo=today
            "last week" → dateFrom=7 days ago, dateTo=today
            null if no date mentioned.
        - keywords: 2-5 meaningful search terms from the query. Empty array [] if none.
        - confidence: 0.0–1.0. Use ≤0.3 for vague queries. Do NOT hallucinate item names or locations.
        - If query is very vague (e.g. "I lost something"), return item=null, location=null, keywords=[], confidence≤0.3.

        Today's UTC date: TODAY_DATE
        User query: USER_QUERY
        """;

    // ── Public entry point ────────────────────────────────────────────────────

    public async Task<SemanticSearchResponseDto> SearchAsync(
        string query,
        CancellationToken cancellationToken = default)
    {
        var sw = Stopwatch.StartNew();
        var searchId = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        var sanitizedQuery = SanitizeQuery(query);

        logger.LogInformation("[SemanticSearch:{Id}] Query: \"{Q}\"", searchId, sanitizedQuery);

        // 1. AI interpretation (best-effort; falls back on any error)
        SemanticQueryDto? intent = null;
        var aiInterpreted = false;
        try
        {
            intent = await InterpretWithGeminiAsync(sanitizedQuery, searchId, cancellationToken);
            aiInterpreted = intent is not null;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex,
                "[SemanticSearch:{Id}] Gemini failed; using keyword fallback.", searchId);
        }

        // 2. Load all items + metadata
        var (lostItems, foundItems, lostImageLookup, foundImageLookup, categories, locations) =
            await LoadAllDataAsync(cancellationToken);

        // 3. Build & rank results
        var results = BuildAndRankResults(
            sanitizedQuery, intent,
            lostItems, foundItems,
            lostImageLookup, foundImageLookup,
            categories.ToDictionary(c => c.Id, c => c.Name),
            locations.ToDictionary(l => l.Id, l => l.Name));

        sw.Stop();

        logger.LogInformation(
            "[SemanticSearch:{Id}] Done. AiOk={Ok} Results={N} {Ms}ms",
            searchId, aiInterpreted, results.Count, sw.ElapsedMilliseconds);

        return new SemanticSearchResponseDto
        {
            Query = sanitizedQuery,
            InterpretedQuery = intent,
            AiInterpreted = aiInterpreted,
            Results = results,
            TotalResults = results.Count,
            SearchId = searchId,
            ProcessingMs = sw.ElapsedMilliseconds,
        };
    }

    // ── Gemini HTTP call ──────────────────────────────────────────────────────

    private async Task<SemanticQueryDto?> InterpretWithGeminiAsync(
        string query, string searchId, CancellationToken cancellationToken)
    {
        var apiKey = configuration["Gemini:ApiKey"];
        var model  = configuration["Gemini:Model"] ?? "gemini-2.0-flash";

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey is "YOUR_GEMINI_API_KEY_HERE")
        {
            logger.LogWarning("[SemanticSearch:{Id}] Gemini API key not set; keyword fallback.", searchId);
            return null;
        }

        var today  = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var prompt = PromptTemplate
            .Replace("TODAY_DATE", today)
            .Replace("USER_QUERY", query);

        var requestBody = new
        {
            contents = new[] { new { parts = new[] { new { text = prompt } } } },
            generationConfig = new { temperature = 0.1, maxOutputTokens = 512 }
        };

        var url = string.Format(GeminiUrlTemplate, model, apiKey);
        using var http    = httpClientFactory.CreateClient("Gemini");
        using var content = new StringContent(
            JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        var aiSw = Stopwatch.StartNew();
        using var response = await http.PostAsync(url, content, cancellationToken);
        aiSw.Stop();

        logger.LogInformation(
            "[SemanticSearch:{Id}] Gemini {Status} in {Ms}ms",
            searchId, (int)response.StatusCode, aiSw.ElapsedMilliseconds);

        if (!response.IsSuccessStatusCode)
        {
            var errText = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogWarning(
                "[SemanticSearch:{Id}] Gemini error {Status}: {Err}",
                searchId, (int)response.StatusCode,
                errText.Length > 400 ? errText[..400] : errText);
            return null;
        }

        var rawJson = await response.Content.ReadAsStringAsync(cancellationToken);
        return ParseGeminiResponse(rawJson, searchId);
    }

    private SemanticQueryDto? ParseGeminiResponse(string rawJson, string searchId)
    {
        try
        {
            using var doc = JsonDocument.Parse(rawJson);

            // Gemini response shape: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            if (string.IsNullOrWhiteSpace(text))
            {
                logger.LogWarning("[SemanticSearch:{Id}] Gemini returned empty text.", searchId);
                return null;
            }

            // Strip markdown code fences if present
            text = text.Trim();
            if (text.StartsWith("```"))
            {
                var newline = text.IndexOf('\n');
                if (newline >= 0) text = text[(newline + 1)..];
                if (text.EndsWith("```")) text = text[..text.LastIndexOf("```")];
                text = text.Trim();
            }

            var opts   = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var parsed = JsonSerializer.Deserialize<GeminiIntentRaw>(text, opts);

            if (parsed is null)
            {
                logger.LogWarning("[SemanticSearch:{Id}] Deserialization returned null.", searchId);
                return null;
            }

            DateTime? dateFrom = null, dateTo = null;
            if (!string.IsNullOrWhiteSpace(parsed.DateFrom) &&
                DateTime.TryParse(parsed.DateFrom, out var df)) dateFrom = df;
            if (!string.IsNullOrWhiteSpace(parsed.DateTo) &&
                DateTime.TryParse(parsed.DateTo, out var dt)) dateTo = dt;

            logger.LogInformation(
                "[SemanticSearch:{Id}] AI → intent={Intent} item={Item} loc={Loc} conf={C:F2}",
                searchId, parsed.Intent, parsed.Item, parsed.Location,
                Math.Clamp(parsed.Confidence, 0, 1));

            return new SemanticQueryDto
            {
                Intent     = parsed.Intent,
                Item       = NullIfEmpty(parsed.Item),
                Category   = NullIfEmpty(parsed.Category),
                Color      = NullIfEmpty(parsed.Color),
                Location   = NullIfEmpty(parsed.Location),
                DateFrom   = dateFrom,
                DateTo     = dateTo,
                Keywords   = parsed.Keywords ?? [],
                Confidence = Math.Clamp(parsed.Confidence, 0, 1),
            };
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[SemanticSearch:{Id}] Could not parse Gemini response.", searchId);
            return null;
        }
    }

    // ── Data loading ──────────────────────────────────────────────────────────

    private async Task<(
        IReadOnlyList<LostItem>  LostItems,
        IReadOnlyList<FoundItem> FoundItems,
        ILookup<Guid, string>    LostImageLookup,
        ILookup<Guid, string>    FoundImageLookup,
        List<Category>           Categories,
        List<Location>           Locations)>
        LoadAllDataAsync(CancellationToken ct)
    {
        // Raw SqlClient repositories open their own connections — safe to run in parallel.
        var lostTask  = lostItemRepository.GetAllAsync(ct);
        var foundTask = foundItemRepository.GetAllAsync(ct);
        await Task.WhenAll(lostTask, foundTask);

        var lostItems  = lostTask.Result;
        var foundItems = foundTask.Result;

        // EF Core DbContext is NOT thread-safe — these MUST run sequentially.
        var categories = await dbContext.Categories.AsNoTracking().ToListAsync(ct);
        var locations  = await dbContext.Locations.AsNoTracking().ToListAsync(ct);

        // Image repositories also use raw SqlClient — safe to run in parallel.
        var lostImagesTask  = imageRepository.GetByLostItemIdsAsync(
            lostItems.Select(x => x.Id).ToArray(), ct);
        var foundImagesTask = imageRepository.GetByFoundItemIdsAsync(
            foundItems.Select(x => x.Id).ToArray(), ct);
        await Task.WhenAll(lostImagesTask, foundImagesTask);

        return (
            lostItems, foundItems,
            lostImagesTask.Result
                .Where(i => i.LostItemId.HasValue)
                .ToLookup(i => i.LostItemId!.Value, i => i.Url),
            foundImagesTask.Result
                .Where(i => i.FoundItemId.HasValue)
                .ToLookup(i => i.FoundItemId!.Value, i => i.Url),
            categories, locations);
    }


    // ── Ranking ───────────────────────────────────────────────────────────────

    private static IReadOnlyList<SemanticSearchItemDto> BuildAndRankResults(
        string rawQuery,
        SemanticQueryDto? intent,
        IReadOnlyList<LostItem>  lostItems,
        IReadOnlyList<FoundItem> foundItems,
        ILookup<Guid, string>    lostImages,
        ILookup<Guid, string>    foundImages,
        Dictionary<Guid, string> categoryMap,
        Dictionary<Guid, string> locationMap)
    {
        // When AI is unavailable, use raw query tokens as keywords
        var fallbackTokens = Tokenize(rawQuery);
        var effectiveKeywords = intent is not null
            ? intent.Keywords.SelectMany(Tokenize)
                .Concat(Tokenize(intent.Item))
                .Concat(Tokenize(intent.Category))
                .Distinct()
                .ToList()
            : fallbackTokens;

        var results = new List<SemanticSearchItemDto>();

        foreach (var item in lostItems)
        {
            var score = ComputeScore(
                Tokenize(item.Title), Tokenize(item.Description),
                item.CategoryId, item.LocationId, item.LostAt,
                item.Title, item.Description,
                intent, effectiveKeywords, fallbackTokens, categoryMap, locationMap);

            if (score > 0)
                results.Add(new SemanticSearchItemDto
                {
                    Id           = item.Id,
                    Type         = "lost",
                    Title        = item.Title,
                    Description  = item.Description,
                    CategoryId   = item.CategoryId,
                    CategoryName = item.CategoryId.HasValue ? categoryMap.GetValueOrDefault(item.CategoryId.Value) : null,
                    LocationId   = item.LocationId,
                    LocationName = item.LocationId.HasValue ? locationMap.GetValueOrDefault(item.LocationId.Value) : null,
                    Date         = item.LostAt,
                    Status       = item.Status,
                    ImageUrls    = lostImages[item.Id].ToList(),
                    RelevanceScore = Math.Round(score, 1),
                });
        }

        foreach (var item in foundItems)
        {
            var score = ComputeScore(
                Tokenize(item.Title), Tokenize(item.Description),
                item.CategoryId, item.LocationId, item.FoundAt,
                item.Title, item.Description,
                intent, effectiveKeywords, fallbackTokens, categoryMap, locationMap);

            if (score > 0)
                results.Add(new SemanticSearchItemDto
                {
                    Id           = item.Id,
                    Type         = "found",
                    Title        = item.Title,
                    Description  = item.Description,
                    CategoryId   = item.CategoryId,
                    CategoryName = item.CategoryId.HasValue ? categoryMap.GetValueOrDefault(item.CategoryId.Value) : null,
                    LocationId   = item.LocationId,
                    LocationName = item.LocationId.HasValue ? locationMap.GetValueOrDefault(item.LocationId.Value) : null,
                    Date         = item.FoundAt,
                    Status       = null,   // FoundItem has no Status column
                    ImageUrls    = foundImages[item.Id].ToList(),
                    RelevanceScore = Math.Round(score, 1),
                });
        }

        return results.OrderByDescending(r => r.RelevanceScore).ToList();
    }

    private static double ComputeScore(
        IReadOnlyList<string>    titleTokens,
        IReadOnlyList<string>    descTokens,
        Guid?                    categoryId,
        Guid?                    locationId,
        DateTime?                itemDate,
        string?                  rawTitle,
        string?                  rawDesc,
        SemanticQueryDto?        intent,
        IReadOnlyList<string>    keywords,
        IReadOnlyList<string>    fallbackTokens,
        Dictionary<Guid, string> categoryMap,
        Dictionary<Guid, string> locationMap)
    {
        double score = 0;
        var allTokens = titleTokens.Concat(descTokens).ToList();

        // ① Item name match (weight 40 title / 12 desc)
        if (intent?.Item is not null)
        {
            var iTokens = Tokenize(intent.Item);
            if (iTokens.Count > 0)
            {
                score += (double)iTokens.Intersect(titleTokens, StringComparer.OrdinalIgnoreCase).Count()
                         / iTokens.Count * 40;
                score += (double)iTokens.Intersect(descTokens, StringComparer.OrdinalIgnoreCase).Count()
                         / iTokens.Count * 12;
            }
        }

        // ② Category match (weight 22)
        if (intent?.Category is not null && categoryId.HasValue &&
            categoryMap.TryGetValue(categoryId.Value, out var catName))
        {
            if (ContainsCI(catName, intent.Category) || ContainsCI(intent.Category, catName))
                score += 22;
        }

        // ③ Location match (weight 18)
        if (intent?.Location is not null && locationId.HasValue &&
            locationMap.TryGetValue(locationId.Value, out var locName))
        {
            if (ContainsCI(locName, intent.Location) || ContainsCI(intent.Location, locName))
                score += 18;
        }

        // ④ Date range match (weight 12)
        if (intent is not null && (intent.DateFrom.HasValue || intent.DateTo.HasValue) && itemDate.HasValue)
        {
            var from = intent.DateFrom ?? DateTime.MinValue;
            var to   = (intent.DateTo ?? DateTime.MaxValue).AddDays(1);
            if (itemDate >= from && itemDate <= to) score += 12;
        }

        // ⑤ Color in title/description (weight 10)
        if (intent?.Color is not null)
        {
            if (ContainsCI(rawTitle, intent.Color) || ContainsCI(rawDesc, intent.Color))
                score += 10;
        }

        // ⑥ Keyword overlap (weight 6 each)
        score += keywords.Count(k => allTokens.Contains(k, StringComparer.OrdinalIgnoreCase)) * 6;

        // ⑦ Raw token fallback when no AI (weight 8 each)
        if (intent is null)
            score += fallbackTokens.Count(k => allTokens.Contains(k, StringComparer.OrdinalIgnoreCase)) * 8;

        return Math.Min(score, 100);
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private static string SanitizeQuery(string query)
    {
        if (string.IsNullOrWhiteSpace(query)) return string.Empty;
        query = query.Trim();
        return query.Length > 500 ? query[..500] : query;
    }

    private static IReadOnlyList<string> Tokenize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return [];
        var stop = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "the","and","with","from","near","item","lost","found","was","this",
            "that","have","my","i","a","an","in","at","on","to","of","for",
            "is","it","its","by","or","if","someone","around","about","some"
        };
        return value.ToLowerInvariant()
            .Split([' ',',','.','-','_','/','\\',':',';','(',')','\n','\r'], StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length > 1 && !stop.Contains(t))
            .Distinct()
            .ToList();
    }

    private static bool ContainsCI(string? s, string? sub)
        => s != null && sub != null && s.Contains(sub, StringComparison.OrdinalIgnoreCase);

    private static string? NullIfEmpty(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    // ── Raw Gemini DTO (internal parse model) ─────────────────────────────────

    private sealed class GeminiIntentRaw
    {
        [JsonPropertyName("intent")]    public string?       Intent     { get; set; }
        [JsonPropertyName("item")]      public string?       Item       { get; set; }
        [JsonPropertyName("category")]  public string?       Category   { get; set; }
        [JsonPropertyName("color")]     public string?       Color      { get; set; }
        [JsonPropertyName("location")]  public string?       Location   { get; set; }
        [JsonPropertyName("dateFrom")]  public string?       DateFrom   { get; set; }
        [JsonPropertyName("dateTo")]    public string?       DateTo     { get; set; }
        [JsonPropertyName("keywords")]  public List<string>? Keywords   { get; set; }
        [JsonPropertyName("confidence")]public double        Confidence { get; set; }
    }
}

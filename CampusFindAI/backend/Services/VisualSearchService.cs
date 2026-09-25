using System.Text.Json;
using CampusFindAI.Api.Data;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Services;

public sealed class VisualSearchService(ApplicationDbContext db, IVisualEmbeddingProvider provider, IReportImageStorage imageStorage, IWebHostEnvironment environment, IConfiguration configuration, ILogger<VisualSearchService> logger) : IVisualSearchService
{
    public async Task<VisualSearchResponseDto> SearchAsync(IFormFile image, CancellationToken ct = default)
    {
        imageStorage.Validate([image]);

        logger.LogInformation("Visual search requested; bytes={Bytes}", image.Length);
        float[] query;
        try
        {
            await using var stream = image.OpenReadStream();
            query = await provider.EmbedAsync(stream, image.ContentType, ct);
        }
        catch (Exception ex) when (ex is not ArgumentException && ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Visual search query embedding failed.");
            throw new VisualSearchUnavailableException();
        }

        var candidates = await (from item in db.FoundItems.AsNoTracking()
                                join photo in db.Images.AsNoTracking() on item.Id equals photo.FoundItemId
                                where item.Status == "Available"
                                select new { Item = item, Photo = photo }).ToListAsync(ct);
        logger.LogInformation("Visual search candidates loaded; count={Count}", candidates.Count);
        var matches = new List<VisualSearchMatchDto>();
        foreach (var candidate in candidates)
        {
            var stored = await db.VisualEmbeddings.FirstOrDefaultAsync(x => x.ImageId == candidate.Photo.Id && x.Model == provider.Model, ct);
            if (stored is null)
            {
                try
                {
                    var path = SafePath(candidate.Photo.Url);
                    if (path is null || !File.Exists(path)) continue;
                    await using var stream = File.OpenRead(path);
                    var vector = await provider.EmbedAsync(stream, ContentTypeFor(path), ct);
                    stored = new VisualEmbedding { Id = Guid.NewGuid(), ImageId = candidate.Photo.Id, Model = provider.Model, VectorJson = JsonSerializer.Serialize(vector) };
                    db.VisualEmbeddings.Add(stored);
                    await db.SaveChangesAsync(ct);
                    logger.LogInformation("Visual embedding generated for report image {ImageId}", candidate.Photo.Id);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogWarning(ex, "Visual embedding generation failed for report image {ImageId}", candidate.Photo.Id);
                    continue;
                }
            }
            float[] vectorStored;
            try { vectorStored = JsonSerializer.Deserialize<float[]>(stored.VectorJson) ?? []; }
            catch (JsonException) { continue; }
            var score = Cosine(query, vectorStored);
            var threshold = configuration.GetValue("VisualSearch:SimilarityThreshold", 0.55);
            if (score < threshold) continue;
            matches.Add(new VisualSearchMatchDto { FoundItemId = candidate.Item.Id, Title = candidate.Item.Title, Description = candidate.Item.Description, ImageUrl = candidate.Photo.Url, SimilarityScore = (decimal)score, SimilarityPercentage = (int)Math.Round(Math.Clamp(score, 0, 1) * 100) });
        }

        var max = Math.Clamp(configuration.GetValue("VisualSearch:MaxResults", 5), 1, 20);
        var results = matches.GroupBy(x => x.FoundItemId).Select(x => x.OrderByDescending(m => m.SimilarityScore).First()).OrderByDescending(x => x.SimilarityScore).Take(max).ToList();
        logger.LogInformation("Visual search completed; matches={Count}", results.Count);
        return new VisualSearchResponseDto { Matches = results, Message = results.Count == 0 ? "No visually similar items were found." : "Possible matches" };
    }

    private string? SafePath(string url)
    {
        const string prefix = "/uploads/reports/";
        if (!url.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return null;
        var name = Path.GetFileName(url[prefix.Length..]);
        return string.IsNullOrWhiteSpace(name) ? null : Path.Combine(environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"), "uploads", "reports", name);
    }
    private static string ContentTypeFor(string path) => Path.GetExtension(path).ToLowerInvariant() switch { ".png" => "image/png", ".webp" => "image/webp", _ => "image/jpeg" };
    public static double Cosine(IReadOnlyList<float> a, IReadOnlyList<float> b)
    {
        if (a.Count == 0 || a.Count != b.Count) return -1;
        double dot = 0, aa = 0, bb = 0;
        for (var i = 0; i < a.Count; i++) { dot += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
        return aa == 0 || bb == 0 ? -1 : Math.Clamp(dot / Math.Sqrt(aa * bb), -1, 1);
    }
}

public sealed class VisualSearchUnavailableException : Exception
{
    public VisualSearchUnavailableException() : base("Visual search is temporarily unavailable. Please try again later.") { }
}

namespace CampusFindAI.Api.Services;

/// <summary>Provides a bounded, local visual comparison for report photos.</summary>
public interface IImageSimilarityService
{
    Task<decimal?> GetBestSimilarityAsync(IReadOnlyCollection<string> leftImageUrls, IReadOnlyCollection<string> rightImageUrls, CancellationToken cancellationToken = default);
}

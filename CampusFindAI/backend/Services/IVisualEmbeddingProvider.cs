namespace CampusFindAI.Api.Services;

/// <summary>Provider boundary for multimodal image vector generation.</summary>
public interface IVisualEmbeddingProvider
{
    string Model { get; }
    Task<float[]> EmbedAsync(Stream image, string contentType, CancellationToken cancellationToken = default);
}

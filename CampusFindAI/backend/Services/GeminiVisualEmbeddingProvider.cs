using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace CampusFindAI.Api.Services;

public sealed class GeminiVisualEmbeddingProvider(IHttpClientFactory clients, IConfiguration configuration) : IVisualEmbeddingProvider
{
    private const int LocalSampleSize = 16;

    // Keep cached local vectors separate from Gemini vectors. This lets a
    // development install work without a cloud key and avoids mixing vector
    // dimensions when a key is added later.
    public string Model => HasGeminiKey
        ? configuration["VisualSearch:Model"] ?? "gemini-embedding-2"
        : "local-rgba-16";

    private bool HasGeminiKey => !string.IsNullOrWhiteSpace(configuration["Gemini:ApiKey"]);

    public async Task<float[]> EmbedAsync(Stream image, string contentType, CancellationToken cancellationToken = default)
    {
        var key = configuration["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(key))
        {
            return await EmbedLocallyAsync(image, cancellationToken);
        }
        using var memory = new MemoryStream();
        await image.CopyToAsync(memory, cancellationToken);
        var body = new
        {
            content = new { parts = new[] { new { inline_data = new { mime_type = contentType, data = Convert.ToBase64String(memory.ToArray()) } } } },
            output_dimensionality = 768
        };
        using var request = new HttpRequestMessage(HttpMethod.Post, $"https://generativelanguage.googleapis.com/v1beta/models/{Model}:embedContent");
        request.Headers.Add("x-goog-api-key", key);
        request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        using var response = await clients.CreateClient("Gemini").SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        return document.RootElement.GetProperty("embedding").GetProperty("values").EnumerateArray().Select(x => x.GetSingle()).ToArray();
    }

    /// <summary>
    /// A bounded on-device visual fingerprint for local development. It is not
    /// presented as identity proof; it simply keeps photo search useful when a
    /// Gemini API key has not been configured.
    /// </summary>
    private static async Task<float[]> EmbedLocallyAsync(Stream image, CancellationToken cancellationToken)
    {
        using var decoded = await Image.LoadAsync<Rgba32>(image, cancellationToken);
        decoded.Mutate(context => context.Resize(LocalSampleSize, LocalSampleSize));

        var vector = new float[LocalSampleSize * LocalSampleSize * 3];
        var index = 0;
        for (var y = 0; y < LocalSampleSize; y++)
        {
            for (var x = 0; x < LocalSampleSize; x++)
            {
                var pixel = decoded[x, y];
                vector[index++] = pixel.R / 255f;
                vector[index++] = pixel.G / 255f;
                vector[index++] = pixel.B / 255f;
            }
        }

        return vector;
    }
}

using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace CampusFindAI.Api.Services;

public sealed class GeminiVisualEmbeddingProvider(IHttpClientFactory clients, IConfiguration configuration) : IVisualEmbeddingProvider
{
    public string Model => configuration["VisualSearch:Model"] ?? "gemini-embedding-2";

    public async Task<float[]> EmbedAsync(Stream image, string contentType, CancellationToken cancellationToken = default)
    {
        var key = configuration["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(key)) throw new InvalidOperationException("Visual search provider is not configured.");
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
}

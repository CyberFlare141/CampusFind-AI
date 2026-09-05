using System.Text;
using System.Text.Json;

namespace CampusFindAI.Api.Services;

public sealed record OwnershipQuestion(string Question, string ExpectedAnswer, string Type = "text");
public sealed record OwnershipQuestionGenerationResult(IReadOnlyList<OwnershipQuestion> Questions, bool FallbackUsed);

public interface IOwnershipQuestionGenerator
{
    Task<OwnershipQuestionGenerationResult> GenerateAsync(string privateDetails, int questionCount, CancellationToken cancellationToken = default);
}


/// <summary>Server-only Gemini adapter. It is deliberately behind interfaces so tests never need Gemini or the network.</summary>
public sealed class GeminiOwnershipQuestionGenerator(IHttpClientFactory clients, IConfiguration configuration, ILogger<GeminiOwnershipQuestionGenerator> logger) : IOwnershipQuestionGenerator
{
    public async Task<OwnershipQuestionGenerationResult> GenerateAsync(string privateDetails, int questionCount, CancellationToken cancellationToken = default)
    {
        var prompt = $"""
            You generate ownership-verification questions for a campus lost-and-found system.
            PRIVATE identifying details are supplied below. Generate exactly {questionCount} short, non-leading questions.
            Never put a private fact or expected answer in the question. Do not ask about passwords, PINs, account numbers, or sensitive personal data.
            Return structured JSON only with a questions array. Each entry must include question and answer fields.
            PRIVATE DETAILS (server only): {privateDetails}
            """;
        var text = await GeminiCall.CallAsync(clients, configuration, prompt, cancellationToken);
        if (!string.IsNullOrWhiteSpace(text))
        {
            try
            {
                using var doc = JsonDocument.Parse(text);
                var questions = doc.RootElement.GetProperty("questions").EnumerateArray()
                    .Select(q => new OwnershipQuestion(q.GetProperty("question").GetString()?.Trim() ?? string.Empty, q.GetProperty("answer").GetString()?.Trim() ?? string.Empty))
                    .Where(q => q.Question.Length > 0 && q.ExpectedAnswer.Length > 0 && !q.Question.Contains(q.ExpectedAnswer, StringComparison.OrdinalIgnoreCase))
                    .Take(questionCount).ToList();
                if (questions.Count == questionCount) return new(questions, false);
            }
            catch (Exception ex) { logger.LogWarning(ex, "Gemini returned invalid ownership-question JSON; using safe fallback."); }
        }
        return new(CreateFallback(privateDetails, questionCount), true);
    }

    internal static IReadOnlyList<OwnershipQuestion> CreateFallback(string privateDetails, int count)
    {
        var references = privateDetails.Split(['.', ';', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(x => x.Length > 1).ToList();
        if (references.Count == 0) references.Add(privateDetails);
        string[] prompts = [
            "Describe any distinctive marks, wear, or damage on the item.",
            "Describe any distinctive inside detail, attachment, or accessory associated with the item.",
            "Describe any writing, sticker, marking, or other feature that would help identify the item.",
            "What other non-public characteristic would help identify this item?"
        ];
        return Enumerable.Range(0, count).Select(i => new OwnershipQuestion(prompts[i % prompts.Length], references[Math.Min(i, references.Count - 1)])).ToList();
    }
}

internal static class GeminiCall
{
    internal static async Task<string?> CallAsync(IHttpClientFactory clients, IConfiguration configuration, string prompt, CancellationToken cancellationToken)
    {
        var key = configuration["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(key) || key == "YOUR_GEMINI_API_KEY_HERE") return null;
        var model = configuration["Gemini:Model"] ?? "gemini-2.0-flash";
        using var content = new StringContent(JsonSerializer.Serialize(new { contents = new[] { new { parts = new[] { new { text = prompt } } } } }), Encoding.UTF8, "application/json");
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(10));
        using var response = await clients.CreateClient("Gemini").PostAsync($"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}", content, timeout.Token);
        if (!response.IsSuccessStatusCode) return null;
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(timeout.Token));
        var text = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString()?.Trim();
        return text?.Trim('`').Replace("json\n", string.Empty, StringComparison.OrdinalIgnoreCase).Trim();
    }
}

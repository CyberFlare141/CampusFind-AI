using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

/// <summary>
/// Converts a natural-language user query into structured search intent using the Gemini AI,
/// then queries the database and ranks results by relevance.
/// This is a distinct capability from the existing AI Smart Matching system.
/// </summary>
public interface ISemanticSearchService
{
    /// <summary>
    /// Performs a semantic search over Lost and Found items.
    /// Falls back to keyword-only search if the AI is unavailable.
    /// Never throws — returns a result with AiInterpreted=false on failure.
    /// </summary>
    Task<SemanticSearchResponseDto> SearchAsync(string query, CancellationToken cancellationToken = default);
}

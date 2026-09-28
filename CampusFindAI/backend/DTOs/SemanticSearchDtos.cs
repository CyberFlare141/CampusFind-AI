namespace CampusFindAI.Api.DTOs;

// ── Inbound ───────────────────────────────────────────────────────────────────

/// <summary>Request body for POST /api/search/semantic.</summary>
public class SemanticSearchRequestDto
{
    public string Query { get; set; } = string.Empty;
}

// ── AI interpretation result ───────────────────────────────────────────────────

/// <summary>
/// Structured query parsed from a natural-language string by the Gemini AI.
/// All fields are nullable — the AI should only populate what the query implies.
/// </summary>
public class SemanticQueryDto
{
    /// <summary>lost_item | found_item | unknown</summary>
    public string? Intent { get; set; }

    /// <summary>The item name extracted (e.g. "wallet", "water bottle").</summary>
    public string? Item { get; set; }

    /// <summary>Category keyword to match against Category.Name (e.g. "wallet", "electronics").</summary>
    public string? Category { get; set; }

    /// <summary>Color descriptor (e.g. "black", "blue").</summary>
    public string? Color { get; set; }

    /// <summary>Location keyword to match against Location.Name (e.g. "library", "cafeteria").</summary>
    public string? Location { get; set; }

    /// <summary>Lower date bound (inclusive). Null means no lower bound.</summary>
    public DateTime? DateFrom { get; set; }

    /// <summary>Upper date bound (inclusive). Null means no upper bound.</summary>
    public DateTime? DateTo { get; set; }

    /// <summary>Additional keywords to look for in title/description.</summary>
    public IReadOnlyList<string> Keywords { get; set; } = [];

    /// <summary>AI confidence in the interpretation (0–1).</summary>
    public double Confidence { get; set; }
}

// ── Search result item ─────────────────────────────────────────────────────────

/// <summary>A single search result — wraps either a LostItem or a FoundItem.</summary>
public class SemanticSearchItemDto
{
    public Guid Id { get; set; }

    /// <summary>"lost" or "found"</summary>
    public string Type { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public Guid? LocationId { get; set; }
    public string? LocationName { get; set; }
    public string? LocationDetails { get; set; }

    /// <summary>LostAt or FoundAt depending on Type.</summary>
    public DateTime? Date { get; set; }

    /// <summary>Only present for lost items.</summary>
    public string? Status { get; set; }

    public IReadOnlyList<string> ImageUrls { get; set; } = [];

    /// <summary>Relevance score 0–100. Higher is better.</summary>
    public double RelevanceScore { get; set; }
}

// ── Response ──────────────────────────────────────────────────────────────────

/// <summary>Full response returned from POST /api/search/semantic.</summary>
public class SemanticSearchResponseDto
{
    /// <summary>Original user query (sanitized).</summary>
    public string Query { get; set; } = string.Empty;

    /// <summary>Structured query as interpreted by AI. Null if AI was unavailable and keyword fallback was used.</summary>
    public SemanticQueryDto? InterpretedQuery { get; set; }

    /// <summary>Whether the AI interpretation was successful (true) or keyword fallback was used (false).</summary>
    public bool AiInterpreted { get; set; }

    public IReadOnlyList<SemanticSearchItemDto> Results { get; set; } = [];

    public int TotalResults { get; set; }

    /// <summary>Unique ID for this search request (for logging correlation).</summary>
    public string SearchId { get; set; } = string.Empty;

    /// <summary>Total server-side processing time in milliseconds.</summary>
    public long ProcessingMs { get; set; }
}

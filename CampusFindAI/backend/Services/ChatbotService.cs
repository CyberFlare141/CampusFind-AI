using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using CampusFindAI.Api.Data;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Services;

/// <summary>Controlled CampusFind capability router. Gemini is only a language fallback.</summary>
public sealed class ChatbotService(
    ApplicationDbContext db,
    ISemanticSearchService semanticSearch,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<ChatbotService> logger) : IChatbotService
{
    private static readonly ConcurrentDictionary<string, Queue<DateTime>> RequestWindows = new();
    private const int MaxRequestsPerMinute = 20;
    private static readonly Regex Bangla = new("[\\u0980-\\u09FF]", RegexOptions.Compiled);

    public async Task<ChatResponseDto> SendAsync(string userId, SendChatMessageDto request, CancellationToken cancellationToken = default)
    {
        var message = request.Message?.Trim() ?? string.Empty;
        if (message.Length is 0 or > 2000) throw new ArgumentException("Messages must contain 1 to 2,000 characters.");
        if (!WithinRateLimit(userId)) throw new InvalidOperationException("Please wait a moment before sending another assistant message.");

        var conversation = await GetOrCreateAsync(userId, request.ConversationId, message, cancellationToken);
        var sw = Stopwatch.StartNew();
        var capability = Classify(message);
        var response = await RouteAsync(userId, message, capability, cancellationToken);
        response.ConversationId = conversation.Id;
        response.CreatedAt = DateTime.UtcNow;

        // Verification answers and their details belong only in the dedicated secure workflow.
        if (!LooksLikeVerificationAnswer(message))
        {
            db.ChatHistories.Add(new ChatHistory { Id = Guid.NewGuid(), ConversationId = conversation.Id, UserId = userId, Role = "user", Message = message });
        }
        db.ChatHistories.Add(new ChatHistory { Id = Guid.NewGuid(), ConversationId = conversation.Id, UserId = userId, Role = "assistant", Message = response.Text, CreatedAt = response.CreatedAt });
        conversation.UpdatedAt = response.CreatedAt;
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("CampusFind chat completed conversation={ConversationId} user={UserId} capability={Capability} durationMs={Duration}", conversation.Id, userId, capability, sw.ElapsedMilliseconds);
        return response;
    }

    public async Task<IReadOnlyList<ChatConversationDto>> GetConversationsAsync(string userId, CancellationToken cancellationToken = default) =>
        await db.ChatConversations.AsNoTracking().Where(x => x.UserId == userId).OrderByDescending(x => x.UpdatedAt).Select(x => new ChatConversationDto { Id = x.Id, Title = x.Title, CreatedAt = x.CreatedAt, UpdatedAt = x.UpdatedAt }).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ChatMessageDto>?> GetMessagesAsync(string userId, Guid conversationId, CancellationToken cancellationToken = default)
    {
        var owned = await db.ChatConversations.AsNoTracking().AnyAsync(x => x.Id == conversationId && x.UserId == userId, cancellationToken);
        if (!owned) return null;
        return await db.ChatHistories.AsNoTracking().Where(x => x.ConversationId == conversationId && x.UserId == userId).OrderBy(x => x.CreatedAt).Select(x => new ChatMessageDto { Id = x.Id, Role = x.Role, Message = x.Message, CreatedAt = x.CreatedAt }).ToListAsync(cancellationToken);
    }

    public async Task<ChatConversationDto> CreateConversationAsync(string userId, CreateChatConversationDto request, CancellationToken cancellationToken = default)
    {
        var title = string.IsNullOrWhiteSpace(request.Title) ? "New conversation" : request.Title.Trim()[..Math.Min(120, request.Title.Trim().Length)];
        var item = new ChatConversation { Id = Guid.NewGuid(), UserId = userId, Title = title };
        db.ChatConversations.Add(item); await db.SaveChangesAsync(cancellationToken);
        return ToDto(item);
    }

    public async Task<bool> DeleteConversationAsync(string userId, Guid conversationId, CancellationToken cancellationToken = default)
    {
        var item = await db.ChatConversations.SingleOrDefaultAsync(x => x.Id == conversationId && x.UserId == userId, cancellationToken);
        if (item is null) return false;
        await db.ChatHistories.Where(x => x.ConversationId == conversationId).ExecuteDeleteAsync(cancellationToken);
        db.ChatConversations.Remove(item); await db.SaveChangesAsync(cancellationToken); return true;
    }

    public async Task ClearAsync(string userId, CancellationToken cancellationToken = default)
    {
        await db.ChatHistories.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        var items = await db.ChatConversations.Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        db.ChatConversations.RemoveRange(items); await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<ChatConversation> GetOrCreateAsync(string userId, Guid? id, string firstMessage, CancellationToken ct)
    {
        if (id is { } conversationId)
        {
            var owned = await db.ChatConversations.SingleOrDefaultAsync(x => x.Id == conversationId && x.UserId == userId, ct);
            if (owned is null) throw new KeyNotFoundException("Conversation not found.");
            return owned;
        }
        var conversation = new ChatConversation { Id = Guid.NewGuid(), UserId = userId, Title = TitleFor(firstMessage) };
        db.ChatConversations.Add(conversation); return conversation;
    }

    private async Task<ChatResponseDto> RouteAsync(string userId, string message, string capability, CancellationToken ct)
    {
        var bn = Bangla.IsMatch(message);
        string T(string english, string bangla) => bn ? bangla : english;
        switch (capability)
        {
            case "claims":
                var claims = await db.Claims.AsNoTracking().Where(x => x.ClaimantUserId == userId).OrderByDescending(x => x.CreatedAt).Take(5).Select(x => new ChatSummaryCardDto { Id = x.Id, Title = x.FoundItem!.Title, Status = x.Status, CreatedAt = x.CreatedAt, Route = "/my-claims", Detail = x.Verification == null ? null : x.Verification.Status }).ToListAsync(ct);
                return new ChatResponseDto { Type = "claims", Text = claims.Count == 0 ? T("You do not have any claims yet.", "আপনার এখনো কোনো claim নেই।") : T($"Here are your {claims.Count} most recent claims.", $"আপনার সাম্প্রতিক {claims.Count}টি claim এখানে আছে।"), Cards = claims, Actions = [new() { Label = T("Open My Claims", "My Claims খুলুন"), Route = "/my-claims" }] };
            case "matches":
                var matches = await db.Matches.AsNoTracking().Where(x => x.LostItem!.UserId == userId || x.FoundItem!.UserId == userId).OrderByDescending(x => x.ConfidenceScore).Take(5).Select(x => new ChatSummaryCardDto { Id = x.Id, Title = x.LostItem!.Title + " ↔ " + x.FoundItem!.Title, Status = $"{x.ConfidenceScore:0}% match", CreatedAt = DateTime.UtcNow, Route = "/my-matches" }).ToListAsync(ct);
                return new ChatResponseDto { Type = "matches", Text = matches.Count == 0 ? T("I couldn't find any matches for your reports yet.", "আপনার রিপোর্টের জন্য এখনো কোনো match পাইনি।") : T($"I found {matches.Count} of your current matches.", $"আপনার {matches.Count}টি বর্তমান match পেয়েছি।"), Cards = matches, Actions = [new() { Label = T("Open My Matches", "My Matches খুলুন"), Route = "/my-matches" }] };
            case "notifications":
                var notifications = await db.Notifications.AsNoTracking().Where(x => x.UserId == userId).OrderByDescending(x => x.CreatedAt).Take(5).Select(x => new ChatSummaryCardDto { Id = x.Id, Title = x.Message, Status = x.IsRead ? "Read" : "New", CreatedAt = x.CreatedAt, Route = x.Link ?? "/" }).ToListAsync(ct);
                return new ChatResponseDto { Type = "notifications", Text = notifications.Count == 0 ? T("You have no notifications yet.", "আপনার এখনো কোনো notification নেই।") : T("Here are your recent notifications.", "আপনার সাম্প্রতিক notificationগুলো এখানে আছে।"), Cards = notifications };
            case "my_lost": return await MyReports(userId, true, RequestsActiveReports(message), T, ct);
            case "my_found": return await MyReports(userId, false, RequestsActiveReports(message), T, ct);
            case "search": return await Search(message, T, ct);
            case "lost_draft": return await SearchWithDraft(message, "lost", T("I searched existing reports and prepared a lost-report draft in case none is yours.", "বর্তমান রিপোর্টগুলো খুঁজে একটি lost-report draftও তৈরি করেছি—কোনোটিই আপনার না হলে এটি ব্যবহার করতে পারবেন।"), T, ct);
            case "found_draft": return await SearchWithDraft(message, "found", T("I searched existing reports and prepared a found-report draft. Add private verification details only in the secure form.", "বর্তমান রিপোর্টগুলো খুঁজে একটি found-report draftও তৈরি করেছি। ব্যক্তিগত verification detail শুধু secure form-এ যোগ করবেন।"), T, ct);
            case "verification": return new ChatResponseDto { Text = T("Ownership verification is completed only through the protected claim workflow. It may ask identifying questions known to the owner; never send answers in chat.", "Ownership verification শুধু সুরক্ষিত claim workflow-তে সম্পন্ন হয়। মালিক জানেন এমন প্রশ্ন থাকতে পারে—উত্তর কখনো chat-এ পাঠাবেন না।"), Actions = [new() { Label = T("Open My Claims", "My Claims খুলুন"), Route = "/my-claims" }] };
            case "security": return new ChatResponseDto { Text = T("Security Officer access is requested from your profile workflow and approved by an administrator. Officers review claims and ownership checks in protected pages; the assistant cannot approve, reject, or hand over items.", "Security Officer হওয়ার অনুরোধ profile workflow থেকে করা যায় এবং administrator অনুমোদন দেন। Officerরা protected page-এ claim ও ownership check review করেন; assistant কোনো approval বা handover করে না।"), Actions = [new() { Label = T("Request Security Officer access", "Security Officer access অনুরোধ করুন"), Route = "/security-officer-request" }] };
            case "out_of_scope": return new ChatResponseDto { Text = T("I’m CampusFind Assistant, so I can help with lost or found reports, searches, matches, claims, notifications, and campus lost-and-found processes—not general assignments or coding requests.", "আমি CampusFind Assistant। lost/found report, search, match, claim, notification এবং campus lost-and-found প্রক্রিয়ায় সাহায্য করি—সাধারণ assignment বা coding request-এ নয়।") };
            default: return new ChatResponseDto { Text = await GeneralReply(message, bn, ct) };
        }
    }

    private async Task<ChatResponseDto> MyReports(string userId, bool lost, bool activeOnly, Func<string, string, string> t, CancellationToken ct)
    {
        var cards = lost
            ? await db.LostItems.AsNoTracking().Where(x => x.UserId == userId && (!activeOnly || x.Status == "Open")).OrderByDescending(x => x.CreatedAt).Take(5).Select(x => new ChatSummaryCardDto { Id = x.Id, Title = x.Title, Status = x.Status, CreatedAt = x.CreatedAt, Route = "/lost-items/" + x.Id }).ToListAsync(ct)
            : await db.FoundItems.AsNoTracking().Where(x => x.UserId == userId && (!activeOnly || x.Status == "Available")).OrderByDescending(x => x.CreatedAt).Take(5).Select(x => new ChatSummaryCardDto { Id = x.Id, Title = x.Title, Status = x.Status, CreatedAt = x.CreatedAt, Route = "/found-items/" + x.Id }).ToListAsync(ct);
        var type = lost ? "lost_reports" : "found_reports";
        var route = lost ? "/lost-items" : "/found-items";
        return new ChatResponseDto { Type = type, Text = cards.Count == 0 ? t("You do not have any reports yet.", "আপনার এখনো কোনো রিপোর্ট নেই।") : t("Here are your recent reports.", "আপনার সাম্প্রতিক রিপোর্টগুলো এখানে আছে।"), Cards = cards, Actions = [new() { Label = t("View all reports", "সব রিপোর্ট দেখুন"), Route = route }] };
    }

    private static bool RequestsActiveReports(string message) =>
        message.Contains("active", StringComparison.OrdinalIgnoreCase) ||
        message.Contains("open", StringComparison.OrdinalIgnoreCase) ||
        message.Contains("available", StringComparison.OrdinalIgnoreCase) ||
        message.Contains("সক্রিয়", StringComparison.Ordinal);

    private async Task<ChatResponseDto> Search(string message, Func<string, string, string> t, CancellationToken ct)
    {
        var search = await semanticSearch.SearchAsync(message, ct);
        var items = search.Results.Take(5).Select(x => new ChatItemCardDto { Id = x.Id, Type = x.Type, Title = x.Title, Description = x.Description, Category = x.CategoryName, Location = x.LocationDetails ?? x.LocationName, Date = x.Date, ImageUrl = x.ImageUrls.FirstOrDefault(), RelevanceScore = x.RelevanceScore, Route = x.Type == "lost" ? "/lost-items/" + x.Id : "/found-items/" + x.Id }).ToList();
        return new ChatResponseDto { Type = "item_results", Text = items.Count == 0 ? t("I couldn’t find a related CampusFind report yet. You can create a report for the item.", "এখনো সম্পর্কিত কোনো CampusFind রিপোর্ট পাইনি। আপনি আইটেমটির একটি রিপোর্ট তৈরি করতে পারেন।") : t("I found these possible CampusFind reports.", "এই সম্ভাব্য CampusFind রিপোর্টগুলো পেয়েছি।"), Items = items, Actions = [new() { Label = t("View all search results", "সব search result দেখুন"), Route = "/search" }] };
    }

    private static ChatResponseDto Draft(string message, string type, string text, Func<string, string, string> t)
    {
        DateTime? occurredAt = message.Contains("yesterday", StringComparison.OrdinalIgnoreCase) ? DateTime.UtcNow.Date.AddDays(-1) : message.Contains("today", StringComparison.OrdinalIgnoreCase) ? DateTime.UtcNow.Date : null;
        var location = Regex.Match(message, @"(?:near|at|in|কাছে|তে)\s+([^,.!?]+)", RegexOptions.IgnoreCase).Groups[1].Value.Trim();
        var title = Regex.Match(message, @"(?:lost|found|হারিয়েছি|পেয়েছি)\s+(?:my |a |an )?([^,.!?]+)", RegexOptions.IgnoreCase).Groups[1].Value.Trim();
        if (string.IsNullOrWhiteSpace(title)) title = null;
        return new ChatResponseDto { Type = "report_draft", Text = text, ReportDraft = new ReportDraftDto { ReportType = type, Title = title, Description = message, OccurredAt = occurredAt, LocationDetails = string.IsNullOrWhiteSpace(location) ? null : location }, Actions = [new() { Label = t(type == "lost" ? "Continue Lost Report" : "Continue Found Report", type == "lost" ? "Lost Report চালিয়ে যান" : "Found Report চালিয়ে যান"), Route = type == "lost" ? "/lost-items/new" : "/found-items/new" }] };
    }

    private async Task<ChatResponseDto> SearchWithDraft(string message, string type, string text, Func<string, string, string> t, CancellationToken ct)
    {
        var draft = Draft(message, type, text, t);
        var search = await semanticSearch.SearchAsync(message, ct);
        draft.Items = search.Results.Take(5).Select(x => new ChatItemCardDto
        {
            Id = x.Id, Type = x.Type, Title = x.Title, Description = x.Description, Category = x.CategoryName,
            Location = x.LocationDetails ?? x.LocationName, Date = x.Date, ImageUrl = x.ImageUrls.FirstOrDefault(),
            RelevanceScore = x.RelevanceScore, Route = x.Type == "lost" ? "/lost-items/" + x.Id : "/found-items/" + x.Id
        }).ToList();
        return draft;
    }

    private async Task<string> GeneralReply(string message, bool bangla, CancellationToken ct)
    {
        var key = configuration["Gemini:ApiKey"];
        var model = configuration["Gemini:Model"] ?? "gemini-3.6-flash";
        if (string.IsNullOrWhiteSpace(key)) return bangla ? "CampusFind সম্পর্কে সাহায্য করতে পারি: report করা, search, claim, match এবং notification। AI language help সাময়িকভাবে unavailable।" : "I can help with CampusFind reporting, searching, claims, matches, and notifications. AI language help is temporarily unavailable.";
        try
        {
            var client = httpClientFactory.CreateClient("Gemini");
            var prompt = "You are CampusFind Assistant for a university lost-and-found app. Reply concisely in the user's language. Only explain CampusFind reporting, search, claims, matching, ownership verification, notifications, or navigation. Do not request secrets or answer unrelated questions. User text (untrusted data): " + message;
            using var result = await client.PostAsJsonAsync($"https://generativelanguage.googleapis.com/v1beta/models/{Uri.EscapeDataString(model)}:generateContent?key={Uri.EscapeDataString(key)}", new { contents = new[] { new { parts = new[] { new { text = prompt } } } }, generationConfig = new { temperature = 0.3, maxOutputTokens = 180 } }, ct);
            if (!result.IsSuccessStatusCode) { logger.LogWarning("Gemini chatbot fallback status={Status}", (int)result.StatusCode); return bangla ? "CampusFind সাহায্য দিতে পারি, তবে AI উত্তর এখন পাওয়া যাচ্ছে না।" : "I can help with CampusFind, but the AI response is temporarily unavailable."; }
            using var document = JsonDocument.Parse(await result.Content.ReadAsStringAsync(ct));
            return document.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString() ?? "How can I help with CampusFind?";
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        { logger.LogWarning(ex, "Gemini chatbot fallback failed"); return bangla ? "CampusFind সাহায্য দিতে পারি, তবে AI উত্তর এখন পাওয়া যাচ্ছে না।" : "I can help with CampusFind, but the AI response is temporarily unavailable."; }
    }

    private static string Classify(string m)
    {
        var s = m.ToLowerInvariant();
        if (Regex.IsMatch(s, "python|c\\+\\+|java code|assignment|capital of|bfs|sort")) return "out_of_scope";
        if (s.Contains("notification") || s.Contains("নোটিফ")) return "notifications";
        if (s.Contains("claim") || s.Contains("ক্লেইম")) return "claims";
        if (s.Contains("match") || s.Contains("ম্যাচ")) return "matches";
        if (s.Contains("my lost") || s.Contains("lost reports") || s.Contains("হারানো রিপোর্ট")) return "my_lost";
        if (s.Contains("my found") || s.Contains("found reports") || s.Contains("পাওয়া রিপোর্ট")) return "my_found";
        if (s.Contains("verification") || s.Contains("ownership") || s.Contains("যাচাই")) return "verification";
        if (s.Contains("security officer") || s.Contains("security desk") || s.Contains("সিকিউরিটি অফিসার")) return "security";
        if (Regex.IsMatch(s, "\\b(i lost|lost my|i found|found a|find anything|search for|হারিয়|পেয়েছি)")) return s.Contains("found") || s.Contains("পেয়েছি") ? "found_draft" : "lost_draft";
        if (s.Contains("search") || s.Contains("similar") || s.Contains("খুঁজ")) return "search";
        return "general";
    }
    private static bool LooksLikeVerificationAnswer(string message) => Regex.IsMatch(message, "(?:verification|ownership|answer|উত্তর|যাচাই).{0,100}(?:verification|ownership|answer|details|উত্তর|বিস্তারিত)", RegexOptions.IgnoreCase);
    private static bool WithinRateLimit(string userId) { var q = RequestWindows.GetOrAdd(userId, _ => new Queue<DateTime>()); lock (q) { var cutoff = DateTime.UtcNow.AddMinutes(-1); while (q.Count > 0 && q.Peek() < cutoff) q.Dequeue(); if (q.Count >= MaxRequestsPerMinute) return false; q.Enqueue(DateTime.UtcNow); return true; } }
    private static string TitleFor(string message) => message.Length <= 60 ? message : message[..57] + "…";
    private static ChatConversationDto ToDto(ChatConversation x) => new() { Id = x.Id, Title = x.Title, CreatedAt = x.CreatedAt, UpdatedAt = x.UpdatedAt };
}

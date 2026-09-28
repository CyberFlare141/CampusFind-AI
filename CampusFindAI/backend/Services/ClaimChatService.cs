using CampusFindAI.Api.Data;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Services;

public sealed class ClaimChatService(ApplicationDbContext db, INotificationService notifications, IAuditLogService audit) : IClaimChatService
{
    private const int MaxMessageLength = 1000;
    private const int DefaultPageSize = 30;

    public async Task<ClaimChatConversationDto> OpenAsync(Guid claimId, string userId, CancellationToken ct = default)
    {
        var context = await AuthorizeAsync(claimId, userId, true, ct);
        return await ToConversationDtoAsync(context.Conversation, context.Claim, userId, ct);
    }

    public async Task<ClaimChatMessagesDto> GetMessagesAsync(Guid claimId, string userId, DateTime? before, int take, CancellationToken ct = default)
    {
        var context = await AuthorizeAsync(claimId, userId, true, ct);
        take = Math.Clamp(take <= 0 ? DefaultPageSize : take, 1, DefaultPageSize);
        var query = db.ClaimChatMessages.AsNoTracking().Where(message => message.ConversationId == context.Conversation.Id);
        if (before.HasValue) query = query.Where(message => message.SentAt < before.Value);
        var newestFirst = await query.OrderByDescending(message => message.SentAt).Take(take).ToListAsync(ct);
        var messages = newestFirst.OrderBy(message => message.SentAt).Select(message => ToMessageDto(message, userId, context.Claim)).ToList();
        return new()
        {
            Conversation = await ToConversationDtoAsync(context.Conversation, context.Claim, userId, ct),
            Messages = messages,
            NextBefore = newestFirst.Count == take ? newestFirst[^1].SentAt : null
        };
    }

    public async Task<ClaimChatMessageDto> SendAsync(Guid claimId, string userId, SendClaimChatMessageDto request, CancellationToken ct = default)
    {
        var context = await AuthorizeAsync(claimId, userId, true, ct);
        if (context.Conversation.IsReadOnly || context.Claim.Status == "Returned") throw new InvalidOperationException("This handover is complete, so the conversation is read-only.");
        var content = request.Content?.Trim() ?? string.Empty;
        if (content.Length is 0 or > MaxMessageLength || content.Any(char.IsControl)) throw new InvalidOperationException($"Messages must be plain text between 1 and {MaxMessageLength} characters.");
        var message = new ClaimChatMessage { Id = Guid.NewGuid(), ConversationId = context.Conversation.Id, SenderUserId = userId, Content = content, SentAt = DateTime.UtcNow };
        db.ClaimChatMessages.Add(message);
        await db.SaveChangesAsync(ct);
        var otherUserId = context.Conversation.OwnerUserId == userId ? context.Conversation.FounderUserId : context.Conversation.OwnerUserId;
        var recipientRole = context.Conversation.OwnerUserId == otherUserId ? "owner" : "finder";
        await notifications.CreateAsync(otherUserId, $"You received a new message from the {recipientRole}.", $"/claims/{claimId}/chat", "NEW_CLAIM_MESSAGE", ct);
        return ToMessageDto(message, userId, context.Claim);
    }

    public async Task MarkReadAsync(Guid claimId, string userId, CancellationToken ct = default)
    {
        var context = await AuthorizeAsync(claimId, userId, true, ct);
        var unread = await db.ClaimChatMessages.Where(message => message.ConversationId == context.Conversation.Id && message.SenderUserId != userId && message.ReadAt == null).ToListAsync(ct);
        if (unread.Count == 0) return;
        var now = DateTime.UtcNow;
        foreach (var message in unread) message.ReadAt = now;
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<FounderClaimChatDto>> GetFounderChatsAsync(Guid foundItemId, string userId, CancellationToken ct = default)
    {
        var item = await db.FoundItems.AsNoTracking().SingleOrDefaultAsync(found => found.Id == foundItemId, ct) ?? throw new KeyNotFoundException("Found item not found.");
        if (item.UserId != userId) throw new UnauthorizedAccessException();
        var approvedClaims = await db.Claims.AsNoTracking()
            .Where(claim => claim.FoundItemId == foundItemId
                && (claim.Status == "Approved" || claim.Status == "Returned"))
            .Include(claim => claim.ClaimantUser)
            .ThenInclude(user => user!.UserProfile)
            .ToListAsync(ct);
        var result = new List<FounderClaimChatDto>();
        foreach (var claim in approvedClaims)
        {
            var conversation = await db.ClaimChatConversations.AsNoTracking().SingleOrDefaultAsync(chat => chat.ClaimId == claim.Id, ct);
            var unread = conversation is null ? 0 : await db.ClaimChatMessages.CountAsync(message => message.ConversationId == conversation.Id && message.SenderUserId != userId && message.ReadAt == null, ct);
            result.Add(new FounderClaimChatDto { ClaimId = claim.Id, ItemTitle = item.Title, OwnerName = SafeName(claim.ClaimantUser, "Owner"), UnreadCount = unread });
        }
        return result;
    }

    private async Task<(Claim Claim, ClaimChatConversation Conversation)> AuthorizeAsync(Guid claimId, string userId, bool create, CancellationToken ct)
    {
        var claim = await db.Claims.Include(item => item.FoundItem).Include(item => item.ClaimantUser).ThenInclude(user => user!.UserProfile).SingleOrDefaultAsync(item => item.Id == claimId, ct) ?? throw new KeyNotFoundException("Claim not found.");
        var founderId = claim.FoundItem?.UserId ?? throw new KeyNotFoundException("Found item not found.");
        if (claim.Status is not ("Approved" or "Returned") || (userId != claim.ClaimantUserId && userId != founderId)) throw new UnauthorizedAccessException();
        var conversation = await db.ClaimChatConversations.SingleOrDefaultAsync(chat => chat.ClaimId == claimId, ct);
        if (conversation is null && create)
        {
            conversation = new ClaimChatConversation { Id = Guid.NewGuid(), ClaimId = claimId, OwnerUserId = claim.ClaimantUserId, FounderUserId = founderId, IsReadOnly = claim.Status == "Returned", ClosedAt = claim.Status == "Returned" ? DateTime.UtcNow : null };
            db.ClaimChatConversations.Add(conversation);
            try
            {
                await db.SaveChangesAsync(ct);
                await audit.LogAsync(userId, "ClaimChatCreated", $"Private handover chat created for Claim #{claim.Id.ToString("N")[..8].ToUpperInvariant()}.", ct);
            }
            catch (DbUpdateException)
            {
                db.Entry(conversation).State = EntityState.Detached;
                conversation = await db.ClaimChatConversations.SingleAsync(chat => chat.ClaimId == claimId, ct);
            }
        }
        if (conversation is null || conversation.OwnerUserId != claim.ClaimantUserId || conversation.FounderUserId != founderId || (userId != conversation.OwnerUserId && userId != conversation.FounderUserId)) throw new UnauthorizedAccessException();
        if (claim.Status == "Returned" && !conversation.IsReadOnly)
        {
            conversation.IsReadOnly = true;
            conversation.ClosedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            await audit.LogAsync(userId, "ClaimChatClosed", $"Private handover chat closed for Claim #{claim.Id.ToString("N")[..8].ToUpperInvariant()}.", ct);
        }
        return (claim, conversation);
    }

    private async Task<ClaimChatConversationDto> ToConversationDtoAsync(ClaimChatConversation conversation, Claim claim, string userId, CancellationToken ct) => new()
    {
        Id = conversation.Id, ClaimId = claim.Id, ItemTitle = claim.FoundItem?.Title ?? "Found item", IsReadOnly = conversation.IsReadOnly || claim.Status == "Returned",
        OtherParticipantName = conversation.OwnerUserId == userId ? SafeName(await db.Users.Include(user => user.UserProfile).SingleAsync(user => user.Id == conversation.FounderUserId, ct), "Finder") : SafeName(claim.ClaimantUser, "Owner"),
        UnreadCount = await db.ClaimChatMessages.CountAsync(message => message.ConversationId == conversation.Id && message.SenderUserId != userId && message.ReadAt == null, ct)
    };

    private static ClaimChatMessageDto ToMessageDto(ClaimChatMessage message, string userId, Claim claim) => new()
    {
        Id = message.Id, ConversationId = message.ConversationId, Content = message.Content, SentAt = message.SentAt, IsMine = message.SenderUserId == userId,
        SenderName = message.SenderUserId == claim.ClaimantUserId ? "Owner" : "Finder"
    };

    private static string SafeName(ApplicationUser? user, string fallback) => string.IsNullOrWhiteSpace(user?.UserProfile?.FullName) ? fallback : user.UserProfile.FullName;
}

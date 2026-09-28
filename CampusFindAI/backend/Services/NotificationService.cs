using CampusFindAI.Api.Data;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Hubs;
using CampusFindAI.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Services;

public sealed class NotificationService(ApplicationDbContext dbContext, IHubContext<NotificationHub>? hub = null) : INotificationService
{
    public Task CreateAsync(string userId, string message, CancellationToken cancellationToken = default) => CreateAsync(userId, message, null, null, cancellationToken);

    public async Task CreateAsync(string userId, string message, string? link, string? category, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(message)) return;
        if (!string.IsNullOrWhiteSpace(link) && (!link.StartsWith('/') || link.StartsWith("//")))
            throw new InvalidOperationException("Notification links must be internal application routes.");

        // Group rapid chat messages: the conversation itself remains the source of truth.
        if (category == "NEW_CLAIM_MESSAGE")
        {
            var cutoff = DateTime.UtcNow.AddSeconds(-30);
            if (await dbContext.Notifications.AnyAsync(item => item.UserId == userId && item.Category == category && item.Link == link && !item.IsRead && item.CreatedAt >= cutoff, cancellationToken)) return;
        }

        var entity = new Notification
        {
            Id = Guid.NewGuid(), UserId = userId, Message = message, Link = link, Category = category, CreatedAt = DateTime.UtcNow
        };
        dbContext.Notifications.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Persistence intentionally precedes delivery: offline users retrieve this record later.
        var payload = new NotificationDto { Id = entity.Id, Message = entity.Message, Link = entity.Link, Category = entity.Category, IsRead = false, CreatedAt = entity.CreatedAt };
        if (hub is null) return;
        try { await hub.Clients.User(userId).SendAsync("NotificationReceived", payload, cancellationToken); }
        catch { /* A disconnected client never invalidates an already-persisted notification. */ }
    }
}

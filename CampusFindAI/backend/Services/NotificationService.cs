using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;

namespace CampusFindAI.Api.Services;

public sealed class NotificationService(ApplicationDbContext dbContext) : INotificationService
{
    public Task CreateAsync(string userId, string message, CancellationToken cancellationToken = default) => CreateAsync(userId, message, null, null, cancellationToken);

    public async Task CreateAsync(string userId, string message, string? link, string? category, CancellationToken cancellationToken = default)
    {
        dbContext.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(), UserId = userId, Message = message, Link = link, Category = category, CreatedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}

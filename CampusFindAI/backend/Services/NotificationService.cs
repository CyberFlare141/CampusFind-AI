using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;

namespace CampusFindAI.Api.Services;

public sealed class NotificationService(ApplicationDbContext dbContext) : INotificationService
{
    public async Task CreateAsync(string userId, string message, CancellationToken cancellationToken = default)
    {
        dbContext.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(), UserId = userId, Message = message, CreatedAt = DateTime.UtcNow
        });
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}

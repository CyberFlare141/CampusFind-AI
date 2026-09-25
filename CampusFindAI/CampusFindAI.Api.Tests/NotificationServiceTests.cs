using CampusFindAI.Api.Data;
using CampusFindAI.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Tests;

public sealed class NotificationServiceTests
{
    private static ApplicationDbContext Db() => new(new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Fact]
    public async Task Create_persists_a_notification_for_the_intended_user()
    {
        await using var db = Db();
        var service = new NotificationService(db);
        await service.CreateAsync("student-a", "A safe update", "/my-claims", "CLAIM_APPROVED");
        var notification = Assert.Single(db.Notifications);
        Assert.Equal("student-a", notification.UserId);
        Assert.False(notification.IsRead);
        Assert.Equal("/my-claims", notification.Link);
    }

    [Fact]
    public async Task Create_rejects_external_action_urls()
    {
        await using var db = Db();
        var service = new NotificationService(db);
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateAsync("student-a", "Unsafe", "https://example.test", "SYSTEM"));
        Assert.Empty(db.Notifications);
    }

    [Fact]
    public async Task Rapid_chat_updates_are_grouped_without_duplicate_records()
    {
        await using var db = Db();
        var service = new NotificationService(db);
        await service.CreateAsync("student-a", "New message", "/claims/abc/chat", "NEW_CLAIM_MESSAGE");
        await service.CreateAsync("student-a", "New message", "/claims/abc/chat", "NEW_CLAIM_MESSAGE");
        Assert.Single(db.Notifications);
    }
}

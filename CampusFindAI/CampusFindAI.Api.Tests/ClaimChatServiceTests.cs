using CampusFindAI.Api.Data;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Tests;

public sealed class ClaimChatServiceTests
{
    [Fact]
    public async Task PendingOrRejectedClaim_CannotOpenChat()
    {
        var fixture = await Fixture.CreateAsync("Pending");
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => fixture.Service.OpenAsync(fixture.Claim.Id, fixture.Owner.Id));
        fixture.Claim.Status = "Rejected"; await fixture.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => fixture.Service.OpenAsync(fixture.Claim.Id, fixture.Founder.Id));
    }

    [Fact]
    public async Task ApprovedParticipantsShareOneConversation_AndRandomStudentIsBlocked()
    {
        var fixture = await Fixture.CreateAsync("Approved");
        var ownerChat = await fixture.Service.OpenAsync(fixture.Claim.Id, fixture.Owner.Id);
        var founderChat = await fixture.Service.OpenAsync(fixture.Claim.Id, fixture.Founder.Id);
        Assert.Equal(ownerChat.Id, founderChat.Id);
        Assert.Equal(1, await fixture.Db.ClaimChatConversations.CountAsync());
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => fixture.Service.OpenAsync(fixture.Claim.Id, fixture.Other.Id));
    }

    [Fact]
    public async Task AuthorizedMessage_IsStoredPagedAndMarkedRead()
    {
        var fixture = await Fixture.CreateAsync("Approved");
        var sent = await fixture.Service.SendAsync(fixture.Claim.Id, fixture.Owner.Id, new() { Content = " Can we meet near Security? " });
        Assert.Equal("Can we meet near Security?", sent.Content);
        Assert.True(sent.IsMine);
        Assert.Equal(fixture.Owner.Id, (await fixture.Db.ClaimChatMessages.SingleAsync()).SenderUserId);
        var page = await fixture.Service.GetMessagesAsync(fixture.Claim.Id, fixture.Founder.Id, null, 30);
        Assert.Single(page.Messages); Assert.False(page.Messages[0].IsMine);
        await fixture.Service.MarkReadAsync(fixture.Claim.Id, fixture.Founder.Id);
        Assert.NotNull((await fixture.Db.ClaimChatMessages.SingleAsync()).ReadAt);
    }

    [Fact]
    public async Task EmptyOversizedAndReturnedChatMessages_AreRejected()
    {
        var fixture = await Fixture.CreateAsync("Approved");
        await Assert.ThrowsAsync<InvalidOperationException>(() => fixture.Service.SendAsync(fixture.Claim.Id, fixture.Owner.Id, new() { Content = " " }));
        await Assert.ThrowsAsync<InvalidOperationException>(() => fixture.Service.SendAsync(fixture.Claim.Id, fixture.Owner.Id, new() { Content = new string('x', 1001) }));
        fixture.Claim.Status = "Returned"; await fixture.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => fixture.Service.SendAsync(fixture.Claim.Id, fixture.Owner.Id, new() { Content = "Too late" }));
    }

    private sealed record Fixture(ApplicationDbContext Db, ClaimChatService Service, Claim Claim, ApplicationUser Owner, ApplicationUser Founder, ApplicationUser Other)
    {
        public static async Task<Fixture> CreateAsync(string status)
        {
            var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
            var owner = new ApplicationUser { Id = "owner", UserName = "owner" };
            var founder = new ApplicationUser { Id = "founder", UserName = "founder" };
            var other = new ApplicationUser { Id = "other", UserName = "other" };
            var item = new FoundItem { Id = Guid.NewGuid(), UserId = founder.Id, Title = "Phone", Status = status == "Returned" ? "Returned" : "Claimed" };
            var claim = new Claim { Id = Guid.NewGuid(), FoundItemId = item.Id, ClaimantUserId = owner.Id, Status = status };
            db.Users.AddRange(owner, founder, other); db.FoundItems.Add(item); db.Claims.Add(claim); await db.SaveChangesAsync();
            return new(db, new ClaimChatService(db, new Notifications(), new Audits()), claim, owner, founder, other);
        }
    }

    private sealed class Notifications : INotificationService
    {
        public Task CreateAsync(string userId, string message, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
    private sealed class Audits : IAuditLogService
    {
        public Task LogAsync(string? userId, string action, string? details = null, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task<IReadOnlyList<LoginHistoryEntryDto>> GetLoginHistoryAsync(string userId, int take = 20, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<LoginHistoryEntryDto>>([]);
        public Task<LoginHistoryEntryDto?> GetLoginDetailAsync(string userId, Guid auditLogId, CancellationToken cancellationToken = default) => Task.FromResult<LoginHistoryEntryDto?>(null);
    }
}

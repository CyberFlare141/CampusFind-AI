using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using CampusFindAI.Api.Services;

namespace CampusFindAI.Api.Tests;

public sealed class MatchServiceTests
{
    [Theory]
    [InlineData("Claimed")]
    [InlineData("Returned")]
    public async Task MatchAsync_UnavailableFoundItem_DoesNotCreateSuggestedMatch(string status)
    {
        var harness = new Harness(new LostItem { Status = "Open", Title = "Black wallet", UserId = "student" }, new FoundItem { Status = status, Title = "Black wallet" });
        await harness.Service.GetSuggestedMatchesAsync();
        Assert.Empty(harness.Matches.Items);
    }

    [Fact]
    public async Task MatchAsync_ClosedLostItem_DoesNotCreateSuggestedMatch()
    {
        var harness = new Harness(new LostItem { Status = "Closed", Title = "Black wallet", UserId = "student" }, new FoundItem { Status = "Available", Title = "Black wallet" });
        await harness.Service.GetSuggestedMatchesAsync();
        Assert.Empty(harness.Matches.Items);
    }

    [Fact]
    public async Task CalculateScore_SameCategory_HasHigherScore()
    {
        var category = Guid.NewGuid(); var lost = new LostItem { Status="Open", Title="wallet", UserId="student", CategoryId=category };
        var same = new FoundItem { Status="Available", Title="wallet", CategoryId=category };
        var different = new FoundItem { Status="Available", Title="wallet", CategoryId=Guid.NewGuid() };
        var harness = new Harness(lost, same, different);
        var result = await harness.Service.GetSuggestedMatchesAsync();
        Assert.True(result.Single(match => match.FoundItemId == same.Id).ConfidenceScore > result.Single(match => match.FoundItemId == different.Id).ConfidenceScore);
    }

    [Fact]
    public async Task CalculateScore_SameLocation_HasHigherScore()
    {
        var location = Guid.NewGuid(); var lost = new LostItem { Status="Open", Title="wallet", UserId="student", LocationId=location };
        var same = new FoundItem { Status="Available", Title="wallet", LocationId=location };
        var different = new FoundItem { Status="Available", Title="wallet", LocationId=Guid.NewGuid() };
        var harness = new Harness(lost, same, different);
        var result = await harness.Service.GetSuggestedMatchesAsync();
        Assert.True(result.Single(match => match.FoundItemId == same.Id).ConfidenceScore > result.Single(match => match.FoundItemId == different.Id).ConfidenceScore);
    }

    [Fact]
    public async Task MatchAsync_ExistingPair_DoesNotCreateDuplicateMatchOrNotification()
    {
        var harness = new Harness(new LostItem { Status="Open", Title="black wallet", UserId="student" }, new FoundItem { Status="Available", Title="black wallet" });
        await harness.Service.GetSuggestedMatchesAsync(); await harness.Service.GetSuggestedMatchesAsync();
        Assert.Single(harness.Matches.Items); Assert.Single(harness.Notifications.Items);
    }

    [Fact]
    public async Task MatchAsync_NewMatch_NotifiesLostItemOwnerWithPossibleMatchMessage()
    {
        var harness = new Harness(new LostItem { Status="Open", Title="black wallet", UserId="student-a" }, new FoundItem { Status="Available", Title="black wallet" });
        await harness.Service.GetSuggestedMatchesAsync();
        Assert.Single(harness.Matches.Items);
        Assert.Single(harness.Notifications.Items);
        Assert.StartsWith("student-a:Possible match found: Your black wallet", harness.Notifications.Items[0]);
    }

    [Fact]
    public async Task GetMyMatchesAsync_UsesCurrentStudentsRepositoryQuery()
    {
        var match = new Match { Id=Guid.NewGuid(), LostItemId=Guid.NewGuid(), FoundItemId=Guid.NewGuid(), ConfidenceScore=80,
            LostItem=new LostItem { Id=Guid.NewGuid(), UserId="student-a", Title="A", Status="Open" },
            FoundItem=new FoundItem { Id=Guid.NewGuid(), Title="Found", Status="Available" } };
        match.LostItemId = match.LostItem.Id; match.FoundItemId = match.FoundItem.Id;
        var repository = new FakeMatches { MyMatches = [match] };
        var service = new MatchService(new FakeLost([]), new FakeFound([]), new FakeImages(), new FakeSimilarity(), repository, new FakeNotifications(), new FakeReference());
        var results = await service.GetMyMatchesAsync("student-a");
        Assert.Equal("student-a", repository.RequestedUserId);
        Assert.Single(results);
        Assert.Equal(match.LostItemId, results[0].LostItemId);
    }

    [Fact]
    public async Task CreateLostItemAsync_FutureDate_IsRejectedBeforePersistence()
    {
        var repository = new FakeLost([]);
        var service = new LostItemService(repository, new FakeImages(), new FakeStorage(), new NoopMatch(), new FakeReference());
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync("student", new CreateLostItemDto { Title="Wallet", LostAt=DateTime.UtcNow.AddHours(1) }));
    }

    [Fact]
    public async Task CreateFoundItemAsync_FutureDate_IsRejectedBeforePersistence()
    {
        var repository = new FakeFound([]);
        var service = new FoundItemService(repository, new FakeImages(), new FakeStorage(), new NoopMatch(), new FakeReference());
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync("student", new CreateFoundItemDto { Title="Wallet", FoundAt=DateTime.UtcNow.AddHours(1) }));
    }

    private sealed class Harness
    {
        public FakeMatches Matches { get; } = new();
        public FakeNotifications Notifications { get; } = new();
        public IMatchService Service { get; }
        public Harness(LostItem lost, params FoundItem[] found)
        {
            lost.Id = lost.Id == Guid.Empty ? Guid.NewGuid() : lost.Id;
            foreach (var item in found) item.Id = item.Id == Guid.Empty ? Guid.NewGuid() : item.Id;
            Service = new MatchService(new FakeLost([lost]), new FakeFound(found), new FakeImages(), new FakeSimilarity(), Matches, Notifications, new FakeReference());
        }
    }
    private sealed class FakeLost(IReadOnlyList<LostItem> items) : ILostItemRepository
    {
        public Task AddAsync(LostItem i,CancellationToken c=default)=>Task.CompletedTask; public Task<LostItem?> GetByIdAsync(Guid id,CancellationToken c=default)=>Task.FromResult(items.SingleOrDefault(i=>i.Id==id)); public Task<IReadOnlyList<LostItem>> GetAllAsync(CancellationToken c=default)=>Task.FromResult(items); public Task<IReadOnlyList<LostItem>> GetByUserIdAsync(string u,CancellationToken c=default)=>Task.FromResult((IReadOnlyList<LostItem>)items.Where(i=>i.UserId==u).ToList()); public Task UpdateStatusAsync(Guid i,string s,CancellationToken c=default)=>Task.CompletedTask; public Task SaveChangesAsync(CancellationToken c=default)=>Task.CompletedTask;
    }
    private sealed class FakeFound(IReadOnlyList<FoundItem> items) : IFoundItemRepository
    {
        public Task AddAsync(FoundItem i,CancellationToken c=default)=>Task.CompletedTask; public Task<FoundItem?> GetByIdAsync(Guid id,CancellationToken c=default)=>Task.FromResult(items.SingleOrDefault(i=>i.Id==id)); public Task<IReadOnlyList<FoundItem>> GetAllAsync(CancellationToken c=default)=>Task.FromResult(items); public Task<IReadOnlyList<FoundItem>> GetByUserIdAsync(string u,CancellationToken c=default)=>Task.FromResult((IReadOnlyList<FoundItem>)items.Where(i=>i.UserId==u).ToList()); public Task UpdateStatusAsync(Guid i,string s,CancellationToken c=default)=>Task.CompletedTask; public Task SaveChangesAsync(CancellationToken c=default)=>Task.CompletedTask;
    }
    private sealed class FakeImages : IImageRepository { public Task AddRangeAsync(IReadOnlyCollection<Image> i,CancellationToken c=default)=>Task.CompletedTask; public Task<IReadOnlyList<Image>> GetByLostItemIdsAsync(IReadOnlyCollection<Guid> i,CancellationToken c=default)=>Task.FromResult((IReadOnlyList<Image>)[]); public Task<IReadOnlyList<Image>> GetByFoundItemIdsAsync(IReadOnlyCollection<Guid> i,CancellationToken c=default)=>Task.FromResult((IReadOnlyList<Image>)[]); }
    private sealed class FakeSimilarity : IImageSimilarityService { public Task<decimal?> GetBestSimilarityAsync(IReadOnlyCollection<string> a,IReadOnlyCollection<string>b,CancellationToken c=default)=>Task.FromResult<decimal?>(null); }
    private sealed class FakeMatches : IMatchRepository { public List<Match> Items {get;}=[]; public IReadOnlyList<Match> MyMatches {get;set;}=[]; public string? RequestedUserId {get;private set;} public Task AddAsync(Match m,CancellationToken c=default){Items.Add(m);return Task.CompletedTask;} public Task<bool> ExistsAsync(Guid l,Guid f,CancellationToken c=default)=>Task.FromResult(Items.Any(m=>m.LostItemId==l&&m.FoundItemId==f)); public Task<IReadOnlyList<Match>> GetAllAsync(CancellationToken c=default)=>Task.FromResult((IReadOnlyList<Match>)Items); public Task<IReadOnlyList<Match>> GetByFoundItemIdAsync(Guid i,CancellationToken c=default)=>Task.FromResult((IReadOnlyList<Match>)[]); public Task<IReadOnlyList<Match>> GetByLostItemUserIdAsync(string u,CancellationToken c=default){RequestedUserId=u;return Task.FromResult(MyMatches);} public Task SaveChangesAsync(CancellationToken c=default)=>Task.CompletedTask; }
    private sealed class FakeNotifications : INotificationService { public List<string> Items {get;}=[]; public Task CreateAsync(string u,string m,CancellationToken c=default){Items.Add(u+":"+m);return Task.CompletedTask;} }
    private sealed class FakeReference : IReferenceDataService { public Task EnsureValidAsync(Guid? a,Guid? b,Guid? f,Guid? l,CancellationToken c=default)=>Task.CompletedTask; public Task<IReadOnlyList<ReferenceCategoryDto>> GetCategoriesAsync(CancellationToken c=default)=>Task.FromResult((IReadOnlyList<ReferenceCategoryDto>)[]); public Task<IReadOnlyList<ReferenceLocationDto>> GetLocationsAsync(CancellationToken c=default)=>Task.FromResult((IReadOnlyList<ReferenceLocationDto>)[]); public Task<IReadOnlyList<ReferenceLocationDto>> GetLocationsAsync(Guid f,CancellationToken c=default)=>Task.FromResult((IReadOnlyList<ReferenceLocationDto>)[]); public Task<IReadOnlyList<ReferenceBuildingDto>> GetBuildingsAsync(CancellationToken c=default)=>Task.FromResult((IReadOnlyList<ReferenceBuildingDto>)[]); public Task<IReadOnlyList<ReferenceFloorDto>> GetFloorsAsync(Guid b,CancellationToken c=default)=>Task.FromResult((IReadOnlyList<ReferenceFloorDto>)[]); }
    private sealed class FakeStorage : IReportImageStorage { public void Validate(IReadOnlyCollection<Microsoft.AspNetCore.Http.IFormFile>? files) {} public Task<IReadOnlyList<Image>> SaveAsync(Guid? l,Guid? f,IReadOnlyCollection<Microsoft.AspNetCore.Http.IFormFile>? files,CancellationToken c=default)=>Task.FromResult((IReadOnlyList<Image>)[]); }
    private sealed class NoopMatch : IMatchService { public Task<IReadOnlyList<MatchDto>> GetSuggestedMatchesAsync(CancellationToken c=default)=>Task.FromResult((IReadOnlyList<MatchDto>)[]); public Task RefreshForLostItemAsync(Guid i,CancellationToken c=default)=>Task.CompletedTask; public Task RefreshForFoundItemAsync(Guid i,CancellationToken c=default)=>Task.CompletedTask; public Task<IReadOnlyList<MatchDto>> GetMyMatchesAsync(string u,CancellationToken c=default)=>Task.FromResult((IReadOnlyList<MatchDto>)[]); }
}

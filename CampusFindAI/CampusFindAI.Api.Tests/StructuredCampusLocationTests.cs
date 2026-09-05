using CampusFindAI.Api.Data;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using CampusFindAI.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Tests;

public sealed class StructuredCampusLocationTests
{
    [Fact]
    public async Task FloorsQuery_ReturnsOnlyFloorsForRequestedBlock()
    {
        await using var context = CreateContext();
        var seed = await SeedCampusAsync(context);
        var result = await new ReferenceDataService(context).GetFloorsAsync(seed.BlockA.Id);
        Assert.All(result, floor => Assert.Equal(seed.BlockA.Id, floor.BuildingId));
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task LocationsQuery_ReturnsOnlyLocationsForRequestedFloor()
    {
        await using var context = CreateContext();
        var seed = await SeedCampusAsync(context);
        var result = await new ReferenceDataService(context).GetLocationsAsync(seed.AFloor1.Id);
        Assert.Equal(2, result.Count);
        Assert.All(result, location => Assert.Equal(seed.AFloor1.Id, location.FloorId));
        Assert.Contains(result, location => location.Name == "Computer Lab");
    }

    [Fact]
    public async Task SameBlock_GetsPartialStructuredLocationContribution()
    {
        var scores = await GetScoresAsync();
        Assert.True(scores.SameBlock > scores.DifferentBlock);
    }

    [Fact]
    public async Task SameBlockAndFloor_ScoresHigherThanSameBlockOnly()
    {
        var scores = await GetScoresAsync();
        Assert.True(scores.SameFloor > scores.SameBlock);
    }

    [Fact]
    public async Task SameBlockFloorAndLocation_GetsMaximumStructuredLocationContribution()
    {
        var scores = await GetScoresAsync();
        Assert.True(scores.SameLocation > scores.SameFloor);
    }

    [Fact]
    public async Task DifferentBlock_GetsNoStructuredLocationBonus()
    {
        var scores = await GetScoresAsync();
        Assert.Equal(66.67m, scores.DifferentBlock);
    }

    [Fact]
    public async Task LostItemCreation_PersistsSelectedStructuredLocation()
    {
        await using var context = CreateContext(); var seed = await SeedCampusAsync(context);
        var repository = new RecordingLostRepository();
        var service = new LostItemService(repository, new EmptyImages(), new EmptyStorage(), new EmptyMatchService(), new ReferenceDataService(context));
        await service.CreateAsync("student", RequestLost(seed));
        Assert.Equal(seed.AFloor1Location.Id, Assert.Single(repository.Items).LocationId);
    }

    [Fact]
    public async Task FoundItemCreation_PersistsSelectedStructuredLocation()
    {
        await using var context = CreateContext(); var seed = await SeedCampusAsync(context);
        var repository = new RecordingFoundRepository();
        var service = new FoundItemService(repository, new EmptyImages(), new EmptyStorage(), new EmptyMatchService(), new ReferenceDataService(context));
        await service.CreateAsync("student", RequestFound(seed));
        Assert.Equal(seed.AFloor1Location.Id, Assert.Single(repository.Items).LocationId);
    }

    [Fact]
    public async Task LostItemCreation_RejectsFloorFromAnotherBlock()
    {
        await using var context = CreateContext(); var seed = await SeedCampusAsync(context);
        var service = new LostItemService(new RecordingLostRepository(), new EmptyImages(), new EmptyStorage(), new EmptyMatchService(), new ReferenceDataService(context));
        var request = RequestLost(seed); request.FloorId = seed.BFloor1.Id; request.LocationId = seed.BFloor1Location.Id;
        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync("student", request));
        Assert.Contains("floor does not belong", error.Message);
    }

    [Fact]
    public async Task FoundItemCreation_RejectsFloorFromAnotherBlock()
    {
        await using var context = CreateContext(); var seed = await SeedCampusAsync(context);
        var service = new FoundItemService(new RecordingFoundRepository(), new EmptyImages(), new EmptyStorage(), new EmptyMatchService(), new ReferenceDataService(context));
        var request = RequestFound(seed); request.FloorId = seed.BFloor1.Id; request.LocationId = seed.BFloor1Location.Id;
        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync("student", request));
        Assert.Contains("floor does not belong", error.Message);
    }

    [Fact]
    public async Task LostItemCreation_RejectsLocationFromAnotherFloor()
    {
        await using var context = CreateContext(); var seed = await SeedCampusAsync(context);
        var service = new LostItemService(new RecordingLostRepository(), new EmptyImages(), new EmptyStorage(), new EmptyMatchService(), new ReferenceDataService(context));
        var request = RequestLost(seed); request.LocationId = seed.AFloor2Location.Id;
        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync("student", request));
        Assert.Contains("location does not belong", error.Message);
    }

    [Fact]
    public async Task FoundItemCreation_RejectsLocationFromAnotherFloor()
    {
        await using var context = CreateContext(); var seed = await SeedCampusAsync(context);
        var service = new FoundItemService(new RecordingFoundRepository(), new EmptyImages(), new EmptyStorage(), new EmptyMatchService(), new ReferenceDataService(context));
        var request = RequestFound(seed); request.LocationId = seed.AFloor2Location.Id;
        var error = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync("student", request));
        Assert.Contains("location does not belong", error.Message);
    }

    [Fact]
    public async Task LostItemCreation_PersistsLocationDetails()
    {
        await using var context = CreateContext(); var seed = await SeedCampusAsync(context);
        var repository = new RecordingLostRepository();
        var service = new LostItemService(repository, new EmptyImages(), new EmptyStorage(), new EmptyMatchService(), new ReferenceDataService(context));
        await service.CreateAsync("student", RequestLost(seed));
        Assert.Equal("Near the lift", Assert.Single(repository.Items).LocationDetails);
    }

    [Fact]
    public async Task FoundItemCreation_PersistsLocationDetails()
    {
        await using var context = CreateContext(); var seed = await SeedCampusAsync(context);
        var repository = new RecordingFoundRepository();
        var service = new FoundItemService(repository, new EmptyImages(), new EmptyStorage(), new EmptyMatchService(), new ReferenceDataService(context));
        await service.CreateAsync("student", RequestFound(seed));
        Assert.Equal("Near the lift", Assert.Single(repository.Items).LocationDetails);
    }

    [Fact]
    public async Task LostItemCreation_AcceptsNaturalLocationWithoutStructuredIds()
    {
        await using var context = CreateContext();
        var repository = new RecordingLostRepository();
        var service = new LostItemService(repository, new EmptyImages(), new EmptyStorage(), new EmptyMatchService(), new ReferenceDataService(context));

        await service.CreateAsync("student", new CreateLostItemDto
        {
            Title = "Black wallet",
            LocationDetails = "Block B 5th floor near the lift"
        });

        var item = Assert.Single(repository.Items);
        Assert.Null(item.LocationId);
        Assert.Equal("Block B 5th floor near the lift", item.LocationDetails);
    }

    [Fact]
    public async Task FoundItemCreation_AcceptsNaturalLocationWithoutStructuredIds()
    {
        await using var context = CreateContext();
        var repository = new RecordingFoundRepository();
        var service = new FoundItemService(repository, new EmptyImages(), new EmptyStorage(), new EmptyMatchService(), new ReferenceDataService(context));

        await service.CreateAsync("student", new CreateFoundItemDto
        {
            Title = "Black wallet",
            LocationDetails = "B block fifth-floor corridor beside the lift"
        });

        var item = Assert.Single(repository.Items);
        Assert.Null(item.LocationId);
        Assert.Equal("B block fifth-floor corridor beside the lift", item.LocationDetails);
    }

    [Fact]
    public async Task NaturalLanguageLocations_ContributeToSemanticMatch()
    {
        await using var context = CreateContext();
        var lost = new LostItem
        {
            Id = Guid.NewGuid(), UserId = "student", Status = "Open", Title = "black wallet",
            LocationDetails = "Block B 5th floor near the lift"
        };
        var found = new FoundItem
        {
            Id = Guid.NewGuid(), Status = "Available", Title = "black wallet",
            LocationDetails = "B block fifth-floor corridor beside the lift"
        };
        var service = new MatchService(new StaticLostRepository([lost]), new StaticFoundRepository([found]), new EmptyImages(), new EmptySimilarity(), new MemoryMatchRepository(), new EmptyNotifications(), new ReferenceDataService(context));

        var match = Assert.Single(await service.GetSuggestedMatchesAsync());

        Assert.Contains("Similar reported location", match.MatchedAttributes);
        Assert.True(match.ConfidenceScore >= 35m);
    }

    private static async Task<(decimal DifferentBlock, decimal SameBlock, decimal SameFloor, decimal SameLocation)> GetScoresAsync()
    {
        await using var context = CreateContext(); var seed = await SeedCampusAsync(context);
        var lost = new LostItem { Id = Guid.NewGuid(), UserId = "student", Status = "Open", Title = "black wallet", LocationId = seed.AFloor1Location.Id };
        var different = new FoundItem { Id = Guid.NewGuid(), Status = "Available", Title = "black wallet", LocationId = seed.BFloor1Location.Id };
        var sameBlock = new FoundItem { Id = Guid.NewGuid(), Status = "Available", Title = "black wallet", LocationId = seed.AFloor2Location.Id };
        var sameFloor = new FoundItem { Id = Guid.NewGuid(), Status = "Available", Title = "black wallet", LocationId = seed.AFloor1OtherLocation.Id };
        var sameLocation = new FoundItem { Id = Guid.NewGuid(), Status = "Available", Title = "black wallet", LocationId = seed.AFloor1Location.Id };
        var service = new MatchService(new StaticLostRepository([lost]), new StaticFoundRepository([different, sameBlock, sameFloor, sameLocation]), new EmptyImages(), new EmptySimilarity(), new MemoryMatchRepository(), new EmptyNotifications(), new ReferenceDataService(context));
        var matches = await service.GetSuggestedMatchesAsync();
        return (matches.Single(x => x.FoundItemId == different.Id).ConfidenceScore, matches.Single(x => x.FoundItemId == sameBlock.Id).ConfidenceScore, matches.Single(x => x.FoundItemId == sameFloor.Id).ConfidenceScore, matches.Single(x => x.FoundItemId == sameLocation.Id).ConfidenceScore);
    }

    private static CreateLostItemDto RequestLost(CampusSeed seed) => new() { Title = "Wallet", BuildingId = seed.BlockA.Id, FloorId = seed.AFloor1.Id, LocationId = seed.AFloor1Location.Id, LocationDetails = "Near the lift" };
    private static CreateFoundItemDto RequestFound(CampusSeed seed) => new() { Title = "Wallet", BuildingId = seed.BlockA.Id, FloorId = seed.AFloor1.Id, LocationId = seed.AFloor1Location.Id, LocationDetails = "Near the lift" };
    private static ApplicationDbContext CreateContext() => new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static async Task<CampusSeed> SeedCampusAsync(ApplicationDbContext context)
    {
        var blockA = new Building { Id = Guid.NewGuid(), Name = "Block A" }; var blockB = new Building { Id = Guid.NewGuid(), Name = "Block B" };
        var a1 = new Floor { Id = Guid.NewGuid(), BuildingId = blockA.Id, FloorNumber = 1, Name = "1st Floor" };
        var a2 = new Floor { Id = Guid.NewGuid(), BuildingId = blockA.Id, FloorNumber = 2, Name = "2nd Floor" };
        var b1 = new Floor { Id = Guid.NewGuid(), BuildingId = blockB.Id, FloorNumber = 1, Name = "1st Floor" };
        var a1Location = new Location { Id = Guid.NewGuid(), BuildingId = blockA.Id, FloorId = a1.Id, Name = "Computer Lab" };
        var a1Other = new Location { Id = Guid.NewGuid(), BuildingId = blockA.Id, FloorId = a1.Id, Name = "Corridor" };
        var a2Location = new Location { Id = Guid.NewGuid(), BuildingId = blockA.Id, FloorId = a2.Id, Name = "Classroom" };
        var b1Location = new Location { Id = Guid.NewGuid(), BuildingId = blockB.Id, FloorId = b1.Id, Name = "Computer Lab" };
        context.AddRange(blockA, blockB, a1, a2, b1, a1Location, a1Other, a2Location, b1Location); await context.SaveChangesAsync();
        return new CampusSeed(blockA, blockB, a1, a2, b1, a1Location, a1Other, a2Location, b1Location);
    }

    private sealed record CampusSeed(Building BlockA, Building BlockB, Floor AFloor1, Floor AFloor2, Floor BFloor1, Location AFloor1Location, Location AFloor1OtherLocation, Location AFloor2Location, Location BFloor1Location);
    private sealed class RecordingLostRepository : StaticLostRepository { public List<LostItem> Items { get; } = []; public RecordingLostRepository() : base([]) { } public override Task AddAsync(LostItem item, CancellationToken cancellationToken = default) { Items.Add(item); return Task.CompletedTask; } }
    private sealed class RecordingFoundRepository : StaticFoundRepository { public List<FoundItem> Items { get; } = []; public RecordingFoundRepository() : base([]) { } public override Task AddAsync(FoundItem item, CancellationToken cancellationToken = default) { Items.Add(item); return Task.CompletedTask; } }
    private class StaticLostRepository(IReadOnlyList<LostItem> items) : ILostItemRepository { public virtual Task AddAsync(LostItem item, CancellationToken cancellationToken = default) => Task.CompletedTask; public Task<LostItem?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) => Task.FromResult(items.SingleOrDefault(x => x.Id == id)); public Task<IReadOnlyList<LostItem>> GetAllAsync(CancellationToken cancellationToken = default) => Task.FromResult(items); public Task<IReadOnlyList<LostItem>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default) => Task.FromResult((IReadOnlyList<LostItem>)items.Where(x => x.UserId == userId).ToList()); public Task UpdateStatusAsync(Guid id, string status, CancellationToken cancellationToken = default) => Task.CompletedTask; public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask; }
    private class StaticFoundRepository(IReadOnlyList<FoundItem> items) : IFoundItemRepository { public virtual Task AddAsync(FoundItem item, CancellationToken cancellationToken = default) => Task.CompletedTask; public Task<FoundItem?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) => Task.FromResult(items.SingleOrDefault(x => x.Id == id)); public Task<IReadOnlyList<FoundItem>> GetAllAsync(CancellationToken cancellationToken = default) => Task.FromResult(items); public Task<IReadOnlyList<FoundItem>> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default) => Task.FromResult((IReadOnlyList<FoundItem>)items.Where(x => x.UserId == userId).ToList()); public Task UpdateStatusAsync(Guid id, string status, CancellationToken cancellationToken = default) => Task.CompletedTask; public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask; }
    private sealed class EmptyImages : IImageRepository { public Task AddRangeAsync(IReadOnlyCollection<Image> images, CancellationToken cancellationToken = default) => Task.CompletedTask; public Task<IReadOnlyList<Image>> GetByLostItemIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken = default) => Task.FromResult((IReadOnlyList<Image>)[]); public Task<IReadOnlyList<Image>> GetByFoundItemIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken = default) => Task.FromResult((IReadOnlyList<Image>)[]); }
    private sealed class EmptyStorage : IReportImageStorage { public void Validate(IReadOnlyCollection<Microsoft.AspNetCore.Http.IFormFile>? files) { } public Task<IReadOnlyList<Image>> SaveAsync(Guid? lostId, Guid? foundId, IReadOnlyCollection<Microsoft.AspNetCore.Http.IFormFile>? files, CancellationToken cancellationToken = default) => Task.FromResult((IReadOnlyList<Image>)[]); }
    private sealed class EmptyMatchService : IMatchService { public Task<IReadOnlyList<MatchDto>> GetSuggestedMatchesAsync(CancellationToken cancellationToken = default) => Task.FromResult((IReadOnlyList<MatchDto>)[]); public Task RefreshForLostItemAsync(Guid id, CancellationToken cancellationToken = default) => Task.CompletedTask; public Task RefreshForFoundItemAsync(Guid id, CancellationToken cancellationToken = default) => Task.CompletedTask; public Task<IReadOnlyList<MatchDto>> GetMyMatchesAsync(string userId, CancellationToken cancellationToken = default) => Task.FromResult((IReadOnlyList<MatchDto>)[]); }
    private sealed class MemoryMatchRepository : IMatchRepository { public Task AddAsync(Match match, CancellationToken cancellationToken = default) => Task.CompletedTask; public Task<bool> ExistsAsync(Guid lostItemId, Guid foundItemId, CancellationToken cancellationToken = default) => Task.FromResult(false); public Task<IReadOnlyList<Match>> GetAllAsync(CancellationToken cancellationToken = default) => Task.FromResult((IReadOnlyList<Match>)[]); public Task<IReadOnlyList<Match>> GetByFoundItemIdAsync(Guid foundItemId, CancellationToken cancellationToken = default) => Task.FromResult((IReadOnlyList<Match>)[]); public Task<IReadOnlyList<Match>> GetByLostItemUserIdAsync(string userId, CancellationToken cancellationToken = default) => Task.FromResult((IReadOnlyList<Match>)[]); public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask; }
    private sealed class EmptyNotifications : INotificationService { public Task CreateAsync(string userId, string message, CancellationToken cancellationToken = default) => Task.CompletedTask; }
    private sealed class EmptySimilarity : IImageSimilarityService { public Task<decimal?> GetBestSimilarityAsync(IReadOnlyCollection<string> lostImageUrls, IReadOnlyCollection<string> foundImageUrls, CancellationToken cancellationToken = default) => Task.FromResult<decimal?>(null); }
}

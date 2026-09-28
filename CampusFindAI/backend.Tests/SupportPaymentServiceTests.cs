using CampusFindAI.Api.Data;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace CampusFindAI.Api.Tests;

public sealed class SupportPaymentServiceTests
{
    [Theory]
    [InlineData(9)]
    [InlineData(-1)]
    [InlineData(5001)]
    public async Task Create_rejects_amount_outside_configured_range(decimal amount)
    {
        await using var fixture = new Fixture(development: true);
        await Assert.ThrowsAsync<ArgumentException>(() => fixture.Service.CreateAsync("user-a", new CreateSupportPaymentRequest { Amount = amount, Provider = "bkash" }));
    }

    [Fact]
    public async Task Verified_mock_success_marks_once_and_creates_one_notification()
    {
        await using var fixture = new Fixture(development: true);
        var created = await fixture.Service.CreateAsync("user-a", new CreateSupportPaymentRequest { Amount = 10m, Provider = "bkash" });
        var first = await fixture.Service.SimulateAsync("user-a", created.Payment.Id, "success");
        var repeated = await fixture.Service.SimulateAsync("user-a", created.Payment.Id, "success");

        Assert.Equal(SupportPaymentStatus.Succeeded.ToString(), first.Status);
        Assert.True(first.IsVerified);
        Assert.Equal(first.ProviderTransactionId, repeated.ProviderTransactionId);
        Assert.Equal(1, await fixture.Db.Notifications.CountAsync());
        Assert.Equal(1, await fixture.Db.AuditLogs.CountAsync(x => x.Action == "SupportPaymentSucceeded"));
    }

    [Fact]
    public async Task Payment_query_is_scoped_to_the_authenticated_owner()
    {
        await using var fixture = new Fixture(development: true);
        var created = await fixture.Service.CreateAsync("user-a", new CreateSupportPaymentRequest { Amount = 50m, Provider = "nagad" });
        Assert.Null(await fixture.Service.GetAsync("user-b", created.Payment.Id));
        Assert.NotNull(await fixture.Service.GetAsync("user-a", created.Payment.Id));
    }

    [Fact]
    public async Task Production_disables_mock_and_disabled_provider_cannot_initiate()
    {
        await using var fixture = new Fixture(development: false);
        var availability = await fixture.Service.GetAvailabilityAsync();
        Assert.False(availability.IsTestMode);
        Assert.False(availability.BkashAvailable);
        await Assert.ThrowsAsync<InvalidOperationException>(() => fixture.Service.CreateAsync("user-a", new CreateSupportPaymentRequest { Amount = 10m, Provider = "bkash" }));
    }

    [Fact]
    public async Task Manual_reference_stays_pending_and_never_creates_a_success_notification()
    {
        await using var fixture = new Fixture(development: true, manual: true);
        var created = await fixture.Service.CreateAsync("user-a", new CreateSupportPaymentRequest { Amount = 50m, Provider = "bkash" });
        var submitted = await fixture.Service.SubmitManualReferenceAsync("user-a", created.Payment.Id, new SubmitManualSupportPaymentRequest { TransactionReference = "BKASH-REFERENCE-123" });

        Assert.Equal(SupportPaymentStatus.Pending.ToString(), submitted.Status);
        Assert.False(submitted.IsVerified);
        Assert.Equal("BKASH-REFERENCE-123", submitted.ProviderTransactionId);
        Assert.Equal(0, await fixture.Db.Notifications.CountAsync());
    }

    private sealed class Fixture : IAsyncDisposable
    {
        public ApplicationDbContext Db { get; }
        public ISupportPaymentService Service { get; }
        public Fixture(bool development, bool manual = false)
        {
            Db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
            var options = Options.Create(new PaymentsOptions { UseMockProvider = !manual, Currency = "BDT", MinimumAmount = 10m, MaximumAmount = 5000m, ManualSupport = new ManualSupportOptions { Enabled = manual, RecipientName = manual ? "Masrafi" : "", RecipientNumber = manual ? "01789722133" : "" } });
            var environment = new TestEnvironment(development ? "Development" : "Production");
            var providers = new IPaymentProvider[] { new MockPaymentProvider(environment, options), new ManualSupportPaymentProvider(options), new BkashPaymentProvider(options), new NagadPaymentProvider(options) };
            Service = new SupportPaymentService(Db, providers, options, environment, NullLogger<SupportPaymentService>.Instance);
        }
        public ValueTask DisposeAsync() => Db.DisposeAsync();
    }

    private sealed class TestEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;
        public string ApplicationName { get; set; } = "CampusFindAI.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}

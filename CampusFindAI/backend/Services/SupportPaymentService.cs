using CampusFindAI.Api.Data;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CampusFindAI.Api.Services;

public sealed class SupportPaymentService(
    ApplicationDbContext db,
    IEnumerable<IPaymentProvider> providers,
    IOptions<PaymentsOptions> paymentOptions,
    IHostEnvironment environment,
    ILogger<SupportPaymentService> logger) : ISupportPaymentService
{
    private readonly PaymentsOptions options = paymentOptions.Value;

    public Task<SupportPaymentAvailabilityDto> GetAvailabilityAsync(CancellationToken cancellationToken = default) => Task.FromResult(new SupportPaymentAvailabilityDto
    {
        MinimumAmount = options.MinimumAmount, MaximumAmount = options.MaximumAmount, Currency = options.Currency,
        BkashAvailable = FindProvider(PaymentProvider.Bkash) is not null,
        NagadAvailable = FindProvider(PaymentProvider.Nagad) is not null,
        IsTestMode = IsMockEnabled(),
        IsManualSupport = options.ManualSupport.IsConfigured,
        RecipientName = options.ManualSupport.IsConfigured ? options.ManualSupport.RecipientName : null,
        RecipientNumber = options.ManualSupport.IsConfigured ? options.ManualSupport.RecipientNumber : null
    });

    public async Task<CreateSupportPaymentResponse> CreateAsync(string userId, CreateSupportPaymentRequest request, CancellationToken cancellationToken = default)
    {
        if (!Enum.TryParse<PaymentProvider>(request.Provider, true, out var provider)) throw new ArgumentException("Choose bKash or Nagad.");
        if (request.Amount < options.MinimumAmount || request.Amount > options.MaximumAmount) throw new ArgumentException($"Support amount must be between ৳{options.MinimumAmount:0} and ৳{options.MaximumAmount:0}.");
        if (decimal.Round(request.Amount, 2) != request.Amount) throw new ArgumentException("Support amount may use at most two decimal places.");
        var gateway = FindProvider(provider) ?? throw new InvalidOperationException($"{ProviderName(provider)} is currently unavailable.");

        var payment = new SupportPayment
        {
            Id = Guid.NewGuid(), UserId = userId, Provider = provider, Amount = request.Amount, Currency = options.Currency,
            Status = SupportPaymentStatus.Pending, MerchantInvoiceNumber = CreateInvoice(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        db.SupportPayments.Add(payment);
        db.AuditLogs.Add(new AuditLog { Id = Guid.NewGuid(), UserId = userId, Action = "SupportPaymentCreated", Details = $"Payment={payment.Id}; Provider={ProviderName(provider)}; Invoice={payment.MerchantInvoiceNumber}; Amount={payment.Amount:0.00} {payment.Currency}" });
        await db.SaveChangesAsync(cancellationToken); // Persist before provider initialization.

        try
        {
            var checkout = await gateway.CreateCheckoutAsync(payment, cancellationToken);
            logger.LogInformation("Support payment created paymentId={PaymentId} provider={Provider} invoice={Invoice} status={Status}", payment.Id, provider, payment.MerchantInvoiceNumber, payment.Status);
            return new CreateSupportPaymentResponse { Payment = ToDto(payment, checkout.IsTestPayment), CheckoutUrl = checkout.RedirectUrl, IsTestPayment = checkout.IsTestPayment };
        }
        catch
        {
            payment.Status = SupportPaymentStatus.Failed; payment.FailureReasonCode = "CHECKOUT_INIT_FAILED"; payment.UpdatedAt = DateTime.UtcNow;
            db.AuditLogs.Add(new AuditLog { Id = Guid.NewGuid(), UserId = userId, Action = "SupportPaymentFailed", Details = $"Payment={payment.Id}; Reason=CHECKOUT_INIT_FAILED" });
            await db.SaveChangesAsync(cancellationToken);
            throw;
        }
    }

    public async Task<SupportPaymentDto?> GetAsync(string userId, Guid paymentId, CancellationToken cancellationToken = default)
    {
        var item = await db.SupportPayments.AsNoTracking().SingleOrDefaultAsync(x => x.Id == paymentId && x.UserId == userId, cancellationToken);
        return item is null ? null : ToDto(item, IsMockEnabled());
    }

    public async Task<IReadOnlyList<SupportPaymentDto>> GetMineAsync(string userId, CancellationToken cancellationToken = default)
    {
        var payments = await db.SupportPayments.AsNoTracking().Where(x => x.UserId == userId).OrderByDescending(x => x.CreatedAt).Take(100).ToListAsync(cancellationToken);
        return payments.Select(x => ToDto(x, IsMockEnabled())).ToList();
    }

    public async Task<SupportPaymentDto> SimulateAsync(string userId, Guid paymentId, string outcome, CancellationToken cancellationToken = default)
    {
        var mock = providers.OfType<MockPaymentProvider>().SingleOrDefault(x => x.IsEnabled) ?? throw new KeyNotFoundException("Test payment simulator is unavailable.");
        if (outcome is not ("success" or "failed" or "cancelled" or "cancel")) throw new ArgumentException("Choose a valid test payment outcome.");
        // SQL Server uses one transaction for the state change and its side effects.
        // The non-relational branch keeps the service unit-testable without weakening production behavior.
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(cancellationToken) : null;
        var payment = await db.SupportPayments.SingleOrDefaultAsync(x => x.Id == paymentId && x.UserId == userId, cancellationToken) ?? throw new KeyNotFoundException("Support payment not found.");
        if (payment.Status != SupportPaymentStatus.Pending) return ToDto(payment, true); // duplicate test callback is safe.

        var verification = await mock.VerifyAsync(payment, outcome, cancellationToken);
        if (verification.Amount != payment.Amount || !string.Equals(verification.Currency, payment.Currency, StringComparison.Ordinal))
            throw new InvalidOperationException("Payment verification amount or currency did not match the support payment.");
        payment.ProviderPaymentId = verification.ProviderPaymentId;
        payment.UpdatedAt = DateTime.UtcNow;
        if (verification.IsSuccessful)
        {
            if (string.IsNullOrWhiteSpace(verification.ProviderTransactionId)) throw new InvalidOperationException("Verified payments require a provider transaction reference.");
            payment.Status = SupportPaymentStatus.Succeeded; payment.IsVerified = true; payment.ProviderTransactionId = verification.ProviderTransactionId; payment.CompletedAt = DateTime.UtcNow;
            db.Notifications.Add(new Notification { Id = Guid.NewGuid(), UserId = userId, Message = $"Thank you for supporting CampusFind with ৳{payment.Amount:0}! ☕", Link = $"/support/success?id={payment.Id}", Category = "SUPPORT_PAYMENT", CreatedAt = DateTime.UtcNow });
            db.AuditLogs.Add(new AuditLog { Id = Guid.NewGuid(), UserId = userId, Action = "SupportPaymentSucceeded", Details = $"Payment={payment.Id}; Provider={ProviderName(payment.Provider)}; Invoice={payment.MerchantInvoiceNumber}; Transaction={payment.ProviderTransactionId}" });
        }
        else
        {
            payment.Status = verification.IsCancelled ? SupportPaymentStatus.Cancelled : SupportPaymentStatus.Failed;
            payment.FailureReasonCode = verification.FailureCode ?? "VERIFICATION_FAILED";
            db.AuditLogs.Add(new AuditLog { Id = Guid.NewGuid(), UserId = userId, Action = "SupportPaymentFailed", Details = $"Payment={payment.Id}; Provider={ProviderName(payment.Provider)}; Reason={payment.FailureReasonCode}" });
        }
        await db.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        logger.LogInformation("Support payment verified paymentId={PaymentId} provider={Provider} status={Status} transaction={Transaction}", payment.Id, payment.Provider, payment.Status, payment.ProviderTransactionId);
        return ToDto(payment, true);
    }

    public async Task<SupportPaymentDto> SubmitManualReferenceAsync(string userId, Guid paymentId, SubmitManualSupportPaymentRequest request, CancellationToken cancellationToken = default)
    {
        if (!options.ManualSupport.IsConfigured) throw new InvalidOperationException("Manual support is unavailable.");
        var reference = request.TransactionReference.Trim();
        if (reference.Length is < 4 or > 128) throw new ArgumentException("Enter a valid transaction reference.");
        var payment = await db.SupportPayments.SingleOrDefaultAsync(x => x.Id == paymentId && x.UserId == userId, cancellationToken) ?? throw new KeyNotFoundException("Support payment not found.");
        if (payment.Status != SupportPaymentStatus.Pending) return ToDto(payment, false);
        if (!string.IsNullOrEmpty(payment.ProviderTransactionId)) return ToDto(payment, false);
        if (await db.SupportPayments.AnyAsync(x => x.ProviderTransactionId == reference, cancellationToken)) throw new InvalidOperationException("That transaction reference has already been submitted.");
        payment.ProviderTransactionId = reference;
        payment.FailureReasonCode = "AWAITING_MANUAL_CONFIRMATION";
        payment.UpdatedAt = DateTime.UtcNow;
        db.AuditLogs.Add(new AuditLog { Id = Guid.NewGuid(), UserId = userId, Action = "SupportPaymentManualReferenceSubmitted", Details = $"Payment={payment.Id}; Provider={ProviderName(payment.Provider)}; Invoice={payment.MerchantInvoiceNumber}; Transaction={reference}" });
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Manual support reference submitted paymentId={PaymentId} provider={Provider} invoice={Invoice}", payment.Id, payment.Provider, payment.MerchantInvoiceNumber);
        return ToDto(payment, false);
    }

    public async Task<SupportPaymentAdminSummaryDto> GetAdminSummaryAsync(CancellationToken cancellationToken = default)
    {
        var query = db.SupportPayments.AsNoTracking();
        var grouped = await query.Where(x => x.Status == SupportPaymentStatus.Succeeded).GroupBy(x => x.Provider).Select(g => new SupportPaymentProviderBreakdownDto { Provider = g.Key == PaymentProvider.Bkash ? "bKash" : "Nagad", SuccessfulAmount = g.Sum(x => x.Amount), SuccessfulPayments = g.Count() }).ToListAsync(cancellationToken);
        return new SupportPaymentAdminSummaryDto
        {
            TotalSuccessfulAmount = await query.Where(x => x.Status == SupportPaymentStatus.Succeeded).SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m,
            SuccessfulPayments = await query.CountAsync(x => x.Status == SupportPaymentStatus.Succeeded, cancellationToken),
            PendingPayments = await query.CountAsync(x => x.Status == SupportPaymentStatus.Created || x.Status == SupportPaymentStatus.Pending, cancellationToken),
            FailedOrCancelledPayments = await query.CountAsync(x => x.Status == SupportPaymentStatus.Failed || x.Status == SupportPaymentStatus.Cancelled, cancellationToken),
            ByProvider = grouped,
            RecentPayments = (await query.OrderByDescending(x => x.CreatedAt).Take(20).ToListAsync(cancellationToken)).Select(x => ToDto(x, IsMockEnabled())).ToList()
        };
    }

    private IPaymentProvider? FindProvider(PaymentProvider provider) => providers.FirstOrDefault(item => item.CanHandle(provider));
    private bool IsMockEnabled() => environment.IsDevelopment() && options.UseMockProvider;
    private static string CreateInvoice() => $"CF-SUPPORT-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..42];
    private static string ProviderName(PaymentProvider provider) => provider == PaymentProvider.Bkash ? "bKash" : "Nagad";
    private static SupportPaymentDto ToDto(SupportPayment item, bool isTestPayment) => new() { Id = item.Id, Provider = ProviderName(item.Provider), Amount = item.Amount, Currency = item.Currency, Status = item.Status.ToString(), MerchantInvoiceNumber = item.MerchantInvoiceNumber, ProviderTransactionId = item.ProviderTransactionId, CreatedAt = item.CreatedAt, CompletedAt = item.CompletedAt, IsVerified = item.IsVerified, IsTestPayment = isTestPayment };
}

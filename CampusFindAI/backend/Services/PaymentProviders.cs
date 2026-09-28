using CampusFindAI.Api.Models;
using Microsoft.Extensions.Options;

namespace CampusFindAI.Api.Services;

public sealed record PaymentCheckout(string? RedirectUrl, bool IsTestPayment);
public sealed record PaymentVerification(bool IsSuccessful, bool IsCancelled, decimal Amount, string Currency, string? ProviderPaymentId, string? ProviderTransactionId, string? FailureCode);

/// <summary>Provider boundary. Production provider APIs stay unimplemented until CampusFind receives official merchant documentation.</summary>
public interface IPaymentProvider
{
    bool CanHandle(PaymentProvider provider);
    Task<PaymentCheckout> CreateCheckoutAsync(SupportPayment payment, CancellationToken cancellationToken);
    Task<PaymentVerification> VerifyAsync(SupportPayment payment, string simulationOutcome, CancellationToken cancellationToken);
}

public sealed class MockPaymentProvider(IHostEnvironment environment, IOptions<PaymentsOptions> options) : IPaymentProvider
{
    public bool IsEnabled => environment.IsDevelopment() && options.Value.UseMockProvider;
    public bool CanHandle(PaymentProvider provider) => IsEnabled;
    public Task<PaymentCheckout> CreateCheckoutAsync(SupportPayment payment, CancellationToken cancellationToken) =>
        Task.FromResult(new PaymentCheckout(null, true));

    public Task<PaymentVerification> VerifyAsync(SupportPayment payment, string simulationOutcome, CancellationToken cancellationToken)
    {
        var outcome = simulationOutcome.Trim().ToLowerInvariant();
        return Task.FromResult(outcome switch
        {
            "success" => new PaymentVerification(true, false, payment.Amount, payment.Currency, $"TEST-PAY-{payment.Id:N}", $"TEST-TXN-{payment.Id:N}", null),
            "cancel" or "cancelled" => new PaymentVerification(false, true, payment.Amount, payment.Currency, $"TEST-PAY-{payment.Id:N}", null, "TEST_CANCELLED"),
            _ => new PaymentVerification(false, false, payment.Amount, payment.Currency, $"TEST-PAY-{payment.Id:N}", null, "TEST_FAILED")
        });
    }
}

/// <summary>Shows an approved local recipient's payment instructions. It never confirms receipt of funds.</summary>
public sealed class ManualSupportPaymentProvider(IOptions<PaymentsOptions> options) : IPaymentProvider
{
    public bool CanHandle(PaymentProvider provider) => options.Value.ManualSupport.IsConfigured;
    public Task<PaymentCheckout> CreateCheckoutAsync(SupportPayment payment, CancellationToken cancellationToken) => Task.FromResult(new PaymentCheckout(null, false));
    public Task<PaymentVerification> VerifyAsync(SupportPayment payment, string simulationOutcome, CancellationToken cancellationToken) =>
        throw new InvalidOperationException("Manual support payments require recipient confirmation and cannot be verified automatically.");
}

public sealed class BkashPaymentProvider(IOptions<PaymentsOptions> options) : IPaymentProvider
{
    public bool CanHandle(PaymentProvider provider) => provider == PaymentProvider.Bkash && options.Value.Bkash.Enabled;
    public Task<PaymentCheckout> CreateCheckoutAsync(SupportPayment payment, CancellationToken cancellationToken) =>
        throw new InvalidOperationException("bKash checkout is unavailable until official CampusFind merchant API documentation and credentials are configured.");
    public Task<PaymentVerification> VerifyAsync(SupportPayment payment, string simulationOutcome, CancellationToken cancellationToken) =>
        throw new InvalidOperationException("bKash verification is unavailable until the official merchant integration is installed.");
}

public sealed class NagadPaymentProvider(IOptions<PaymentsOptions> options) : IPaymentProvider
{
    public bool CanHandle(PaymentProvider provider) => provider == PaymentProvider.Nagad && options.Value.Nagad.Enabled;
    public Task<PaymentCheckout> CreateCheckoutAsync(SupportPayment payment, CancellationToken cancellationToken) =>
        throw new InvalidOperationException("Nagad checkout is unavailable until official CampusFind merchant API documentation and credentials are configured.");
    public Task<PaymentVerification> VerifyAsync(SupportPayment payment, string simulationOutcome, CancellationToken cancellationToken) =>
        throw new InvalidOperationException("Nagad verification is unavailable until the official merchant integration is installed.");
}

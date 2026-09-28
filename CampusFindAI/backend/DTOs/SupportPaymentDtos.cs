using System.ComponentModel.DataAnnotations;
using CampusFindAI.Api.Models;

namespace CampusFindAI.Api.DTOs;

public sealed class CreateSupportPaymentRequest
{
    [Range(typeof(decimal), "10", "5000")]
    public decimal Amount { get; set; }
    [Required, MaxLength(20)]
    public string Provider { get; set; } = string.Empty;
}

public sealed class SupportPaymentDto
{
    public Guid Id { get; set; }
    public string Provider { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "BDT";
    public string Status { get; set; } = string.Empty;
    public string MerchantInvoiceNumber { get; set; } = string.Empty;
    public string? ProviderTransactionId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public bool IsVerified { get; set; }
    public bool IsTestPayment { get; set; }
}

public sealed class CreateSupportPaymentResponse
{
    public SupportPaymentDto Payment { get; set; } = new();
    public string? CheckoutUrl { get; set; }
    public bool IsTestPayment { get; set; }
}

public sealed class SupportPaymentAvailabilityDto
{
    public decimal MinimumAmount { get; set; }
    public decimal MaximumAmount { get; set; }
    public string Currency { get; set; } = "BDT";
    public bool BkashAvailable { get; set; }
    public bool NagadAvailable { get; set; }
    public bool IsTestMode { get; set; }
    public bool IsManualSupport { get; set; }
    public string? RecipientName { get; set; }
    public string? RecipientNumber { get; set; }
}

public sealed class SubmitManualSupportPaymentRequest
{
    [Required, StringLength(128, MinimumLength = 4)]
    public string TransactionReference { get; set; } = string.Empty;
}

public sealed class SupportPaymentAdminSummaryDto
{
    public decimal TotalSuccessfulAmount { get; set; }
    public int SuccessfulPayments { get; set; }
    public int PendingPayments { get; set; }
    public int FailedOrCancelledPayments { get; set; }
    public IReadOnlyList<SupportPaymentProviderBreakdownDto> ByProvider { get; set; } = [];
    public IReadOnlyList<SupportPaymentDto> RecentPayments { get; set; } = [];
}

public sealed class SupportPaymentProviderBreakdownDto
{
    public string Provider { get; set; } = string.Empty;
    public decimal SuccessfulAmount { get; set; }
    public int SuccessfulPayments { get; set; }
}

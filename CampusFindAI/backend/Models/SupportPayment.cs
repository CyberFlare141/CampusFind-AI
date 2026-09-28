namespace CampusFindAI.Api.Models;

public enum PaymentProvider
{
    Bkash,
    Nagad
}

public enum SupportPaymentStatus
{
    Created,
    Pending,
    Succeeded,
    Failed,
    Cancelled,
    Expired,
    Refunded
}

/// <summary>A voluntary CampusFind support contribution. This never grants product access.</summary>
public class SupportPayment
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public PaymentProvider Provider { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "BDT";
    public SupportPaymentStatus Status { get; set; } = SupportPaymentStatus.Created;
    public string MerchantInvoiceNumber { get; set; } = string.Empty;
    public string? ProviderPaymentId { get; set; }
    public string? ProviderTransactionId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string? FailureReasonCode { get; set; }
    public bool IsVerified { get; set; }

    public ApplicationUser? User { get; set; }
}

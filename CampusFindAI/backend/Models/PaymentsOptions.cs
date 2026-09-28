namespace CampusFindAI.Api.Models;

public sealed class PaymentsOptions
{
    public const string SectionName = "Payments";
    public string Currency { get; set; } = "BDT";
    public decimal MinimumAmount { get; set; } = 10m;
    public decimal MaximumAmount { get; set; } = 5000m;
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";
    public bool UseMockProvider { get; set; }
    public ManualSupportOptions ManualSupport { get; set; } = new();
    public PaymentProviderOptions Bkash { get; set; } = new();
    public PaymentProviderOptions Nagad { get; set; } = new();
}

public sealed class ManualSupportOptions
{
    public bool Enabled { get; set; }
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientNumber { get; set; } = string.Empty;
    public bool IsConfigured => Enabled && !string.IsNullOrWhiteSpace(RecipientName) && !string.IsNullOrWhiteSpace(RecipientNumber);
}

public sealed class PaymentProviderOptions
{
    public bool Enabled { get; set; }
    public string Environment { get; set; } = "Sandbox";
}

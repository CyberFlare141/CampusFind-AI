using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface ISupportPaymentService
{
    Task<SupportPaymentAvailabilityDto> GetAvailabilityAsync(CancellationToken cancellationToken = default);
    Task<CreateSupportPaymentResponse> CreateAsync(string userId, CreateSupportPaymentRequest request, CancellationToken cancellationToken = default);
    Task<SupportPaymentDto?> GetAsync(string userId, Guid paymentId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SupportPaymentDto>> GetMineAsync(string userId, CancellationToken cancellationToken = default);
    Task<SupportPaymentDto> SimulateAsync(string userId, Guid paymentId, string outcome, CancellationToken cancellationToken = default);
    Task<SupportPaymentDto> SubmitManualReferenceAsync(string userId, Guid paymentId, SubmitManualSupportPaymentRequest request, CancellationToken cancellationToken = default);
    Task<SupportPaymentAdminSummaryDto> GetAdminSummaryAsync(CancellationToken cancellationToken = default);
}

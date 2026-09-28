using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface ISecurityOfficerRequestService
{
    Task<SecurityOfficerRequestDto> SubmitAsync(string userId, CreateSecurityOfficerRequestDto request, CancellationToken cancellationToken = default);
    Task<SecurityOfficerRequestDto?> GetLatestForUserAsync(string userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SecurityOfficerRequestDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<SecurityOfficerRequestDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<SecurityOfficerRequestDto> ApproveAsync(Guid id, string administratorId, string? notes, CancellationToken cancellationToken = default);
    Task<SecurityOfficerRequestDto> RejectAsync(Guid id, string administratorId, string? notes, CancellationToken cancellationToken = default);
}

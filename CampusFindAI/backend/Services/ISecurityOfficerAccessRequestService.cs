using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface ISecurityOfficerAccessRequestService
{
    Task<AccessRequestDto> CreateAsync(string userId, CreateAccessRequestDto request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AccessRequestDto>> GetMineAsync(string userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AccessRequestDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<AccessRequestDto> ApproveAsync(Guid id, string administratorId, CancellationToken cancellationToken = default);
    Task<AccessRequestDto> RejectAsync(Guid id, string administratorId, RejectAccessRequestDto request, CancellationToken cancellationToken = default);
}
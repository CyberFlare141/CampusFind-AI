using CampusFindAI.Api.Models;

namespace CampusFindAI.Api.Repositories;

public interface ISecurityOfficerAccessRequestRepository
{
    Task<SecurityOfficerAccessRequest?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<SecurityOfficerAccessRequest?> GetPendingForUserAsync(string userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SecurityOfficerAccessRequest>> GetForUserAsync(string userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SecurityOfficerAccessRequest>> GetAllAsync(CancellationToken cancellationToken = default);
    Task CreateAsync(SecurityOfficerAccessRequest request, CancellationToken cancellationToken = default);
    Task UpdateDecisionAsync(Guid id, AccessRequestStatus status, string reviewerId, string? rejectionReason, CancellationToken cancellationToken = default);
}
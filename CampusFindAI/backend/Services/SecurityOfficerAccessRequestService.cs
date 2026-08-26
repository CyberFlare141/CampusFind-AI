using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;

namespace CampusFindAI.Api.Services;

public class SecurityOfficerAccessRequestService(
    ISecurityOfficerAccessRequestRepository repository,
    IUserRepository userRepository,
    IAuditLogService auditLogService) : ISecurityOfficerAccessRequestService
{
    public async Task<AccessRequestDto> CreateAsync(string userId, CreateAccessRequestDto request, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new UnauthorizedAccessException("User account could not be found.");
        if (user.Role != UserRole.Student) throw new InvalidOperationException("Only Student accounts can request Security Officer access.");
        if (string.IsNullOrWhiteSpace(request.Reason)) throw new ArgumentException("A reason for requesting access is required.");
        if (await repository.GetPendingForUserAsync(userId, cancellationToken) is not null)
            throw new InvalidOperationException("You already have a pending Security Officer access request.");

        var accessRequest = new SecurityOfficerAccessRequest { Id = Guid.NewGuid(), UserId = userId, Email = user.Email ?? string.Empty, FullName = request.FullName?.Trim(), StaffId = request.StaffId?.Trim(), Department = request.Department?.Trim(), Reason = request.Reason.Trim() };
        await repository.CreateAsync(accessRequest, cancellationToken);
        await auditLogService.LogAsync(userId, "SecurityOfficerAccessRequested", $"Access request {accessRequest.Id} created.", cancellationToken);
        return Map(accessRequest);
    }

    public async Task<IReadOnlyList<AccessRequestDto>> GetMineAsync(string userId, CancellationToken cancellationToken = default) =>
        (await repository.GetForUserAsync(userId, cancellationToken)).Select(Map).ToList();

    public async Task<IReadOnlyList<AccessRequestDto>> GetAllAsync(CancellationToken cancellationToken = default) =>
        (await repository.GetAllAsync(cancellationToken)).Select(Map).ToList();

    public async Task<AccessRequestDto> ApproveAsync(Guid id, string administratorId, CancellationToken cancellationToken = default)
    {
        var request = await GetPendingAsync(id, cancellationToken);
        await userRepository.SetRoleAsync(request.UserId, UserRole.SecurityOfficer, cancellationToken);
        await repository.UpdateDecisionAsync(id, AccessRequestStatus.Approved, administratorId, null, cancellationToken);
        await auditLogService.LogAsync(administratorId, "SecurityOfficerAccessApproved", $"Access request {id} approved for user {request.UserId}.", cancellationToken);
        request.Status = AccessRequestStatus.Approved; request.ReviewedByUserId = administratorId; request.ReviewedAt = DateTime.UtcNow;
        return Map(request);
    }

    public async Task<AccessRequestDto> RejectAsync(Guid id, string administratorId, RejectAccessRequestDto decision, CancellationToken cancellationToken = default)
    {
        var request = await GetPendingAsync(id, cancellationToken);
        await repository.UpdateDecisionAsync(id, AccessRequestStatus.Rejected, administratorId, decision.Reason?.Trim(), cancellationToken);
        await auditLogService.LogAsync(administratorId, "SecurityOfficerAccessRejected", $"Access request {id} rejected for user {request.UserId}.", cancellationToken);
        request.Status = AccessRequestStatus.Rejected; request.ReviewedByUserId = administratorId; request.ReviewedAt = DateTime.UtcNow; request.RejectionReason = decision.Reason?.Trim();
        return Map(request);
    }

    private async Task<SecurityOfficerAccessRequest> GetPendingAsync(Guid id, CancellationToken cancellationToken) =>
        await repository.GetByIdAsync(id, cancellationToken) is { Status: AccessRequestStatus.Pending } request
            ? request
            : throw new InvalidOperationException("This access request is not pending.");

    private static AccessRequestDto Map(SecurityOfficerAccessRequest request) => new() { Id = request.Id, UserId = request.UserId, Email = request.Email, FullName = request.FullName, StaffId = request.StaffId, Department = request.Department, Reason = request.Reason, Status = request.Status, ReviewedByUserId = request.ReviewedByUserId, ReviewedAt = request.ReviewedAt, RejectionReason = request.RejectionReason, CreatedAt = request.CreatedAt };
}
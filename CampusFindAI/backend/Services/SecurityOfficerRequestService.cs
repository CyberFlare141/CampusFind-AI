using CampusFindAI.Api.Data;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Services;

public sealed class SecurityOfficerRequestService(
    ApplicationDbContext dbContext,
    IUserRepository users,
    INotificationService notifications,
    IAuditLogService auditLog) : ISecurityOfficerRequestService
{
    public async Task<SecurityOfficerRequestDto> SubmitAsync(string userId, CreateSecurityOfficerRequestDto request, CancellationToken cancellationToken = default)
    {
        var user = await users.GetByIdAsync(userId, cancellationToken) ?? throw new UnauthorizedAccessException();
        if (!user.IsRestricted) throw new InvalidOperationException("Only restricted users can request Security Officer access.");
        if (await dbContext.SecurityOfficerRequests.AnyAsync(x => x.UserId == userId && x.Status == SecurityOfficerRequestStatus.Pending, cancellationToken))
            throw new InvalidOperationException("You already have a pending Security Officer request.");

        var entity = new SecurityOfficerRequest
        {
            Id = Guid.NewGuid(), UserId = userId, Reason = request.Reason.Trim(),
            AdditionalInformation = request.AdditionalInformation.Trim(), SubmittedAt = DateTime.UtcNow
        };
        dbContext.SecurityOfficerRequests.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetRequiredAsync(entity.Id, cancellationToken);
    }

    public async Task<SecurityOfficerRequestDto?> GetLatestForUserAsync(string userId, CancellationToken cancellationToken = default) =>
        await MapQuery().Where(x => x.UserId == userId).OrderByDescending(x => x.SubmittedAt).Select(ToDto).FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<SecurityOfficerRequestDto>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await MapQuery().OrderByDescending(x => x.SubmittedAt).Select(ToDto).ToListAsync(cancellationToken);

    public async Task<SecurityOfficerRequestDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await MapQuery().Where(x => x.Id == id).Select(ToDto).FirstOrDefaultAsync(cancellationToken);

    public Task<SecurityOfficerRequestDto> ApproveAsync(Guid id, string administratorId, string? notes, CancellationToken cancellationToken = default) =>
        DecideAsync(id, administratorId, notes, SecurityOfficerRequestStatus.Approved, cancellationToken);

    public Task<SecurityOfficerRequestDto> RejectAsync(Guid id, string administratorId, string? notes, CancellationToken cancellationToken = default) =>
        DecideAsync(id, administratorId, notes, SecurityOfficerRequestStatus.Rejected, cancellationToken);

    private async Task<SecurityOfficerRequestDto> DecideAsync(Guid id, string administratorId, string? notes, SecurityOfficerRequestStatus status, CancellationToken cancellationToken)
    {
        var entity = await dbContext.SecurityOfficerRequests.Include(x => x.User).SingleOrDefaultAsync(x => x.Id == id, cancellationToken)
            ?? throw new KeyNotFoundException("Security Officer request not found.");
        if (entity.Status != SecurityOfficerRequestStatus.Pending)
            throw new InvalidOperationException("This request has already been reviewed.");

        entity.Status = status;
        entity.ReviewedAt = DateTime.UtcNow;
        entity.ReviewedByUserId = administratorId;
        entity.AdminNotes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();

        if (status == SecurityOfficerRequestStatus.Approved)
        {
            await users.UpdateRoleAsync(entity.UserId, UserRole.SecurityOfficer, cancellationToken);
            await users.AddToRoleAsync(entity.UserId, UserRole.SecurityOfficer.ToString(), cancellationToken);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        var message = status == SecurityOfficerRequestStatus.Approved
            ? "Your Security Officer request has been approved. Please sign in again to access the Security Desk."
            : "Your Security Officer request has been rejected.";
        await notifications.CreateAsync(entity.UserId, message, "/security-officer-request", "officer-request", cancellationToken);
        await auditLog.LogAsync(administratorId, status == SecurityOfficerRequestStatus.Approved ? "SecurityOfficerRequestApproved" : "SecurityOfficerRequestRejected", $"Request {id} for user {entity.UserId}.", cancellationToken);
        return await GetRequiredAsync(id, cancellationToken);
    }

    private IQueryable<SecurityOfficerRequest> MapQuery() => dbContext.SecurityOfficerRequests.AsNoTracking().Include(x => x.User).Include(x => x.User!.UserProfile);

    private async Task<SecurityOfficerRequestDto> GetRequiredAsync(Guid id, CancellationToken cancellationToken) =>
        await MapQuery().Where(x => x.Id == id).Select(ToDto).SingleAsync(cancellationToken);

    private static readonly System.Linq.Expressions.Expression<Func<SecurityOfficerRequest, SecurityOfficerRequestDto>> ToDto = x => new SecurityOfficerRequestDto
    {
        Id = x.Id, UserId = x.UserId, UserEmail = x.User!.Email ?? string.Empty,
        FullName = x.User.UserProfile!.FullName, Phone = x.User.UserProfile.Phone,
        University = x.User.UserProfile.University, Department = x.User.UserProfile.Department,
        JobTitle = x.User.UserProfile.JobTitle, StudentId = x.User.UserProfile.StudentId,
        Reason = x.Reason, AdditionalInformation = x.AdditionalInformation,
        Status = x.Status.ToString(), SubmittedAt = x.SubmittedAt, ReviewedAt = x.ReviewedAt,
        ReviewedByUserId = x.ReviewedByUserId, AdminNotes = x.AdminNotes
    };
}

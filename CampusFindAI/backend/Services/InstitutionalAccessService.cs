using CampusFindAI.Api.Models;
using CampusFindAI.Api.Repositories;

namespace CampusFindAI.Api.Services;

public sealed class InstitutionalAccessService(IUserRepository users) : IInstitutionalAccessService
{
    public async Task<bool> CanPerformInstitutionalActionsAsync(string userId, CancellationToken cancellationToken = default)
    {
        var user = await users.GetByIdAsync(userId, cancellationToken);
        return user is not null && (!user.IsRestricted || user.Role is UserRole.SecurityOfficer or UserRole.Administrator);
    }
}

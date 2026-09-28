using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Services;

public class ReputationService(ApplicationDbContext db) : IReputationService
{
    public async Task<Reputation> GetOrCreateAsync(string userId, CancellationToken cancellationToken = default)
    {
        var reputation = await db.Reputations.SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (reputation is not null) return reputation;
        reputation = new Reputation { Id = Guid.NewGuid(), UserId = userId, Points = 0, Level = "New", UpdatedAt = DateTime.UtcNow };
        db.Reputations.Add(reputation);
        await db.SaveChangesAsync(cancellationToken);
        return reputation;
    }

    public async Task AwardPointsAsync(string userId, int points, string reason, string relatedEntityType, Guid relatedEntityId, CancellationToken cancellationToken = default)
    {
        if (await db.ReputationHistories.AnyAsync(x => x.UserId == userId && x.RelatedEntityType == relatedEntityType && x.RelatedEntityId == relatedEntityId && x.Reason == reason, cancellationToken)) return;
        var reputation = await GetOrCreateAsync(userId, cancellationToken);
        reputation.Points = Math.Max(0, reputation.Points + points);
        reputation.Level = reputation.Points switch { >= 100 => "Highly Trusted", >= 50 => "Trusted", >= 15 => "Contributor", _ => "New" };
        reputation.UpdatedAt = DateTime.UtcNow;
        db.ReputationHistories.Add(new ReputationHistory { UserId = userId, Reputation = reputation, PointChange = points, Reason = reason, RelatedEntityType = relatedEntityType, RelatedEntityId = relatedEntityId });
        await db.SaveChangesAsync(cancellationToken);
    }
}

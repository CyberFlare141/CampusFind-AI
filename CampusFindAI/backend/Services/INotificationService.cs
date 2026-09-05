namespace CampusFindAI.Api.Services;

public interface INotificationService
{
    Task CreateAsync(string userId, string message, CancellationToken cancellationToken = default);
}

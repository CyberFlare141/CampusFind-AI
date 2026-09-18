namespace CampusFindAI.Api.Services;

public interface IEmailService
{
    Task SendEmailConfirmationAsync(string email, string userId, string token, CancellationToken cancellationToken = default);
    Task SendPasswordResetAsync(string email, string userId, string token, CancellationToken cancellationToken = default);
}


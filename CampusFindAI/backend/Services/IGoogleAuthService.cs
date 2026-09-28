using Google.Apis.Auth;

namespace CampusFindAI.Api.Services;

public interface IGoogleAuthService
{
    Task<GoogleJsonWebSignature.Payload> ValidateIdTokenAsync(string idToken, CancellationToken cancellationToken = default);
}


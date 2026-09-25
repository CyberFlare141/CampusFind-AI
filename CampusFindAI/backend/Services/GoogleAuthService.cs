using CampusFindAI.Api.Models;
using Google.Apis.Auth;
using Microsoft.Extensions.Options;

namespace CampusFindAI.Api.Services;

public class GoogleAuthService(
    IOptions<GoogleAuthOptions> options,
    ILogger<GoogleAuthService> logger) : IGoogleAuthService
{
    private readonly GoogleAuthOptions _options = options.Value;

    public async Task<GoogleJsonWebSignature.Payload> ValidateIdTokenAsync(
        string idToken,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idToken))
        {
            throw new InvalidOperationException("Google ID token is required.");
        }

        if (string.IsNullOrWhiteSpace(_options.ClientId))
        {
            throw new InvalidOperationException("Google authentication is not configured. Set Google:ClientId in configuration.");
        }

        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [_options.ClientId.Trim()]
            };

            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
            if (payload is null)
            {
                throw new InvalidOperationException("Google authentication token could not be verified.");
            }

            if (!payload.EmailVerified)
            {
                throw new InvalidOperationException("The Google account's email address has not been verified by Google.");
            }

            return payload;
        }
        catch (InvalidJwtException ex)
        {
            logger.LogWarning(ex, "Invalid Google ID token supplied during authentication.");
            throw new InvalidOperationException("Google token is invalid or has expired. Please sign in again.");
        }
        catch (Exception ex) when (ex is not InvalidOperationException)
        {
            logger.LogError(ex, "Unexpected error during Google token verification.");
            throw new InvalidOperationException("Could not verify Google authentication token.");
        }
    }
}


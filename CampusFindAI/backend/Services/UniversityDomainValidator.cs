using System.Net.Mail;
using CampusFindAI.Api.Models;
using Microsoft.Extensions.Options;

namespace CampusFindAI.Api.Services;

public class UniversityDomainValidator(IOptions<UniversityEmailOptions> options) : IUniversityDomainValidator
{
    private readonly UniversityEmailOptions _options = options.Value;

    public bool IsAllowedDomain(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return false;

        var normalizedEmail = email.Trim().ToLowerInvariant();
        if (normalizedEmail.Contains(' '))
            return false;
        var atIndex = normalizedEmail.LastIndexOf('@');
        if (atIndex <= 0 || atIndex == normalizedEmail.Length - 1)
            return false;

        // Ensure email doesn't have multiple '@' or invalid chars
        if (normalizedEmail.IndexOf('@') != atIndex)
            return false;

        var domain = normalizedEmail[(atIndex + 1)..].Trim();
        if (string.IsNullOrWhiteSpace(domain) || domain.Contains(' ') || !domain.Contains('.'))
            return false;

        var allowedDomains = _options.AllowedDomains ?? [];
        if (allowedDomains.Count == 0)
        {
            // Fallback default if not configured: allow edu domains
            return domain.EndsWith(".edu", StringComparison.OrdinalIgnoreCase) ||
                   domain.EndsWith(".edu.bd", StringComparison.OrdinalIgnoreCase);
        }

        foreach (var allowed in allowedDomains)
        {
            if (string.IsNullOrWhiteSpace(allowed)) continue;
            var normalizedAllowed = allowed.Trim().ToLowerInvariant();

            // Exact match (case-insensitive)
            if (string.Equals(domain, normalizedAllowed, StringComparison.OrdinalIgnoreCase))
                return true;

            // Controlled subdomain matching: e.g. "student.example.edu.bd" matching "example.edu.bd"
            // Only if AllowSubdomains is enabled
            if (_options.AllowSubdomains && domain.EndsWith("." + normalizedAllowed, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    public string? GetDomain(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return null;
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var atIndex = normalizedEmail.LastIndexOf('@');
        if (atIndex <= 0 || atIndex == normalizedEmail.Length - 1) return null;
        return normalizedEmail[(atIndex + 1)..].Trim();
    }
}


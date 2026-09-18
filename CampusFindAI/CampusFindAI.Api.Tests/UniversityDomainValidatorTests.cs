using CampusFindAI.Api.Models;
using CampusFindAI.Api.Services;
using Microsoft.Extensions.Options;

namespace CampusFindAI.Api.Tests;

public sealed class UniversityDomainValidatorTests
{
    private static IUniversityDomainValidator CreateValidator(
        List<string>? allowedDomains = null,
        bool allowSubdomains = false)
    {
        var options = new UniversityEmailOptions
        {
            AllowedDomains = allowedDomains ?? ["aust.edu", "student.aust.edu", "example.edu.bd"],
            AllowSubdomains = allowSubdomains
        };
        return new UniversityDomainValidator(Options.Create(options));
    }

    [Theory]
    [InlineData("student@aust.edu")]
    [InlineData("faculty@student.aust.edu")]
    [InlineData("user@example.edu.bd")]
    [InlineData("STUDENT@AUST.EDU")] // Case-insensitive
    [InlineData("  user@aust.edu  ")] // Whitespace trimmed
    public void AllowedUniversityEmail_Succeeds(string email)
    {
        var validator = CreateValidator();
        Assert.True(validator.IsAllowedDomain(email));
    }

    [Theory]
    [InlineData("user@gmail.com")]
    [InlineData("user@yahoo.com")]
    [InlineData("user@otheruniversity.com")]
    [InlineData("user@aust.com")]
    public void DisallowedDomain_Fails(string email)
    {
        var validator = CreateValidator();
        Assert.False(validator.IsAllowedDomain(email));
    }

    [Theory]
    [InlineData("user@aust.edu.evil.com")]
    [InlineData("user@aust.edu.attacker.org")]
    [InlineData("user@example.edu.bd.phishing.net")]
    public void SpoofedSuffixDomain_Fails(string email)
    {
        var validator = CreateValidator();
        Assert.False(validator.IsAllowedDomain(email));
    }

    [Theory]
    [InlineData("cse.student@aust.edu", true)]
    [InlineData("user@cse.aust.edu", false)] // Without subdomains allowed, subdomains fail
    public void SubdomainRule_BehavesAccordingToConfiguration(string email, bool expectedWithoutSubdomains)
    {
        var validator = CreateValidator(allowSubdomains: false);
        Assert.Equal(expectedWithoutSubdomains, validator.IsAllowedDomain(email));

        var validatorWithSubdomains = CreateValidator(allowSubdomains: true);
        Assert.True(validatorWithSubdomains.IsAllowedDomain("user@cse.aust.edu"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("notanemail")]
    [InlineData("missingdomain@")]
    [InlineData("@missinguser.com")]
    [InlineData("double@@aust.edu")]
    [InlineData("space in@aust.edu")]
    [InlineData("user@aust .edu")]
    public void MalformedEmail_Fails(string? email)
    {
        var validator = CreateValidator();
        Assert.False(validator.IsAllowedDomain(email));
    }
}


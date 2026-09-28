namespace CampusFindAI.Api.Services;

public interface IUniversityDomainValidator
{
    bool IsAllowedDomain(string? email);
    string? GetDomain(string? email);
}


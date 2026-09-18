namespace CampusFindAI.Api.Models;

public class UniversityEmailOptions
{
    public const string SectionName = "UniversityEmail";

    public List<string> AllowedDomains { get; set; } = [];
    public bool AllowSubdomains { get; set; }
}


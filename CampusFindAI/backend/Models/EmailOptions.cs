namespace CampusFindAI.Api.Models;

public class EmailOptions
{
    public const string SectionName = "Email";

    public string Provider { get; set; } = "Development"; // "Development" or "Smtp"
    public string FromName { get; set; } = "CampusFind AI";
    public string FromAddress { get; set; } = "noreply@campusfind.ai";
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";
    public SmtpOptions Smtp { get; set; } = new();
}

public class SmtpOptions
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool EnableSsl { get; set; } = true;
}


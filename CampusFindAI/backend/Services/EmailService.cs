using System.Net;
using System.Net.Mail;
using System.Text;
using CampusFindAI.Api.Models;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;

namespace CampusFindAI.Api.Services;

public class EmailService(
    IOptions<EmailOptions> options,
    IWebHostEnvironment environment,
    ILogger<EmailService> logger) : IEmailService
{
    private readonly EmailOptions _options = options.Value;

    public async Task SendEmailConfirmationAsync(
        string email,
        string userId,
        string token,
        CancellationToken cancellationToken = default)
    {
        var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
        var baseUrl = _options.FrontendBaseUrl.TrimEnd('/');
        var verifyUrl = $"{baseUrl}/verify-email?userId={Uri.EscapeDataString(userId)}&token={encodedToken}";

        var subject = "Confirm your CampusFind AI email address";
        var body = GenerateConfirmationEmailHtml(email, verifyUrl);

        await SendEmailAsync(email, subject, body, verifyUrl, "Email Confirmation", cancellationToken);
    }

    public async Task SendPasswordResetAsync(
        string email,
        string userId,
        string token,
        CancellationToken cancellationToken = default)
    {
        var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
        var baseUrl = _options.FrontendBaseUrl.TrimEnd('/');
        var resetUrl = $"{baseUrl}/reset-password?userId={Uri.EscapeDataString(userId)}&token={encodedToken}";

        var subject = "Reset your CampusFind AI password";
        var body = GeneratePasswordResetEmailHtml(email, resetUrl);

        await SendEmailAsync(email, subject, body, resetUrl, "Password Reset", cancellationToken);
    }

    private async Task SendEmailAsync(
        string toEmail,
        string subject,
        string htmlBody,
        string actionUrl,
        string actionType,
        CancellationToken cancellationToken)
    {
        // Development mode fallback / logger delivery
        if (_options.Provider.Equals("Development", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(_options.Smtp.Host))
        {
            if (environment.IsDevelopment())
            {
                logger.LogInformation(
                    "\n==================================================\n" +
                    "[DEVELOPMENT EMAIL DELIVERY]\n" +
                    "To: {ToEmail}\n" +
                    "Type: {ActionType}\n" +
                    "Action URL: {ActionUrl}\n" +
                    "==================================================\n",
                    toEmail, actionType, actionUrl);
            }
            else
            {
                logger.LogWarning("Email provider not configured in non-development environment. Message to {Email} was not dispatched.", toEmail);
            }
            return;
        }

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(_options.FromAddress, _options.FromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true,
            };
            message.To.Add(new MailAddress(toEmail));

            using var smtpClient = new SmtpClient(_options.Smtp.Host, _options.Smtp.Port)
            {
                EnableSsl = _options.Smtp.EnableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
            };

            if (!string.IsNullOrWhiteSpace(_options.Smtp.Username))
            {
                smtpClient.Credentials = new NetworkCredential(_options.Smtp.Username, _options.Smtp.Password);
            }

            await smtpClient.SendMailAsync(message, cancellationToken);
            logger.LogInformation("Dispatched {ActionType} email to {ToEmail}", actionType, toEmail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send {ActionType} email to {ToEmail}", actionType, toEmail);
            // In Development, do not crash the request if SMTP fails
            if (!environment.IsDevelopment())
            {
                throw new InvalidOperationException("Failed to send email. Please verify email service configuration.");
            }
        }
    }

    private static string GenerateConfirmationEmailHtml(string email, string verifyUrl)
    {
        var encodedEmail = WebUtility.HtmlEncode(email);
        return $$"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background-color: #f4f6f3; color: #1c231a; margin: 0; padding: 24px; }
            .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e1e7de; padding: 36px 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
            .header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
            .logo { font-size: 20px; font-weight: 800; color: #315e54; letter-spacing: -0.02em; }
            h2 { font-size: 22px; color: #1c231a; margin-top: 0; margin-bottom: 12px; }
            p { font-size: 15px; line-height: 1.6; color: #4b5548; margin-bottom: 20px; }
            .btn-wrap { margin: 28px 0; text-align: center; }
            .btn { display: inline-block; background-color: #315e54; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; }
            .footer { border-top: 1px solid #e1e7de; padding-top: 20px; font-size: 13px; color: #738070; line-height: 1.5; }
            .link-break { word-break: break-all; color: #315e54; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="logo">✦ CampusFind AI</span>
            </div>
            <h2>Confirm your university email</h2>
            <p>Hello,</p>
            <p>Thank you for creating an account with <strong>CampusFind AI</strong> using your university email (<code>{{encodedEmail}}</code>). Please verify your email address to activate your account and start reporting and claiming items.</p>
            <div class="btn-wrap">
              <a href="{{verifyUrl}}" class="btn" target="_blank">Verify Email Address</a>
            </div>
            <p>Or paste this link into your browser:</p>
            <p class="link-break">{{verifyUrl}}</p>
            <div class="footer">
              <p>This verification link will expire in 24 hours. If you did not create a CampusFind AI account, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
        """;
    }

    private static string GeneratePasswordResetEmailHtml(string email, string resetUrl)
    {
        var encodedEmail = WebUtility.HtmlEncode(email);
        return $$"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; background-color: #f4f6f3; color: #1c231a; margin: 0; padding: 24px; }
            .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e1e7de; padding: 36px 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
            .header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
            .logo { font-size: 20px; font-weight: 800; color: #315e54; letter-spacing: -0.02em; }
            h2 { font-size: 22px; color: #1c231a; margin-top: 0; margin-bottom: 12px; }
            p { font-size: 15px; line-height: 1.6; color: #4b5548; margin-bottom: 20px; }
            .btn-wrap { margin: 28px 0; text-align: center; }
            .btn { display: inline-block; background-color: #315e54; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; }
            .footer { border-top: 1px solid #e1e7de; padding-top: 20px; font-size: 13px; color: #738070; line-height: 1.5; }
            .link-break { word-break: break-all; color: #315e54; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="logo">✦ CampusFind AI</span>
            </div>
            <h2>Password reset request</h2>
            <p>Hello,</p>
            <p>A password reset was requested for your CampusFind AI account (<code>{{encodedEmail}}</code>). Click the button below to choose a new password:</p>
            <div class="btn-wrap">
              <a href="{{resetUrl}}" class="btn" target="_blank">Reset Password</a>
            </div>
            <p>Or paste this link into your browser:</p>
            <p class="link-break">{{resetUrl}}</p>
            <div class="footer">
              <p>For security, this password reset link is valid for a limited time. If you did not request a password reset, you can safely ignore this email and your password will remain unchanged.</p>
            </div>
          </div>
        </body>
        </html>
        """;
    }
}


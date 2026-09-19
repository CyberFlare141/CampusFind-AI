using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IUserService userService) : ControllerBase
{
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("AuthRateLimit")]
    public async Task<ActionResult<RegisterResponseDto>> Register(
        RegisterDto request,
        CancellationToken cancellationToken)
    {
        var response = await userService.RegisterAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("AuthRateLimit")]
    public async Task<ActionResult<AuthResponseDto>> Login(
        LoginDto request,
        CancellationToken cancellationToken)
    {
        var response = await userService.LoginAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpPost("google")]
    [AllowAnonymous]
    [EnableRateLimiting("AuthRateLimit")]
    public async Task<ActionResult<AuthResponseDto>> GoogleLogin(
        GoogleAuthDto request,
        CancellationToken cancellationToken)
    {
        var response = await userService.GoogleLoginAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpPost("confirm-email")]
    [AllowAnonymous]
    [EnableRateLimiting("AuthRateLimit")]
    public async Task<ActionResult<AuthMessageResponseDto>> ConfirmEmail(
        ConfirmEmailDto request,
        CancellationToken cancellationToken)
    {
        var response = await userService.ConfirmEmailAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpPost("resend-confirmation")]
    [AllowAnonymous]
    [EnableRateLimiting("AuthRateLimit")]
    public async Task<ActionResult<AuthMessageResponseDto>> ResendConfirmation(
        ResendConfirmationDto request,
        CancellationToken cancellationToken)
    {
        var response = await userService.ResendConfirmationAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting("AuthRateLimit")]
    public async Task<ActionResult<AuthMessageResponseDto>> ForgotPassword(
        ForgotPasswordDto request,
        CancellationToken cancellationToken)
    {
        var response = await userService.ForgotPasswordAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting("AuthRateLimit")]
    public async Task<ActionResult<AuthMessageResponseDto>> ResetPassword(
        ResetPasswordDto request,
        CancellationToken cancellationToken)
    {
        var response = await userService.ResetPasswordAsync(request, cancellationToken);
        return Ok(response);
    }
}

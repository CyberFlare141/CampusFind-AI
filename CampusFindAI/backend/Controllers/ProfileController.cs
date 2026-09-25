using System.Security.Claims;
using CampusFindAI.Api.Data;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Models;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/profile")]
public class ProfileController(
    IUserService userService,
    ApplicationDbContext dbContext,
    IWebHostEnvironment environment) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ProfileDto>> Get(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrEmpty(userId) ? Unauthorized() : Ok(await userService.GetProfileAsync(userId, cancellationToken));
    }

    [HttpPut]
    [HttpPatch]
    public async Task<ActionResult<ProfileDto>> Update(UpdateProfileDto request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrEmpty(userId) ? Unauthorized() : Ok(await userService.UpdateProfileAsync(userId, request, cancellationToken));
    }

    [HttpPost("avatar")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<ProfileDto>> UploadAvatar(IFormFile file, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "Please choose an image file to upload." });
        }

        if (file.Length > 5 * 1024 * 1024)
        {
            return BadRequest(new { message = "Profile photo must be 5 MB or smaller." });
        }

        var allowedContentTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/png",
            "image/webp"
        };

        if (!allowedContentTypes.Contains(file.ContentType))
        {
            return BadRequest(new { message = "Only JPG, PNG, and WebP images are allowed for profile photos." });
        }

        var uploadDirectory = Path.Combine(environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"), "uploads", "avatars");
        Directory.CreateDirectory(uploadDirectory);

        var extension = file.ContentType switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            _ => ".jpg"
        };

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadDirectory, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var profile = await dbContext.UserProfiles
            .SingleOrDefaultAsync(value => value.UserId == userId, cancellationToken);

        if (profile is null)
        {
            profile = new UserProfile { Id = Guid.NewGuid(), UserId = userId };
            dbContext.UserProfiles.Add(profile);
        }

        profile.AvatarUrl = $"/uploads/avatars/{fileName}";
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(await userService.GetProfileAsync(userId, cancellationToken));
    }

    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordDto request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        await userService.ChangePasswordAsync(userId, request, cancellationToken);
        return NoContent();
    }
}

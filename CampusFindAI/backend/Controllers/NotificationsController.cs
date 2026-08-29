using System.Security.Claims;
using CampusFindAI.Api.Data;
using CampusFindAI.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NotificationDto>>> Get(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var notifications = await dbContext.Notifications.AsNoTracking().Where(item => item.UserId == userId).OrderByDescending(item => item.CreatedAt).Take(20).Select(item => new NotificationDto { Id = item.Id, Message = item.Message, IsRead = item.IsRead, CreatedAt = item.CreatedAt }).ToListAsync(cancellationToken);
        return Ok(notifications);
    }

    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var notification = await dbContext.Notifications.SingleOrDefaultAsync(item => item.Id == id && item.UserId == userId, cancellationToken);
        if (notification is null) return NotFound();
        notification.IsRead = true;
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}

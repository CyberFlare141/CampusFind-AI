using System.Security.Claims;
using CampusFindAI.Api.Data;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/notifications")]
public class NotificationsController(ApplicationDbContext dbContext, IHubContext<NotificationHub> hub) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<NotificationPageDto>> Get([FromQuery] DateTime? before, [FromQuery] int take = 20, CancellationToken cancellationToken = default)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        take = Math.Clamp(take, 1, 50);
        var query = dbContext.Notifications.AsNoTracking().Where(item => item.UserId == userId);
        if (before.HasValue) query = query.Where(item => item.CreatedAt < before.Value);
        var notifications = await query.OrderByDescending(item => item.CreatedAt).Take(take).Select(item => new NotificationDto { Id = item.Id, Message = item.Message, Link = item.Link, Category = item.Category, IsRead = item.IsRead, CreatedAt = item.CreatedAt }).ToListAsync(cancellationToken);
        return Ok(new NotificationPageDto { Items = notifications, NextBefore = notifications.Count == take ? notifications[^1].CreatedAt : null });
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult<NotificationUnreadCountDto>> GetUnreadCount(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        return Ok(new NotificationUnreadCountDto { Count = await dbContext.Notifications.CountAsync(item => item.UserId == userId && !item.IsRead, cancellationToken) });
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
        await hub.Clients.User(userId).SendAsync("NotificationRead", id, cancellationToken);
        return NoContent();
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        await dbContext.Notifications.Where(item => item.UserId == userId && !item.IsRead)
            .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.IsRead, true), cancellationToken);
        await hub.Clients.User(userId).SendAsync("NotificationsRead", cancellationToken);
        return NoContent();
    }
}

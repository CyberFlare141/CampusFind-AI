using System.Security.Claims;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class LostItemsController(
    ILostItemService service) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(26 * 1024 * 1024)]
    public async Task<ActionResult<LostItemDto>> Create(
        [FromForm] CreateLostItemDto request,
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var item = await service.CreateAsync(
            userId,
            request,
            cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = item.Id },
            item);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<LostItemDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var items = await service.GetAllAsync(cancellationToken);

        return Ok(items);
    }

    [HttpGet("my")]
    public async Task<ActionResult<IReadOnlyList<LostItemDto>>> GetMyItems(
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var items = await service.GetMyItemsAsync(
            userId,
            cancellationToken);

        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LostItemDto>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var item = await service.GetByIdAsync(
            id,
            cancellationToken);

        if (item is null)
        {
            return NotFound();
        }

        return Ok(item);
    }
}

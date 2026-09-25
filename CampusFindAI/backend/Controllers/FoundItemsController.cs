using System.Security.Claims;
using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class FoundItemsController(
    IFoundItemService service,
    IInstitutionalAccessService accessService) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(26 * 1024 * 1024)]
    public async Task<ActionResult<FoundItemDto>> Create(
        [FromForm] CreateFoundItemDto request,
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }
        if (!await accessService.CanPerformInstitutionalActionsAsync(userId, cancellationToken)) return Forbid();

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
    public async Task<ActionResult<IReadOnlyList<FoundItemDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var items = await service.GetAllAsync(cancellationToken);

        return Ok(items);
    }

    [HttpGet("my")]
    public async Task<ActionResult<IReadOnlyList<FoundItemDto>>> GetMyItems(
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

    [HttpGet("ownership-verification/questions")]
    public async Task<ActionResult<IReadOnlyList<VerificationQuestionDto>>> GetOwnershipVerificationQuestions(CancellationToken cancellationToken) =>
        Ok(await service.GetOwnershipVerificationQuestionsAsync(cancellationToken));

    [HttpGet("{id:guid}/ownership-verification")]
    public async Task<ActionResult<FounderVerificationResponseDto>> GetFounderVerification(Guid id, CancellationToken cancellationToken) =>
        await FounderVerificationAction(userId => service.GetFounderVerificationAsync(userId, id, cancellationToken));

    [HttpPut("{id:guid}/ownership-verification")]
    public async Task<ActionResult<FounderVerificationResponseDto>> SaveFounderVerification(Guid id, SaveFounderVerificationAnswersDto request, CancellationToken cancellationToken) =>
        await FounderVerificationAction(userId => service.SaveFounderVerificationAsync(userId, id, request, cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FoundItemDto>> GetById(
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

    [HttpPut("{id:guid}")]
    [RequestSizeLimit(26 * 1024 * 1024)]
    public async Task<ActionResult<FoundItemDto>> Update(Guid id, [FromForm] UpdateFoundItemDto request, CancellationToken cancellationToken) =>
        await ManageAsync(userId => service.UpdateAsync(userId, id, request, cancellationToken));

    [HttpPatch("{id:guid}/archive")]
    public async Task<ActionResult<FoundItemDto>> Archive(Guid id, CancellationToken cancellationToken) =>
        await ManageAsync(userId => service.ArchiveAsync(userId, id, cancellationToken));

    [HttpPatch("{id:guid}/reopen")]
    public async Task<ActionResult<FoundItemDto>> Reopen(Guid id, CancellationToken cancellationToken) =>
        await ManageAsync(userId => service.ReopenAsync(userId, id, cancellationToken));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier); if (string.IsNullOrEmpty(userId)) return Unauthorized();
        try { await service.DeleteAsync(userId, id, cancellationToken); return NoContent(); }
        catch (ReportManagementException ex) { return ManagementError(ex); }
    }

    private async Task<ActionResult<FoundItemDto>> ManageAsync(Func<string, Task<FoundItemDto>> operation)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier); if (string.IsNullOrEmpty(userId)) return Unauthorized();
        try { return Ok(await operation(userId)); } catch (ReportManagementException ex) { return ManagementError(ex); }
    }
    private async Task<ActionResult<FounderVerificationResponseDto>> FounderVerificationAction(Func<string, Task<FounderVerificationResponseDto>> operation)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier); if (string.IsNullOrEmpty(userId)) return Unauthorized();
        try { return Ok(await operation(userId)); }
        catch (ReportManagementException ex) { return ManagementError(ex); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
    private ActionResult ManagementError(ReportManagementException ex) => ex.Failure switch { ReportManagementFailure.NotFound => NotFound(), ReportManagementFailure.Forbidden => Forbid(), ReportManagementFailure.Conflict => Conflict(new { message = ex.Message }), _ => BadRequest() };
}

using CampusFindAI.Api.DTOs;
using CampusFindAI.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusFindAI.Api.Controllers;

[ApiController, Authorize(Roles = "Administrator"), Route("api/admin/support-payments")]
public sealed class AdminSupportPaymentsController(ISupportPaymentService service) : ControllerBase
{
    [HttpGet]
    public Task<SupportPaymentAdminSummaryDto> Get(CancellationToken cancellationToken) => service.GetAdminSummaryAsync(cancellationToken);
}

using CampusFindAI.Api.DTOs;
using Microsoft.AspNetCore.Http;

namespace CampusFindAI.Api.Services;

public interface IVisualSearchService
{
    Task<VisualSearchResponseDto> SearchAsync(IFormFile image, CancellationToken cancellationToken = default);
}

using CampusFindAI.Api.Models;
using Microsoft.AspNetCore.Http;

namespace CampusFindAI.Api.Services;

public interface IReportImageStorage
{
    void Validate(IReadOnlyCollection<IFormFile>? files);
    Task<IReadOnlyList<Image>> SaveAsync(Guid? lostItemId, Guid? foundItemId, IReadOnlyCollection<IFormFile>? files, CancellationToken cancellationToken = default);
}

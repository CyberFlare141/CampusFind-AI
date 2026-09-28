using CampusFindAI.Api.Models;
using Microsoft.AspNetCore.Http;

namespace CampusFindAI.Api.Services;

public sealed class ReportImageStorage(IWebHostEnvironment environment) : IReportImageStorage
{
    public const int MaxFilesPerReport = 5;
    public const long MaxFileSizeBytes = 5 * 1024 * 1024;
    private static readonly IReadOnlyDictionary<string, string> AllowedContentTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg", ["image/png"] = ".png", ["image/webp"] = ".webp"
    };

    public void Validate(IReadOnlyCollection<IFormFile>? files)
    {
        if (files is null || files.Count == 0) return;
        if (files.Count > MaxFilesPerReport) throw new ArgumentException($"A report can contain at most {MaxFilesPerReport} images.");
        foreach (var file in files)
        {
            if (file.Length == 0) throw new ArgumentException("Uploaded images cannot be empty.");
            if (file.Length > MaxFileSizeBytes) throw new ArgumentException("Each image must be 5 MB or smaller.");
            if (!AllowedContentTypes.ContainsKey(file.ContentType)) throw new ArgumentException("Only JPG, PNG, and WebP images are allowed.");
            using var stream = file.OpenReadStream();
            if (!HasExpectedSignature(stream, file.ContentType)) throw new ArgumentException("One or more uploads are not valid image files.");
        }
    }

    public async Task<IReadOnlyList<Image>> SaveAsync(Guid? lostItemId, Guid? foundItemId, IReadOnlyCollection<IFormFile>? files, CancellationToken cancellationToken = default)
    {
        if (files is null || files.Count == 0) return [];
        Validate(files);
        var directory = Path.Combine(environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"), "uploads", "reports");
        Directory.CreateDirectory(directory);
        var savedPaths = new List<string>();
        var images = new List<Image>();
        try
        {
            foreach (var file in files)
            {
                var storedName = $"{Guid.NewGuid():N}{AllowedContentTypes[file.ContentType]}";
                var filePath = Path.Combine(directory, storedName);
                await using (var target = new FileStream(filePath, FileMode.CreateNew, FileAccess.Write, FileShare.None)) await file.CopyToAsync(target, cancellationToken);
                savedPaths.Add(filePath);
                images.Add(new Image { Id = Guid.NewGuid(), LostItemId = lostItemId, FoundItemId = foundItemId, Url = $"/uploads/reports/{storedName}" });
            }
            return images;
        }
        catch
        {
            foreach (var path in savedPaths) File.Delete(path);
            throw;
        }
    }

    private static bool HasExpectedSignature(Stream stream, string contentType)
    {
        Span<byte> header = stackalloc byte[12];
        var length = stream.Read(header);
        return contentType.ToLowerInvariant() switch
        {
            "image/jpeg" => length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            "image/png" => length >= 8 && header[..8].SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),
            "image/webp" => length >= 12 && header[..4].SequenceEqual("RIFF"u8) && header[8..12].SequenceEqual("WEBP"u8),
            _ => false
        };
    }
}

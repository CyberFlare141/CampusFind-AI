using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace CampusFindAI.Api.Services;

/// <summary>Compares locally stored report images; it is a signal, never proof of ownership.</summary>
public sealed class ImageSimilarityService(IWebHostEnvironment environment) : IImageSimilarityService
{
    private const int SampleSize = 16;

    public async Task<decimal?> GetBestSimilarityAsync(IReadOnlyCollection<string> leftImageUrls, IReadOnlyCollection<string> rightImageUrls, CancellationToken cancellationToken = default)
    {
        if (leftImageUrls.Count == 0 || rightImageUrls.Count == 0) return null;
        var left = await GetFingerprintsAsync(leftImageUrls, cancellationToken);
        var right = await GetFingerprintsAsync(rightImageUrls, cancellationToken);
        return left.Count == 0 || right.Count == 0 ? null : left.SelectMany(a => right.Select(b => Compare(a, b))).Max();
    }

    private async Task<IReadOnlyList<byte[]>> GetFingerprintsAsync(IReadOnlyCollection<string> urls, CancellationToken cancellationToken)
    {
        var fingerprints = new List<byte[]>();
        foreach (var url in urls.Take(5))
        {
            var path = GetSafePhysicalPath(url);
            if (path is null || !File.Exists(path)) continue;
            try
            {
                await using var stream = File.OpenRead(path);
                using var image = await Image.LoadAsync<Rgba32>(stream, cancellationToken);
                image.Mutate(context => context.Resize(SampleSize, SampleSize));
                var fingerprint = new byte[SampleSize * SampleSize * 3]; var index = 0;
                for (var y = 0; y < SampleSize; y++)
                {
                    for (var x = 0; x < SampleSize; x++) { var pixel = image[x, y]; fingerprint[index++] = pixel.R; fingerprint[index++] = pixel.G; fingerprint[index++] = pixel.B; }
                }
                fingerprints.Add(fingerprint);
            }
            catch (UnknownImageFormatException) { }
        }
        return fingerprints;
    }

    private string? GetSafePhysicalPath(string url)
    {
        const string prefix = "/uploads/reports/";
        if (!url.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return null;
        var fileName = Path.GetFileName(url[prefix.Length..]);
        return string.IsNullOrWhiteSpace(fileName) ? null : Path.Combine(environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"), "uploads", "reports", fileName);
    }

    private static decimal Compare(byte[] left, byte[] right)
    {
        var difference = 0d;
        for (var i = 0; i < left.Length; i++) difference += Math.Abs(left[i] - right[i]);
        return Math.Round((decimal)Math.Clamp(1d - difference / (left.Length * 255d), 0d, 1d), 3);
    }
}

using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace CampusFindAI.Api.Services;

/// <summary>
/// Compares locally stored report images; it is a coarse visual signal and never proof of ownership.
///
/// The application has no configured vision/embedding provider.  Keeping this comparison local means
/// it can reuse the report files already stored by <see cref="ReportImageStorage"/> and does not create
/// a second copy of any upload.  It deliberately measures only robust, low-level visual characteristics
/// (image structure and colour distribution), not object identity.
/// </summary>
public sealed class ImageSimilarityService(IWebHostEnvironment environment) : IImageSimilarityService
{
    private const int HashWidth = 17;
    private const int HashHeight = 16;
    private const int ColourBinsPerChannel = 4;
    private const int MaximumImagesPerReport = ReportImageStorage.MaxFilesPerReport;

    public async Task<decimal?> GetBestSimilarityAsync(IReadOnlyCollection<string> leftImageUrls, IReadOnlyCollection<string> rightImageUrls, CancellationToken cancellationToken = default)
    {
        if (leftImageUrls.Count == 0 || rightImageUrls.Count == 0) return null;
        var left = await GetFingerprintsAsync(leftImageUrls, cancellationToken);
        var right = await GetFingerprintsAsync(rightImageUrls, cancellationToken);
        return left.Count == 0 || right.Count == 0 ? null : left.SelectMany(a => right.Select(b => Compare(a, b))).Max();
    }

    private async Task<IReadOnlyList<Fingerprint>> GetFingerprintsAsync(IReadOnlyCollection<string> urls, CancellationToken cancellationToken)
    {
        var fingerprints = new List<Fingerprint>();
        foreach (var url in urls.Take(MaximumImagesPerReport))
        {
            var path = GetSafePhysicalPath(url);
            if (path is null || !File.Exists(path)) continue;
            try
            {
                await using var stream = File.OpenRead(path);
                using var image = await Image.LoadAsync<Rgba32>(stream, cancellationToken);
                fingerprints.Add(CreateFingerprint(image));
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

    private static Fingerprint CreateFingerprint(Image<Rgba32> source)
    {
        // Differential hashing compares adjacent luminance values, making it much less sensitive to
        // brightness changes than raw RGB values. ImageSharp performs the resize in memory only.
        using var image = source.Clone(context => context.Resize(HashWidth, HashHeight));
        var structure = new bool[HashHeight * (HashWidth - 1)];
        var colours = new int[ColourBinsPerChannel * ColourBinsPerChannel * ColourBinsPerChannel];
        var hashIndex = 0;

        for (var y = 0; y < HashHeight; y++)
        {
            for (var x = 0; x < HashWidth - 1; x++)
                structure[hashIndex++] = Luminance(image[x, y]) > Luminance(image[x + 1, y]);
        }

        // A compact RGB histogram retains broad colour information regardless of image dimensions.
        for (var y = 0; y < image.Height; y++)
        for (var x = 0; x < image.Width; x++)
        {
            var pixel = image[x, y];
            var red = pixel.R * ColourBinsPerChannel / 256;
            var green = pixel.G * ColourBinsPerChannel / 256;
            var blue = pixel.B * ColourBinsPerChannel / 256;
            colours[(red * ColourBinsPerChannel + green) * ColourBinsPerChannel + blue]++;
        }

        return new Fingerprint(structure, colours, image.Width * image.Height);
    }

    private static decimal Compare(Fingerprint left, Fingerprint right)
    {
        var differentBits = left.Structure.Zip(right.Structure).Count(pair => pair.First != pair.Second);
        var structureSimilarity = 1m - (decimal)differentBits / left.Structure.Length;

        // Histogram intersection is normalised so differently sized source photos remain comparable.
        var overlap = 0d;
        for (var i = 0; i < left.Colours.Length; i++)
            overlap += Math.Min((double)left.Colours[i] / left.PixelCount, (double)right.Colours[i] / right.PixelCount);

        const decimal structureWeight = .70m;
        return Math.Round(Math.Clamp(structureSimilarity * structureWeight + (decimal)overlap * (1m - structureWeight), 0m, 1m), 3);
    }

    private static int Luminance(Rgba32 pixel) => (54 * pixel.R + 183 * pixel.G + 19 * pixel.B) >> 8;

    private sealed record Fingerprint(bool[] Structure, int[] Colours, int PixelCount);
}

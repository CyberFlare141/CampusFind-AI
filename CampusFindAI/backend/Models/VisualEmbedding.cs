namespace CampusFindAI.Api.Models;

/// <summary>A provider vector for one report image. Vector JSON keeps this compatible with SQL Server.</summary>
public sealed class VisualEmbedding
{
    public Guid Id { get; set; }
    public Guid ImageId { get; set; }
    public string Model { get; set; } = string.Empty;
    public string VectorJson { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Image? Image { get; set; }
}

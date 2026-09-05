namespace CampusFindAI.Api.DTOs;

public sealed class ReferenceCategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public sealed class ReferenceBuildingDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public sealed class ReferenceLocationDto
{
    public Guid Id { get; set; }
    public Guid? BuildingId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? BuildingName { get; set; }
    public Guid? FloorId { get; set; }
    public string? FloorName { get; set; }
}

public sealed class ReferenceFloorDto
{
    public Guid Id { get; set; }
    public Guid BuildingId { get; set; }
    public int FloorNumber { get; set; }
    public string Name { get; set; } = string.Empty;
}

using CampusFindAI.Api.Services;

namespace CampusFindAI.Api.Tests;

public sealed class VisualSearchServiceTests
{
    [Fact]
    public void Cosine_ReturnsOneForSameDirection()
    {
        Assert.Equal(1d, VisualSearchService.Cosine([1, 2, 3], [1, 2, 3]), 6);
    }

    [Fact]
    public void Cosine_ReturnsZeroForOrthogonalVectors()
    {
        Assert.Equal(0d, VisualSearchService.Cosine([1, 0], [0, 1]), 6);
    }

    [Fact]
    public void Cosine_RejectsDifferentVectorDimensions()
    {
        Assert.Equal(-1d, VisualSearchService.Cosine([1, 2], [1]));
    }
}

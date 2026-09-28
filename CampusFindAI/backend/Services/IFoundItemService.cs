using CampusFindAI.Api.DTOs;

namespace CampusFindAI.Api.Services;

public interface IFoundItemService
{
    Task<FoundItemDto> CreateAsync(
        string userId,
        CreateFoundItemDto request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FoundItemDto>> GetAllAsync(
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<FoundItemDto>> GetMyItemsAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task<FoundItemDto?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<VerificationQuestionDto>> GetOwnershipVerificationQuestionsAsync(CancellationToken cancellationToken = default);
    Task<FounderVerificationResponseDto> GetFounderVerificationAsync(string userId, Guid id, CancellationToken cancellationToken = default);
    Task<FounderVerificationResponseDto> SaveFounderVerificationAsync(string userId, Guid id, SaveFounderVerificationAnswersDto request, CancellationToken cancellationToken = default);

    Task<FoundItemDto> UpdateAsync(string userId, Guid id, UpdateFoundItemDto request, CancellationToken cancellationToken = default);
    Task<FoundItemDto> ArchiveAsync(string userId, Guid id, CancellationToken cancellationToken = default);
    Task<FoundItemDto> ReopenAsync(string userId, Guid id, CancellationToken cancellationToken = default);
    Task DeleteAsync(string userId, Guid id, CancellationToken cancellationToken = default);
}

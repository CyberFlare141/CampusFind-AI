using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.Data.SqlClient;

namespace CampusFindAI.Api.Repositories;

public sealed class ImageRepository(ISqlConnectionFactory connectionFactory) : IImageRepository
{
    public async Task AddRangeAsync(IReadOnlyCollection<Image> images, CancellationToken cancellationToken = default)
    {
        if (images.Count == 0) return;
        const string sql = "INSERT INTO Images (Id, LostItemId, FoundItemId, Url) VALUES (@Id, @LostItemId, @FoundItemId, @Url);";
        await using var connection = connectionFactory.CreateConnection(); await connection.OpenAsync(cancellationToken);
        await using var transaction = (SqlTransaction)await connection.BeginTransactionAsync(cancellationToken);
        try { foreach (var image in images) { await using var command = new SqlCommand(sql, connection, transaction); command.Parameters.AddWithValue("@Id", image.Id); command.Parameters.AddWithValue("@LostItemId", (object?)image.LostItemId ?? DBNull.Value); command.Parameters.AddWithValue("@FoundItemId", (object?)image.FoundItemId ?? DBNull.Value); command.Parameters.AddWithValue("@Url", image.Url); await command.ExecuteNonQueryAsync(cancellationToken); } await transaction.CommitAsync(cancellationToken); }
        catch { await transaction.RollbackAsync(cancellationToken); throw; }
    }
    public Task<IReadOnlyList<Image>> GetByLostItemIdsAsync(IReadOnlyCollection<Guid> itemIds, CancellationToken cancellationToken = default) => GetByItemIdsAsync("LostItemId", itemIds, cancellationToken);
    public Task<IReadOnlyList<Image>> GetByFoundItemIdsAsync(IReadOnlyCollection<Guid> itemIds, CancellationToken cancellationToken = default) => GetByItemIdsAsync("FoundItemId", itemIds, cancellationToken);
    private async Task<IReadOnlyList<Image>> GetByItemIdsAsync(string column, IReadOnlyCollection<Guid> itemIds, CancellationToken cancellationToken)
    {
        if (itemIds.Count == 0) return [];
        var ids = itemIds.ToArray(); var names = ids.Select((_, i) => $"@id{i}").ToArray(); var sql = $"SELECT Id, LostItemId, FoundItemId, Url FROM Images WHERE {column} IN ({string.Join(", ", names)});"; var result = new List<Image>();
        await using var connection = connectionFactory.CreateConnection(); await connection.OpenAsync(cancellationToken); await using var command = new SqlCommand(sql, connection);
        for (var i = 0; i < ids.Length; i++) command.Parameters.AddWithValue(names[i], ids[i]);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken)) result.Add(new Image { Id = reader.GetGuid("Id"), LostItemId = reader.GetNullableGuid("LostItemId"), FoundItemId = reader.GetNullableGuid("FoundItemId"), Url = reader.GetRequiredString("Url") });
        return result;
    }
}

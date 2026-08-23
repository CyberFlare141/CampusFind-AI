using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.Data.SqlClient;

namespace CampusFindAI.Api.Repositories;

public class LostItemRepository(ISqlConnectionFactory connectionFactory)
    : ILostItemRepository
{
    public async Task AddAsync(
        LostItem item,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO LostItems (
                Id,
                UserId,
                CategoryId,
                LocationId,
                Title,
                Description,
                LostAt,
                Status,
                CreatedAt
            )
            VALUES (
                @Id,
                @UserId,
                @CategoryId,
                @LocationId,
                @Title,
                @Description,
                @LostAt,
                @Status,
                @CreatedAt
            );
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", item.Id);
        command.Parameters.AddWithValue("@UserId", item.UserId);
        command.Parameters.AddWithValue("@CategoryId", (object?)item.CategoryId ?? DBNull.Value);
        command.Parameters.AddWithValue("@LocationId", (object?)item.LocationId ?? DBNull.Value);
        command.Parameters.AddWithValue("@Title", item.Title);
        command.Parameters.AddWithValue("@Description", (object?)item.Description ?? DBNull.Value);
        command.Parameters.AddWithValue("@LostAt", (object?)item.LostAt ?? DBNull.Value);
        command.Parameters.AddWithValue("@Status", item.Status);
        command.Parameters.AddWithValue("@CreatedAt", item.CreatedAt);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<LostItem?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT Id, UserId, CategoryId, LocationId, Title, Description, LostAt, Status, CreatedAt
            FROM LostItems
            WHERE Id = @Id;
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", id);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Map(reader) : null;
    }

    public async Task<IReadOnlyList<LostItem>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT Id, UserId, CategoryId, LocationId, Title, Description, LostAt, Status, CreatedAt
            FROM LostItems
            ORDER BY CreatedAt DESC;
            """;

        return await QueryManyAsync(sql, null, cancellationToken);
    }

    public async Task<IReadOnlyList<LostItem>> GetByUserIdAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT Id, UserId, CategoryId, LocationId, Title, Description, LostAt, Status, CreatedAt
            FROM LostItems
            WHERE UserId = @UserId
            ORDER BY CreatedAt DESC;
            """;

        return await QueryManyAsync(
            sql,
            command => command.Parameters.AddWithValue("@UserId", userId),
            cancellationToken);
    }

    public Task SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }

    private async Task<IReadOnlyList<LostItem>> QueryManyAsync(
        string sql,
        Action<SqlCommand>? configure,
        CancellationToken cancellationToken)
    {
        var items = new List<LostItem>();

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        configure?.Invoke(command);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(Map(reader));
        }

        return items;
    }

    private static LostItem Map(SqlDataReader reader)
    {
        return new LostItem
        {
            Id = reader.GetGuid("Id"),
            UserId = reader.GetRequiredString("UserId"),
            CategoryId = reader.GetNullableGuid("CategoryId"),
            LocationId = reader.GetNullableGuid("LocationId"),
            Title = reader.GetRequiredString("Title"),
            Description = reader.GetNullableString("Description"),
            LostAt = reader.GetNullableDateTime("LostAt"),
            Status = reader.GetRequiredString("Status"),
            CreatedAt = reader.GetDateTime("CreatedAt")
        };
    }
}

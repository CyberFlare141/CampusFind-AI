using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.Data.SqlClient;

namespace CampusFindAI.Api.Repositories;

public class FoundItemRepository(ISqlConnectionFactory connectionFactory)
    : IFoundItemRepository
{
    public async Task AddAsync(
        FoundItem item,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO FoundItems (
                Id,
                UserId,
                CategoryId,
                LocationId,
                Title,
                Description,
                FoundAt,
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
                @FoundAt,
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
        command.Parameters.AddWithValue("@FoundAt", (object?)item.FoundAt ?? DBNull.Value);
        command.Parameters.AddWithValue("@Status", item.Status);
        command.Parameters.AddWithValue("@CreatedAt", item.CreatedAt);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<FoundItem?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT Id, UserId, CategoryId, LocationId, Title, Description, FoundAt, Status, CreatedAt
            FROM FoundItems
            WHERE Id = @Id;
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", id);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Map(reader) : null;
    }

    public async Task<IReadOnlyList<FoundItem>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT Id, UserId, CategoryId, LocationId, Title, Description, FoundAt, Status, CreatedAt
            FROM FoundItems
            ORDER BY CreatedAt DESC;
            """;

        return await QueryManyAsync(sql, null, cancellationToken);
    }

    public async Task<IReadOnlyList<FoundItem>> GetByUserIdAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT Id, UserId, CategoryId, LocationId, Title, Description, FoundAt, Status, CreatedAt
            FROM FoundItems
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

    public async Task UpdateStatusAsync(Guid id, string status, CancellationToken cancellationToken = default)
    {
        const string sql = "UPDATE FoundItems SET Status = @Status WHERE Id = @Id;";
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", id);
        command.Parameters.AddWithValue("@Status", status);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<FoundItem>> QueryManyAsync(
        string sql,
        Action<SqlCommand>? configure,
        CancellationToken cancellationToken)
    {
        var items = new List<FoundItem>();

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

    private static FoundItem Map(SqlDataReader reader)
    {
        return new FoundItem
        {
            Id = reader.GetGuid("Id"),
            UserId = reader.GetRequiredString("UserId"),
            CategoryId = reader.GetNullableGuid("CategoryId"),
            LocationId = reader.GetNullableGuid("LocationId"),
            Title = reader.GetRequiredString("Title"),
            Description = reader.GetNullableString("Description"),
            FoundAt = reader.GetNullableDateTime("FoundAt"),
            Status = reader.GetRequiredString("Status"),
            CreatedAt = reader.GetDateTime("CreatedAt")
        };
    }
}

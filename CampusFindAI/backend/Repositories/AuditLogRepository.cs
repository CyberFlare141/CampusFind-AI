using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.Data.SqlClient;

namespace CampusFindAI.Api.Repositories;

public class AuditLogRepository(ISqlConnectionFactory connectionFactory) : IAuditLogRepository
{
    public async Task AddAsync(
        AuditLog log,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO AuditLogs (Id, UserId, Action, Details, CreatedAt)
            VALUES (@Id, @UserId, @Action, @Details, @CreatedAt);
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", log.Id);
        command.Parameters.AddWithValue("@UserId", (object?)log.UserId ?? DBNull.Value);
        command.Parameters.AddWithValue("@Action", log.Action);
        command.Parameters.AddWithValue("@Details", (object?)log.Details ?? DBNull.Value);
        command.Parameters.AddWithValue("@CreatedAt", log.CreatedAt);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AuditLog>> GetByUserAndActionAsync(
        string userId,
        string? action,
        int take,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT TOP (@Take) Id, UserId, Action, Details, CreatedAt
            FROM AuditLogs
            WHERE UserId = @UserId
              AND (@Action IS NULL OR Action = @Action)
            ORDER BY CreatedAt DESC;
            """;

        var logs = new List<AuditLog>();

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Take", take);
        command.Parameters.AddWithValue("@UserId", userId);
        command.Parameters.AddWithValue("@Action", (object?)action ?? DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            logs.Add(Map(reader));
        }

        return logs;
    }

    public async Task<AuditLog?> GetByIdForUserAsync(
        string userId,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT TOP (1) Id, UserId, Action, Details, CreatedAt
            FROM AuditLogs
            WHERE Id = @Id
              AND UserId = @UserId;
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", id);
        command.Parameters.AddWithValue("@UserId", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Map(reader) : null;
    }

    public Task SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }

    private static AuditLog Map(SqlDataReader reader)
    {
        return new AuditLog
        {
            Id = reader.GetGuid("Id"),
            UserId = reader.GetNullableString("UserId"),
            Action = reader.GetRequiredString("Action"),
            Details = reader.GetNullableString("Details"),
            CreatedAt = reader.GetDateTime("CreatedAt")
        };
    }
}

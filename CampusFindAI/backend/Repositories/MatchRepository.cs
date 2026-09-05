using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.Data.SqlClient;

namespace CampusFindAI.Api.Repositories;

public class MatchRepository(ISqlConnectionFactory connectionFactory) : IMatchRepository
{
    public async Task<IReadOnlyList<Match>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                m.Id,
                m.LostItemId,
                m.FoundItemId,
                m.ConfidenceScore,
                li.Title AS LostItemTitle,
                li.UserId AS LostItemUserId,
                fi.Title AS FoundItemTitle,
                fi.UserId AS FoundItemUserId
            FROM Matches m
            INNER JOIN LostItems li ON li.Id = m.LostItemId
            INNER JOIN FoundItems fi ON fi.Id = m.FoundItemId
            ORDER BY m.ConfidenceScore DESC;
            """;

        var matches = new List<Match>();

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            matches.Add(new Match
            {
                Id = reader.GetGuid("Id"),
                LostItemId = reader.GetGuid("LostItemId"),
                FoundItemId = reader.GetGuid("FoundItemId"),
                ConfidenceScore = reader.GetDecimal("ConfidenceScore"),
                LostItem = new LostItem
                {
                    Id = reader.GetGuid("LostItemId"),
                    Title = reader.GetRequiredString("LostItemTitle"),
                    UserId = reader.GetRequiredString("LostItemUserId")
                },
                FoundItem = new FoundItem
                {
                    Id = reader.GetGuid("FoundItemId"),
                    Title = reader.GetRequiredString("FoundItemTitle"),
                    UserId = reader.GetRequiredString("FoundItemUserId")
                }
            });
        }

        return matches;
    }

    public async Task<IReadOnlyList<Match>> GetByFoundItemIdAsync(Guid foundItemId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT m.Id, m.LostItemId, m.FoundItemId, m.ConfidenceScore,
                   li.Title AS LostItemTitle, li.UserId AS LostItemUserId, li.Status AS LostItemStatus,
                   fi.Title AS FoundItemTitle, fi.UserId AS FoundItemUserId
            FROM Matches m
            INNER JOIN LostItems li ON li.Id = m.LostItemId
            INNER JOIN FoundItems fi ON fi.Id = m.FoundItemId
            WHERE m.FoundItemId = @FoundItemId;
            """;

        var matches = new List<Match>();
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@FoundItemId", foundItemId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            matches.Add(new Match
            {
                Id = reader.GetGuid("Id"), LostItemId = reader.GetGuid("LostItemId"), FoundItemId = reader.GetGuid("FoundItemId"), ConfidenceScore = reader.GetDecimal("ConfidenceScore"),
                LostItem = new LostItem { Id = reader.GetGuid("LostItemId"), Title = reader.GetRequiredString("LostItemTitle"), UserId = reader.GetRequiredString("LostItemUserId"), Status = reader.GetRequiredString("LostItemStatus") },
                FoundItem = new FoundItem { Id = reader.GetGuid("FoundItemId"), Title = reader.GetRequiredString("FoundItemTitle"), UserId = reader.GetRequiredString("FoundItemUserId") }
            });
        }
        return matches;
    }

    public async Task<bool> ExistsAsync(
        Guid lostItemId,
        Guid foundItemId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT CASE
                WHEN EXISTS (
                    SELECT 1
                    FROM Matches
                    WHERE LostItemId = @LostItemId
                      AND FoundItemId = @FoundItemId
                )
                THEN CAST(1 AS bit)
                ELSE CAST(0 AS bit)
            END;
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@LostItemId", lostItemId);
        command.Parameters.AddWithValue("@FoundItemId", foundItemId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is bool exists && exists;
    }

    public async Task<IReadOnlyList<Match>> GetByLostItemUserIdAsync(string userId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT m.Id, m.LostItemId, m.FoundItemId, m.ConfidenceScore,
                   li.Title AS LostItemTitle, li.UserId AS LostItemUserId, li.Status AS LostItemStatus,
                   li.CategoryId AS LostCategoryId, li.LocationId AS LostLocationId, li.LocationDetails AS LostLocationDetails,
                   fi.Title AS FoundItemTitle, fi.UserId AS FoundItemUserId, fi.Status AS FoundItemStatus,
                   fi.CategoryId AS FoundCategoryId, fi.LocationId AS FoundLocationId, fi.LocationDetails AS FoundLocationDetails
            FROM Matches m INNER JOIN LostItems li ON li.Id = m.LostItemId
            INNER JOIN FoundItems fi ON fi.Id = m.FoundItemId
            WHERE li.UserId = @UserId AND li.Status = 'Open' AND fi.Status = 'Available'
            ORDER BY m.ConfidenceScore DESC;
            """;
        var matches = new List<Match>();
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@UserId", userId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            matches.Add(new Match
            {
                Id = reader.GetGuid("Id"), LostItemId = reader.GetGuid("LostItemId"), FoundItemId = reader.GetGuid("FoundItemId"), ConfidenceScore = reader.GetDecimal("ConfidenceScore"),
                LostItem = new LostItem { Id = reader.GetGuid("LostItemId"), UserId = reader.GetRequiredString("LostItemUserId"), Title = reader.GetRequiredString("LostItemTitle"), Status = reader.GetRequiredString("LostItemStatus"), CategoryId = reader.GetNullableGuid("LostCategoryId"), LocationId = reader.GetNullableGuid("LostLocationId"), LocationDetails = reader.GetNullableString("LostLocationDetails") },
                FoundItem = new FoundItem { Id = reader.GetGuid("FoundItemId"), UserId = reader.GetRequiredString("FoundItemUserId"), Title = reader.GetRequiredString("FoundItemTitle"), Status = reader.GetRequiredString("FoundItemStatus"), CategoryId = reader.GetNullableGuid("FoundCategoryId"), LocationId = reader.GetNullableGuid("FoundLocationId"), LocationDetails = reader.GetNullableString("FoundLocationDetails") }
            });
        }
        return matches;
    }

    public async Task AddAsync(
        Match match,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO Matches (Id, LostItemId, FoundItemId, ConfidenceScore)
            VALUES (@Id, @LostItemId, @FoundItemId, @ConfidenceScore);
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", match.Id);
        command.Parameters.AddWithValue("@LostItemId", match.LostItemId);
        command.Parameters.AddWithValue("@FoundItemId", match.FoundItemId);
        command.Parameters.AddWithValue("@ConfidenceScore", match.ConfidenceScore);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public Task SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}

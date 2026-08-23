using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.Data.SqlClient;

namespace CampusFindAI.Api.Repositories;

public class ClaimRepository(ISqlConnectionFactory connectionFactory) : IClaimRepository
{
    public async Task AddAsync(
        Claim claim,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO Claims (
                Id,
                FoundItemId,
                ClaimantUserId,
                ClaimantNotes,
                Status,
                CreatedAt,
                ReviewedByUserId,
                ReviewedAt,
                DecisionNotes
            )
            VALUES (
                @Id,
                @FoundItemId,
                @ClaimantUserId,
                @ClaimantNotes,
                @Status,
                @CreatedAt,
                @ReviewedByUserId,
                @ReviewedAt,
                @DecisionNotes
            );
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", claim.Id);
        command.Parameters.AddWithValue("@FoundItemId", claim.FoundItemId);
        command.Parameters.AddWithValue("@ClaimantUserId", claim.ClaimantUserId);
        command.Parameters.AddWithValue("@ClaimantNotes", (object?)claim.ClaimantNotes ?? DBNull.Value);
        command.Parameters.AddWithValue("@Status", claim.Status);
        command.Parameters.AddWithValue("@CreatedAt", claim.CreatedAt);
        command.Parameters.AddWithValue("@ReviewedByUserId", (object?)claim.ReviewedByUserId ?? DBNull.Value);
        command.Parameters.AddWithValue("@ReviewedAt", (object?)claim.ReviewedAt ?? DBNull.Value);
        command.Parameters.AddWithValue("@DecisionNotes", (object?)claim.DecisionNotes ?? DBNull.Value);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<Claim?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var sql = BaseSelect + """

            WHERE c.Id = @Id;
            """;

        var claims = await QueryAsync(
            sql,
            command => command.Parameters.AddWithValue("@Id", id),
            cancellationToken);

        return claims.SingleOrDefault();
    }

    public Task<IReadOnlyList<Claim>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        var sql = BaseSelect + """

            ORDER BY c.CreatedAt DESC;
            """;

        return QueryAsync(sql, null, cancellationToken);
    }

    public Task<IReadOnlyList<Claim>> GetByStatusAsync(
        string status,
        CancellationToken cancellationToken = default)
    {
        var sql = BaseSelect + """

            WHERE c.Status = @Status
            ORDER BY c.CreatedAt ASC;
            """;

        return QueryAsync(
            sql,
            command => command.Parameters.AddWithValue("@Status", status),
            cancellationToken);
    }

    public Task<IReadOnlyList<Claim>> GetByClaimantIdAsync(
        string claimantUserId,
        CancellationToken cancellationToken = default)
    {
        var sql = BaseSelect + """

            WHERE c.ClaimantUserId = @ClaimantUserId
            ORDER BY c.CreatedAt DESC;
            """;

        return QueryAsync(
            sql,
            command => command.Parameters.AddWithValue("@ClaimantUserId", claimantUserId),
            cancellationToken);
    }

    public void Update(Claim claim)
    {
        const string sql = """
            UPDATE Claims
            SET Status = @Status,
                ReviewedByUserId = @ReviewedByUserId,
                ReviewedAt = @ReviewedAt,
                DecisionNotes = @DecisionNotes,
                ClaimantNotes = @ClaimantNotes
            WHERE Id = @Id;
            """;

        using var connection = connectionFactory.CreateConnection();
        connection.Open();

        using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", claim.Id);
        command.Parameters.AddWithValue("@Status", claim.Status);
        command.Parameters.AddWithValue("@ReviewedByUserId", (object?)claim.ReviewedByUserId ?? DBNull.Value);
        command.Parameters.AddWithValue("@ReviewedAt", (object?)claim.ReviewedAt ?? DBNull.Value);
        command.Parameters.AddWithValue("@DecisionNotes", (object?)claim.DecisionNotes ?? DBNull.Value);
        command.Parameters.AddWithValue("@ClaimantNotes", (object?)claim.ClaimantNotes ?? DBNull.Value);

        command.ExecuteNonQuery();
    }

    public Task SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }

    private async Task<IReadOnlyList<Claim>> QueryAsync(
        string sql,
        Action<SqlCommand>? configure,
        CancellationToken cancellationToken)
    {
        var claims = new List<Claim>();

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        configure?.Invoke(command);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            claims.Add(Map(reader));
        }

        return claims;
    }

    private static Claim Map(SqlDataReader reader)
    {
        return new Claim
        {
            Id = reader.GetGuid("ClaimId"),
            FoundItemId = reader.GetGuid("FoundItemId"),
            ClaimantUserId = reader.GetRequiredString("ClaimantUserId"),
            ClaimantNotes = reader.GetNullableString("ClaimantNotes"),
            Status = reader.GetRequiredString("Status"),
            CreatedAt = reader.GetDateTime("CreatedAt"),
            ReviewedByUserId = reader.GetNullableString("ReviewedByUserId"),
            ReviewedAt = reader.GetNullableDateTime("ReviewedAt"),
            DecisionNotes = reader.GetNullableString("DecisionNotes"),
            FoundItem = new FoundItem
            {
                Id = reader.GetGuid("FoundItemId"),
                Title = reader.GetRequiredString("FoundItemTitle"),
                Description = reader.GetNullableString("FoundItemDescription")
            },
            ClaimantUser = new ApplicationUser
            {
                Id = reader.GetRequiredString("ClaimantUserId"),
                Email = reader.GetNullableString("ClaimantEmail")
            },
            ReviewedByUser = reader.GetNullableString("ReviewedByUserId") is null
                ? null
                : new ApplicationUser
                {
                    Id = reader.GetRequiredString("ReviewedByUserId"),
                    Email = reader.GetNullableString("ReviewedByEmail")
                }
        };
    }

    private const string BaseSelect = """
        SELECT
            c.Id AS ClaimId,
            c.FoundItemId,
            c.ClaimantUserId,
            c.ClaimantNotes,
            c.Status,
            c.CreatedAt,
            c.ReviewedByUserId,
            c.ReviewedAt,
            c.DecisionNotes,
            fi.Title AS FoundItemTitle,
            fi.Description AS FoundItemDescription,
            cu.Email AS ClaimantEmail,
            ru.Email AS ReviewedByEmail
        FROM Claims c
        INNER JOIN FoundItems fi ON fi.Id = c.FoundItemId
        INNER JOIN AspNetUsers cu ON cu.Id = c.ClaimantUserId
        LEFT JOIN AspNetUsers ru ON ru.Id = c.ReviewedByUserId
        """;
}

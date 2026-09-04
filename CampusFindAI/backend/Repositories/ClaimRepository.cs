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
            DecisionNotes,
            HandedOverByUserId,
            HandedOverAt,
            HandoverNotes
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
            @DecisionNotes,
            @HandedOverByUserId,
            @HandedOverAt,
            @HandoverNotes
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
        command.Parameters.AddWithValue("@HandedOverByUserId", (object?)claim.HandedOverByUserId ?? DBNull.Value);
        command.Parameters.AddWithValue("@HandedOverAt", (object?)claim.HandedOverAt ?? DBNull.Value);
        command.Parameters.AddWithValue("@HandoverNotes", (object?)claim.HandoverNotes ?? DBNull.Value);

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

    public async Task<Claim?> GetReviewByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var sql = ReviewSelect + """

            WHERE c.Id = @Id;
            """;
        var claims = await QueryReviewAsync(sql, command => command.Parameters.AddWithValue("@Id", id), cancellationToken);
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

    public Task<IReadOnlyList<Claim>> GetByFoundItemIdAsync(Guid foundItemId, CancellationToken cancellationToken = default)
    {
        var sql = BaseSelect + """

            WHERE c.FoundItemId = @FoundItemId
            ORDER BY c.CreatedAt DESC;
            """;
        return QueryAsync(sql, command => command.Parameters.AddWithValue("@FoundItemId", foundItemId), cancellationToken);
    }

    public void Update(Claim claim)
    {
        const string sql = """
            UPDATE Claims
            SET Status = @Status,
                ReviewedByUserId = @ReviewedByUserId,
                ReviewedAt = @ReviewedAt,
                DecisionNotes = @DecisionNotes,
                ClaimantNotes = @ClaimantNotes,
                HandedOverByUserId = @HandedOverByUserId,
                HandedOverAt = @HandedOverAt,
                HandoverNotes = @HandoverNotes
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
        command.Parameters.AddWithValue("@HandedOverByUserId", (object?)claim.HandedOverByUserId ?? DBNull.Value);
        command.Parameters.AddWithValue("@HandedOverAt", (object?)claim.HandedOverAt ?? DBNull.Value);
        command.Parameters.AddWithValue("@HandoverNotes", (object?)claim.HandoverNotes ?? DBNull.Value);

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

    private async Task<IReadOnlyList<Claim>> QueryReviewAsync(string sql, Action<SqlCommand>? configure, CancellationToken cancellationToken)
    {
        var claims = new List<Claim>();
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);
        configure?.Invoke(command);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken)) claims.Add(MapReview(reader));
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
            HandedOverByUserId = reader.GetNullableString("HandedOverByUserId"),
            HandedOverAt = reader.GetNullableDateTime("HandedOverAt"),
            HandoverNotes = reader.GetNullableString("HandoverNotes"),
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

    private static Claim MapReview(SqlDataReader reader)
    {
        var claim = Map(reader);
        claim.ClaimantUser!.UserProfile = new UserProfile
        {
            UserId = claim.ClaimantUserId,
            FullName = reader.GetNullableString("ClaimantFullName"),
            Department = reader.GetNullableString("ClaimantDepartment"),
            JobTitle = reader.GetNullableString("ClaimantJobTitle"),
            Semester = reader.GetNullableString("ClaimantSemester"),
            StudentId = reader.GetNullableString("ClaimantStudentId"),
            Phone = reader.GetNullableString("ClaimantPhone")
        };
        claim.FoundItem = new FoundItem
        {
            Id = claim.FoundItemId,
            UserId = reader.GetRequiredString("ReporterUserId"),
            Title = reader.GetRequiredString("FoundItemTitle"),
            Description = reader.GetNullableString("FoundItemDescription"),
            FoundAt = reader.GetNullableDateTime("FoundAt"),
            User = new ApplicationUser
            {
                Id = reader.GetRequiredString("ReporterUserId"),
                Email = reader.GetNullableString("ReporterEmail"),
                UserProfile = new UserProfile
                {
                    UserId = reader.GetRequiredString("ReporterUserId"),
                    FullName = reader.GetNullableString("ReporterFullName"),
                    Department = reader.GetNullableString("ReporterDepartment"),
                    JobTitle = reader.GetNullableString("ReporterJobTitle"),
                    Semester = reader.GetNullableString("ReporterSemester"),
                    StudentId = reader.GetNullableString("ReporterStudentId"),
                    Phone = reader.GetNullableString("ReporterPhone")
                }
            }
        };
        return claim;
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
            c.HandedOverByUserId,
            c.HandedOverAt,
            c.HandoverNotes,
            fi.Title AS FoundItemTitle,
            fi.Description AS FoundItemDescription,
            cu.Email AS ClaimantEmail,
            ru.Email AS ReviewedByEmail
        FROM Claims c
        INNER JOIN FoundItems fi ON fi.Id = c.FoundItemId
        INNER JOIN AspNetUsers cu ON cu.Id = c.ClaimantUserId
        LEFT JOIN AspNetUsers ru ON ru.Id = c.ReviewedByUserId
        """;

    private const string ReviewSelect = """
        SELECT
            c.Id AS ClaimId, c.FoundItemId, c.ClaimantUserId, c.ClaimantNotes, c.Status, c.CreatedAt,
            c.ReviewedByUserId, c.ReviewedAt, c.DecisionNotes, c.HandedOverByUserId, c.HandedOverAt, c.HandoverNotes,
            fi.Title AS FoundItemTitle, fi.Description AS FoundItemDescription, fi.UserId AS ReporterUserId, fi.FoundAt,
            cu.Email AS ClaimantEmail, ru.Email AS ReviewedByEmail,
            cup.FullName AS ClaimantFullName, cup.Department AS ClaimantDepartment, cup.JobTitle AS ClaimantJobTitle,
            cup.Semester AS ClaimantSemester, cup.StudentId AS ClaimantStudentId, cup.Phone AS ClaimantPhone,
            fu.Email AS ReporterEmail, fup.FullName AS ReporterFullName, fup.Department AS ReporterDepartment,
            fup.JobTitle AS ReporterJobTitle, fup.Semester AS ReporterSemester, fup.StudentId AS ReporterStudentId,
            fup.Phone AS ReporterPhone
        FROM Claims c
        INNER JOIN FoundItems fi ON fi.Id = c.FoundItemId
        INNER JOIN AspNetUsers cu ON cu.Id = c.ClaimantUserId
        INNER JOIN AspNetUsers fu ON fu.Id = fi.UserId
        LEFT JOIN AspNetUsers ru ON ru.Id = c.ReviewedByUserId
        LEFT JOIN UserProfiles cup ON cup.UserId = c.ClaimantUserId
        LEFT JOIN UserProfiles fup ON fup.UserId = fi.UserId
        """;
}

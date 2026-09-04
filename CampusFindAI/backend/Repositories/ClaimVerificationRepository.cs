using System.Data;
using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.Data.SqlClient;

namespace CampusFindAI.Api.Repositories;

public class ClaimVerificationRepository(ISqlConnectionFactory connectionFactory) : IClaimVerificationRepository
{
    private static bool _tableEnsured;
    private static readonly SemaphoreSlim _lock = new(1, 1);

    public async Task EnsureTableCreatedAsync(CancellationToken cancellationToken = default)
    {
        if (_tableEnsured) return;

        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (_tableEnsured) return;

            const string ddl = """
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ClaimVerifications')
                BEGIN
                    CREATE TABLE ClaimVerifications (
                        Id UNIQUEIDENTIFIER PRIMARY KEY,
                        ClaimId UNIQUEIDENTIFIER NOT NULL,
                        SecureQuestionsPayload NVARCHAR(MAX) NOT NULL,
                        PublicQuestionsJson NVARCHAR(MAX) NOT NULL,
                        SubmittedAnswersJson NVARCHAR(MAX) NULL,
                        EvaluationResultJson NVARCHAR(MAX) NULL,
                        ConfidenceScore DECIMAL(5,2) NULL,
                        MatchedCount INT NULL,
                        TotalQuestions INT NOT NULL DEFAULT 3,
                        Passed BIT NULL,
                        Status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
                        AttemptCount INT NOT NULL DEFAULT 0,
                        MaxAttempts INT NOT NULL DEFAULT 2,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        SubmittedAt DATETIME2 NULL,
                        CONSTRAINT FK_ClaimVerifications_Claims FOREIGN KEY (ClaimId) REFERENCES Claims(Id) ON DELETE CASCADE
                    );
                    CREATE UNIQUE INDEX IX_ClaimVerifications_ClaimId ON ClaimVerifications(ClaimId);
                END
                """;

            await using var connection = connectionFactory.CreateConnection();
            await connection.OpenAsync(cancellationToken);
            await using var command = new SqlCommand(ddl, connection);
            await command.ExecuteNonQueryAsync(cancellationToken);

            _tableEnsured = true;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<ClaimVerification?> GetByClaimIdAsync(Guid claimId, CancellationToken cancellationToken = default)
    {
        await EnsureTableCreatedAsync(cancellationToken);

        const string sql = """
            SELECT
                Id, ClaimId, SecureQuestionsPayload, PublicQuestionsJson,
                SubmittedAnswersJson, EvaluationResultJson, ConfidenceScore,
                MatchedCount, TotalQuestions, Passed, Status,
                AttemptCount, MaxAttempts, CreatedAt, SubmittedAt
            FROM ClaimVerifications
            WHERE ClaimId = @ClaimId;
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@ClaimId", claimId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return Map(reader);
    }

    public async Task AddAsync(ClaimVerification verification, CancellationToken cancellationToken = default)
    {
        await EnsureTableCreatedAsync(cancellationToken);

        const string sql = """
            INSERT INTO ClaimVerifications (
                Id, ClaimId, SecureQuestionsPayload, PublicQuestionsJson,
                SubmittedAnswersJson, EvaluationResultJson, ConfidenceScore,
                MatchedCount, TotalQuestions, Passed, Status,
                AttemptCount, MaxAttempts, CreatedAt, SubmittedAt
            )
            VALUES (
                @Id, @ClaimId, @SecureQuestionsPayload, @PublicQuestionsJson,
                @SubmittedAnswersJson, @EvaluationResultJson, @ConfidenceScore,
                @MatchedCount, @TotalQuestions, @Passed, @Status,
                @AttemptCount, @MaxAttempts, @CreatedAt, @SubmittedAt
            );
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);

        command.Parameters.AddWithValue("@Id", verification.Id);
        command.Parameters.AddWithValue("@ClaimId", verification.ClaimId);
        command.Parameters.AddWithValue("@SecureQuestionsPayload", verification.SecureQuestionsPayload);
        command.Parameters.AddWithValue("@PublicQuestionsJson", verification.PublicQuestionsJson);
        command.Parameters.AddWithValue("@SubmittedAnswersJson", (object?)verification.SubmittedAnswersJson ?? DBNull.Value);
        command.Parameters.AddWithValue("@EvaluationResultJson", (object?)verification.EvaluationResultJson ?? DBNull.Value);
        command.Parameters.AddWithValue("@ConfidenceScore", (object?)verification.ConfidenceScore ?? DBNull.Value);
        command.Parameters.AddWithValue("@MatchedCount", (object?)verification.MatchedCount ?? DBNull.Value);
        command.Parameters.AddWithValue("@TotalQuestions", verification.TotalQuestions);
        command.Parameters.AddWithValue("@Passed", (object?)verification.Passed ?? DBNull.Value);
        command.Parameters.AddWithValue("@Status", verification.Status);
        command.Parameters.AddWithValue("@AttemptCount", verification.AttemptCount);
        command.Parameters.AddWithValue("@MaxAttempts", verification.MaxAttempts);
        command.Parameters.AddWithValue("@CreatedAt", verification.CreatedAt);
        command.Parameters.AddWithValue("@SubmittedAt", (object?)verification.SubmittedAt ?? DBNull.Value);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task UpdateAsync(ClaimVerification verification, CancellationToken cancellationToken = default)
    {
        await EnsureTableCreatedAsync(cancellationToken);

        const string sql = """
            UPDATE ClaimVerifications
            SET SecureQuestionsPayload = @SecureQuestionsPayload,
                PublicQuestionsJson = @PublicQuestionsJson,
                SubmittedAnswersJson = @SubmittedAnswersJson,
                EvaluationResultJson = @EvaluationResultJson,
                ConfidenceScore = @ConfidenceScore,
                MatchedCount = @MatchedCount,
                TotalQuestions = @TotalQuestions,
                Passed = @Passed,
                Status = @Status,
                AttemptCount = @AttemptCount,
                MaxAttempts = @MaxAttempts,
                SubmittedAt = @SubmittedAt
            WHERE Id = @Id;
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);

        command.Parameters.AddWithValue("@Id", verification.Id);
        command.Parameters.AddWithValue("@SecureQuestionsPayload", verification.SecureQuestionsPayload);
        command.Parameters.AddWithValue("@PublicQuestionsJson", verification.PublicQuestionsJson);
        command.Parameters.AddWithValue("@SubmittedAnswersJson", (object?)verification.SubmittedAnswersJson ?? DBNull.Value);
        command.Parameters.AddWithValue("@EvaluationResultJson", (object?)verification.EvaluationResultJson ?? DBNull.Value);
        command.Parameters.AddWithValue("@ConfidenceScore", (object?)verification.ConfidenceScore ?? DBNull.Value);
        command.Parameters.AddWithValue("@MatchedCount", (object?)verification.MatchedCount ?? DBNull.Value);
        command.Parameters.AddWithValue("@TotalQuestions", verification.TotalQuestions);
        command.Parameters.AddWithValue("@Passed", (object?)verification.Passed ?? DBNull.Value);
        command.Parameters.AddWithValue("@Status", verification.Status);
        command.Parameters.AddWithValue("@AttemptCount", verification.AttemptCount);
        command.Parameters.AddWithValue("@MaxAttempts", verification.MaxAttempts);
        command.Parameters.AddWithValue("@SubmittedAt", (object?)verification.SubmittedAt ?? DBNull.Value);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static ClaimVerification Map(SqlDataReader reader)
    {
        return new ClaimVerification
        {
            Id = reader.GetGuid(reader.GetOrdinal("Id")),
            ClaimId = reader.GetGuid(reader.GetOrdinal("ClaimId")),
            SecureQuestionsPayload = reader.GetString(reader.GetOrdinal("SecureQuestionsPayload")),
            PublicQuestionsJson = reader.GetString(reader.GetOrdinal("PublicQuestionsJson")),
            SubmittedAnswersJson = reader.IsDBNull(reader.GetOrdinal("SubmittedAnswersJson")) ? null : reader.GetString(reader.GetOrdinal("SubmittedAnswersJson")),
            EvaluationResultJson = reader.IsDBNull(reader.GetOrdinal("EvaluationResultJson")) ? null : reader.GetString(reader.GetOrdinal("EvaluationResultJson")),
            ConfidenceScore = reader.IsDBNull(reader.GetOrdinal("ConfidenceScore")) ? null : reader.GetDecimal(reader.GetOrdinal("ConfidenceScore")),
            MatchedCount = reader.IsDBNull(reader.GetOrdinal("MatchedCount")) ? null : reader.GetInt32(reader.GetOrdinal("MatchedCount")),
            TotalQuestions = reader.GetInt32(reader.GetOrdinal("TotalQuestions")),
            Passed = reader.IsDBNull(reader.GetOrdinal("Passed")) ? null : reader.GetBoolean(reader.GetOrdinal("Passed")),
            Status = reader.GetString(reader.GetOrdinal("Status")),
            AttemptCount = reader.GetInt32(reader.GetOrdinal("AttemptCount")),
            MaxAttempts = reader.GetInt32(reader.GetOrdinal("MaxAttempts")),
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt")),
            SubmittedAt = reader.IsDBNull(reader.GetOrdinal("SubmittedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("SubmittedAt"))
        };
    }
}

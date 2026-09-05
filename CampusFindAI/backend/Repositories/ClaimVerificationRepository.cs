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
                        MatchId UNIQUEIDENTIFIER NULL,
                        LostItemId UNIQUEIDENTIFIER NULL,
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
                        PassedAt DATETIME2 NULL,
                        SecurityReviewedByUserId NVARCHAR(450) NULL,
                        SecurityReviewedAt DATETIME2 NULL,
                        SecurityReviewNote NVARCHAR(1000) NULL,
                        CONSTRAINT FK_ClaimVerifications_Claims FOREIGN KEY (ClaimId) REFERENCES Claims(Id) ON DELETE CASCADE
                    );
                    CREATE UNIQUE INDEX IX_ClaimVerifications_ClaimId ON ClaimVerifications(ClaimId);
                    CREATE UNIQUE INDEX IX_ClaimVerifications_MatchId ON ClaimVerifications(MatchId) WHERE MatchId IS NOT NULL;
                END
                IF COL_LENGTH('ClaimVerifications', 'MatchId') IS NULL ALTER TABLE ClaimVerifications ADD MatchId UNIQUEIDENTIFIER NULL;
                IF COL_LENGTH('ClaimVerifications', 'LostItemId') IS NULL ALTER TABLE ClaimVerifications ADD LostItemId UNIQUEIDENTIFIER NULL;
                IF COL_LENGTH('ClaimVerifications', 'PassedAt') IS NULL ALTER TABLE ClaimVerifications ADD PassedAt DATETIME2 NULL;
                IF COL_LENGTH('ClaimVerifications', 'SecurityReviewedByUserId') IS NULL ALTER TABLE ClaimVerifications ADD SecurityReviewedByUserId NVARCHAR(450) NULL;
                IF COL_LENGTH('ClaimVerifications', 'SecurityReviewedAt') IS NULL ALTER TABLE ClaimVerifications ADD SecurityReviewedAt DATETIME2 NULL;
                IF COL_LENGTH('ClaimVerifications', 'SecurityReviewNote') IS NULL ALTER TABLE ClaimVerifications ADD SecurityReviewNote NVARCHAR(1000) NULL;
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ClaimVerifications_MatchId' AND object_id = OBJECT_ID('ClaimVerifications')) CREATE UNIQUE INDEX IX_ClaimVerifications_MatchId ON ClaimVerifications(MatchId) WHERE MatchId IS NOT NULL;
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
                Id, ClaimId, MatchId, LostItemId, SecureQuestionsPayload, PublicQuestionsJson,
                SubmittedAnswersJson, EvaluationResultJson, ConfidenceScore,
                MatchedCount, TotalQuestions, Passed, Status,
                AttemptCount, MaxAttempts, CreatedAt, SubmittedAt, PassedAt, SecurityReviewedByUserId, SecurityReviewedAt, SecurityReviewNote
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

    public async Task<ClaimVerification?> GetByMatchIdAsync(Guid matchId, CancellationToken cancellationToken = default)
    {
        await EnsureTableCreatedAsync(cancellationToken);
        const string sql = """
            SELECT Id, ClaimId, MatchId, LostItemId, SecureQuestionsPayload, PublicQuestionsJson,
                   SubmittedAnswersJson, EvaluationResultJson, ConfidenceScore, MatchedCount,
                   TotalQuestions, Passed, Status, AttemptCount, MaxAttempts, CreatedAt, SubmittedAt, PassedAt, SecurityReviewedByUserId, SecurityReviewedAt, SecurityReviewNote
            FROM ClaimVerifications WHERE MatchId = @MatchId;
            """;
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@MatchId", matchId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Map(reader) : null;
    }

    public async Task<IReadOnlyList<ClaimVerification>> GetPendingSecurityReviewAsync(CancellationToken cancellationToken = default)
    {
        await EnsureTableCreatedAsync(cancellationToken);
        const string sql = "SELECT Id, ClaimId, MatchId, LostItemId, SecureQuestionsPayload, PublicQuestionsJson, SubmittedAnswersJson, EvaluationResultJson, ConfidenceScore, MatchedCount, TotalQuestions, Passed, Status, AttemptCount, MaxAttempts, CreatedAt, SubmittedAt, PassedAt, SecurityReviewedByUserId, SecurityReviewedAt, SecurityReviewNote FROM ClaimVerifications WHERE Status = 'PendingSecurityReview' ORDER BY SubmittedAt;";
        var result = new List<ClaimVerification>(); await using var connection = connectionFactory.CreateConnection(); await connection.OpenAsync(cancellationToken); await using var command = new SqlCommand(sql, connection); await using var reader = await command.ExecuteReaderAsync(cancellationToken); while (await reader.ReadAsync(cancellationToken)) result.Add(Map(reader)); return result;
    }

    public async Task AddAsync(ClaimVerification verification, CancellationToken cancellationToken = default)
    {
        await EnsureTableCreatedAsync(cancellationToken);

        const string sql = """
            INSERT INTO ClaimVerifications (
                Id, ClaimId, MatchId, LostItemId, SecureQuestionsPayload, PublicQuestionsJson,
                SubmittedAnswersJson, EvaluationResultJson, ConfidenceScore,
                MatchedCount, TotalQuestions, Passed, Status,
                AttemptCount, MaxAttempts, CreatedAt, SubmittedAt, PassedAt, SecurityReviewedByUserId, SecurityReviewedAt, SecurityReviewNote
            )
            VALUES (
                @Id, @ClaimId, @MatchId, @LostItemId, @SecureQuestionsPayload, @PublicQuestionsJson,
                @SubmittedAnswersJson, @EvaluationResultJson, @ConfidenceScore,
                @MatchedCount, @TotalQuestions, @Passed, @Status,
                @AttemptCount, @MaxAttempts, @CreatedAt, @SubmittedAt, @PassedAt, @SecurityReviewedByUserId, @SecurityReviewedAt, @SecurityReviewNote
            );
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);

        command.Parameters.AddWithValue("@Id", verification.Id);
        command.Parameters.AddWithValue("@ClaimId", verification.ClaimId);
        command.Parameters.AddWithValue("@MatchId", (object?)verification.MatchId ?? DBNull.Value);
        command.Parameters.AddWithValue("@LostItemId", (object?)verification.LostItemId ?? DBNull.Value);
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
        command.Parameters.AddWithValue("@PassedAt", (object?)verification.PassedAt ?? DBNull.Value);
        command.Parameters.AddWithValue("@SecurityReviewedByUserId", (object?)verification.SecurityReviewedByUserId ?? DBNull.Value);
        command.Parameters.AddWithValue("@SecurityReviewedAt", (object?)verification.SecurityReviewedAt ?? DBNull.Value);
        command.Parameters.AddWithValue("@SecurityReviewNote", (object?)verification.SecurityReviewNote ?? DBNull.Value);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task UpdateAsync(ClaimVerification verification, CancellationToken cancellationToken = default)
    {
        await EnsureTableCreatedAsync(cancellationToken);

        const string sql = """
            UPDATE ClaimVerifications
            SET SecureQuestionsPayload = @SecureQuestionsPayload,
                MatchId = @MatchId,
                LostItemId = @LostItemId,
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
                SubmittedAt = @SubmittedAt,
                PassedAt = @PassedAt
                ,SecurityReviewedByUserId = @SecurityReviewedByUserId, SecurityReviewedAt = @SecurityReviewedAt, SecurityReviewNote = @SecurityReviewNote
            WHERE Id = @Id;
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);

        command.Parameters.AddWithValue("@Id", verification.Id);
        command.Parameters.AddWithValue("@SecureQuestionsPayload", verification.SecureQuestionsPayload);
        command.Parameters.AddWithValue("@MatchId", (object?)verification.MatchId ?? DBNull.Value);
        command.Parameters.AddWithValue("@LostItemId", (object?)verification.LostItemId ?? DBNull.Value);
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
        command.Parameters.AddWithValue("@PassedAt", (object?)verification.PassedAt ?? DBNull.Value);
        command.Parameters.AddWithValue("@SecurityReviewedByUserId", (object?)verification.SecurityReviewedByUserId ?? DBNull.Value);
        command.Parameters.AddWithValue("@SecurityReviewedAt", (object?)verification.SecurityReviewedAt ?? DBNull.Value);
        command.Parameters.AddWithValue("@SecurityReviewNote", (object?)verification.SecurityReviewNote ?? DBNull.Value);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static ClaimVerification Map(SqlDataReader reader)
    {
        return new ClaimVerification
        {
            Id = reader.GetGuid(reader.GetOrdinal("Id")),
            ClaimId = reader.GetGuid(reader.GetOrdinal("ClaimId")),
            MatchId = reader.IsDBNull(reader.GetOrdinal("MatchId")) ? null : reader.GetGuid(reader.GetOrdinal("MatchId")),
            LostItemId = reader.IsDBNull(reader.GetOrdinal("LostItemId")) ? null : reader.GetGuid(reader.GetOrdinal("LostItemId")),
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
            SubmittedAt = reader.IsDBNull(reader.GetOrdinal("SubmittedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
            PassedAt = reader.IsDBNull(reader.GetOrdinal("PassedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("PassedAt"))
            ,SecurityReviewedByUserId = reader.IsDBNull(reader.GetOrdinal("SecurityReviewedByUserId")) ? null : reader.GetString(reader.GetOrdinal("SecurityReviewedByUserId")),
            SecurityReviewedAt = reader.IsDBNull(reader.GetOrdinal("SecurityReviewedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("SecurityReviewedAt")),
            SecurityReviewNote = reader.IsDBNull(reader.GetOrdinal("SecurityReviewNote")) ? null : reader.GetString(reader.GetOrdinal("SecurityReviewNote"))
        };
    }
}

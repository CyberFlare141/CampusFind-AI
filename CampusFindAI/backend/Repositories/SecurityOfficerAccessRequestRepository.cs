using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.Data.SqlClient;

namespace CampusFindAI.Api.Repositories;

public class SecurityOfficerAccessRequestRepository(ISqlConnectionFactory connectionFactory)
    : ISecurityOfficerAccessRequestRepository
{
    private const string Columns = "Id, UserId, Email, FullName, StaffId, Department, Reason, Status, ReviewedByUserId, ReviewedAt, RejectionReason, CreatedAt";

    public Task<SecurityOfficerAccessRequest?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        QuerySingleAsync("Id = @Id", command => command.Parameters.AddWithValue("@Id", id), cancellationToken);

    public Task<SecurityOfficerAccessRequest?> GetPendingForUserAsync(string userId, CancellationToken cancellationToken = default) =>
        QuerySingleAsync("UserId = @UserId AND Status = 'Pending'", command => command.Parameters.AddWithValue("@UserId", userId), cancellationToken);

    public async Task<IReadOnlyList<SecurityOfficerAccessRequest>> GetForUserAsync(string userId, CancellationToken cancellationToken = default) =>
        await QueryManyAsync("WHERE UserId = @UserId ORDER BY CreatedAt DESC", command => command.Parameters.AddWithValue("@UserId", userId), cancellationToken);

    public async Task<IReadOnlyList<SecurityOfficerAccessRequest>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await QueryManyAsync("ORDER BY CreatedAt DESC", _ => { }, cancellationToken);

    public async Task CreateAsync(SecurityOfficerAccessRequest request, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO SecurityOfficerAccessRequests (Id, UserId, Email, FullName, StaffId, Department, Reason, Status, CreatedAt)
            VALUES (@Id, @UserId, @Email, @FullName, @StaffId, @Department, @Reason, @Status, @CreatedAt);
            """;
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);
        AddParameters(command, request);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task UpdateDecisionAsync(Guid id, AccessRequestStatus status, string reviewerId, string? rejectionReason, CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE SecurityOfficerAccessRequests
            SET Status = @Status, ReviewedByUserId = @ReviewerId, ReviewedAt = @ReviewedAt, RejectionReason = @RejectionReason
            WHERE Id = @Id AND Status = 'Pending';
            """;
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Status", status.ToString());
        command.Parameters.AddWithValue("@ReviewerId", reviewerId);
        command.Parameters.AddWithValue("@ReviewedAt", DateTime.UtcNow);
        command.Parameters.AddWithValue("@RejectionReason", (object?)rejectionReason ?? DBNull.Value);
        command.Parameters.AddWithValue("@Id", id);
        if (await command.ExecuteNonQueryAsync(cancellationToken) == 0)
        {
            throw new InvalidOperationException("This access request has already been decided.");
        }
    }

    private async Task<SecurityOfficerAccessRequest?> QuerySingleAsync(string filter, Action<SqlCommand> addParameters, CancellationToken cancellationToken)
    {
        var results = await QueryManyAsync($"WHERE {filter}", addParameters, cancellationToken);
        return results.FirstOrDefault();
    }

    private async Task<IReadOnlyList<SecurityOfficerAccessRequest>> QueryManyAsync(string suffix, Action<SqlCommand> addParameters, CancellationToken cancellationToken)
    {
        var requests = new List<SecurityOfficerAccessRequest>();
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand($"SELECT {Columns} FROM SecurityOfficerAccessRequests {suffix};", connection);
        addParameters(command);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken)) requests.Add(Map(reader));
        return requests;
    }

    private static void AddParameters(SqlCommand command, SecurityOfficerAccessRequest request)
    {
        command.Parameters.AddWithValue("@Id", request.Id);
        command.Parameters.AddWithValue("@UserId", request.UserId);
        command.Parameters.AddWithValue("@Email", request.Email);
        command.Parameters.AddWithValue("@FullName", (object?)request.FullName ?? DBNull.Value);
        command.Parameters.AddWithValue("@StaffId", (object?)request.StaffId ?? DBNull.Value);
        command.Parameters.AddWithValue("@Department", (object?)request.Department ?? DBNull.Value);
        command.Parameters.AddWithValue("@Reason", request.Reason);
        command.Parameters.AddWithValue("@Status", request.Status.ToString());
        command.Parameters.AddWithValue("@CreatedAt", request.CreatedAt);
    }

    private static SecurityOfficerAccessRequest Map(SqlDataReader reader) => new()
    {
        Id = reader.GetGuid(reader.GetOrdinal("Id")), UserId = reader.GetString(reader.GetOrdinal("UserId")), Email = reader.GetString(reader.GetOrdinal("Email")),
        FullName = reader.IsDBNull(reader.GetOrdinal("FullName")) ? null : reader.GetString(reader.GetOrdinal("FullName")), StaffId = reader.IsDBNull(reader.GetOrdinal("StaffId")) ? null : reader.GetString(reader.GetOrdinal("StaffId")),
        Department = reader.IsDBNull(reader.GetOrdinal("Department")) ? null : reader.GetString(reader.GetOrdinal("Department")), Reason = reader.GetString(reader.GetOrdinal("Reason")),
        Status = Enum.Parse<AccessRequestStatus>(reader.GetString(reader.GetOrdinal("Status"))), ReviewedByUserId = reader.IsDBNull(reader.GetOrdinal("ReviewedByUserId")) ? null : reader.GetString(reader.GetOrdinal("ReviewedByUserId")),
        ReviewedAt = reader.IsDBNull(reader.GetOrdinal("ReviewedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("ReviewedAt")), RejectionReason = reader.IsDBNull(reader.GetOrdinal("RejectionReason")) ? null : reader.GetString(reader.GetOrdinal("RejectionReason")), CreatedAt = reader.GetDateTime(reader.GetOrdinal("CreatedAt"))
    };
}
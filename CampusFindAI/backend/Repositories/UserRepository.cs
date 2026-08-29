using CampusFindAI.Api.Data;
using CampusFindAI.Api.Models;
using Microsoft.Data.SqlClient;

namespace CampusFindAI.Api.Repositories;

public class UserRepository(ISqlConnectionFactory connectionFactory) : IUserRepository
{
    public async Task<ApplicationUser?> GetByEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT TOP (1)
                Id,
                Role,
                UserName,
                NormalizedUserName,
                Email,
                NormalizedEmail,
                EmailConfirmed,
                PasswordHash,
                SecurityStamp,
                ConcurrencyStamp,
                PhoneNumber,
                PhoneNumberConfirmed,
                TwoFactorEnabled,
                LockoutEnd,
                LockoutEnabled,
                AccessFailedCount
            FROM AspNetUsers
            WHERE NormalizedEmail = @NormalizedEmail;
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@NormalizedEmail", Normalize(email));

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken)
            ? MapUser(reader)
            : null;
    }

    public async Task<ApplicationUser?> GetByIdAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT TOP (1)
                Id,
                Role,
                UserName,
                NormalizedUserName,
                Email,
                NormalizedEmail,
                EmailConfirmed,
                PasswordHash,
                SecurityStamp,
                ConcurrencyStamp,
                PhoneNumber,
                PhoneNumberConfirmed,
                TwoFactorEnabled,
                LockoutEnd,
                LockoutEnabled,
                AccessFailedCount
            FROM AspNetUsers
            WHERE Id = @Id;
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken)
            ? MapUser(reader)
            : null;
    }

    public async Task<IReadOnlyList<string>> GetRolesAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT r.Name
            FROM AspNetUserRoles ur
            INNER JOIN AspNetRoles r ON r.Id = ur.RoleId
            WHERE ur.UserId = @UserId
            ORDER BY r.Name;
            """;

        var roles = new List<string>();

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@UserId", userId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var roleName = reader.GetNullableString("Name");
            if (!string.IsNullOrWhiteSpace(roleName))
            {
                roles.Add(roleName);
            }
        }

        return roles;
    }

    public async Task CreateAsync(
        ApplicationUser user,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO AspNetUsers (
                Id,
                Role,
                UserName,
                NormalizedUserName,
                Email,
                NormalizedEmail,
                EmailConfirmed,
                PasswordHash,
                SecurityStamp,
                ConcurrencyStamp,
                PhoneNumber,
                PhoneNumberConfirmed,
                TwoFactorEnabled,
                LockoutEnd,
                LockoutEnabled,
                AccessFailedCount
            )
            VALUES (
                @Id,
                @Role,
                @UserName,
                @NormalizedUserName,
                @Email,
                @NormalizedEmail,
                @EmailConfirmed,
                @PasswordHash,
                @SecurityStamp,
                @ConcurrencyStamp,
                @PhoneNumber,
                @PhoneNumberConfirmed,
                @TwoFactorEnabled,
                @LockoutEnd,
                @LockoutEnabled,
                @AccessFailedCount
            );
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", user.Id);
        command.Parameters.AddWithValue("@Role", user.Role.ToString());
        command.Parameters.AddWithValue("@UserName", (object?)user.UserName ?? DBNull.Value);
        command.Parameters.AddWithValue("@NormalizedUserName", (object?)user.NormalizedUserName ?? DBNull.Value);
        command.Parameters.AddWithValue("@Email", (object?)user.Email ?? DBNull.Value);
        command.Parameters.AddWithValue("@NormalizedEmail", (object?)user.NormalizedEmail ?? DBNull.Value);
        command.Parameters.AddWithValue("@EmailConfirmed", user.EmailConfirmed);
        command.Parameters.AddWithValue("@PasswordHash", (object?)user.PasswordHash ?? DBNull.Value);
        command.Parameters.AddWithValue("@SecurityStamp", (object?)user.SecurityStamp ?? DBNull.Value);
        command.Parameters.AddWithValue("@ConcurrencyStamp", (object?)user.ConcurrencyStamp ?? DBNull.Value);
        command.Parameters.AddWithValue("@PhoneNumber", (object?)user.PhoneNumber ?? DBNull.Value);
        command.Parameters.AddWithValue("@PhoneNumberConfirmed", user.PhoneNumberConfirmed);
        command.Parameters.AddWithValue("@TwoFactorEnabled", user.TwoFactorEnabled);
        command.Parameters.AddWithValue("@LockoutEnd", (object?)user.LockoutEnd ?? DBNull.Value);
        command.Parameters.AddWithValue("@LockoutEnabled", user.LockoutEnabled);
        command.Parameters.AddWithValue("@AccessFailedCount", user.AccessFailedCount);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task AddToRoleAsync(
        string userId,
        string roleName,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO AspNetUserRoles (UserId, RoleId)
            SELECT @UserId, r.Id
            FROM AspNetRoles r
            WHERE r.NormalizedName = @NormalizedRoleName
              AND NOT EXISTS (
                  SELECT 1
                  FROM AspNetUserRoles ur
                  WHERE ur.UserId = @UserId
                    AND ur.RoleId = r.Id
              );
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@UserId", userId);
        command.Parameters.AddWithValue("@NormalizedRoleName", Normalize(roleName));

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task EnsureRoleExistsAsync(
        string roleName,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            IF NOT EXISTS (
                SELECT 1
                FROM AspNetRoles
                WHERE NormalizedName = @NormalizedName
            )
            BEGIN
                INSERT INTO AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp)
                VALUES (@Id, @Name, @NormalizedName, @ConcurrencyStamp);
            END
            """;

        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", Guid.NewGuid().ToString());
        command.Parameters.AddWithValue("@Name", roleName);
        command.Parameters.AddWithValue("@NormalizedName", Normalize(roleName));
        command.Parameters.AddWithValue("@ConcurrencyStamp", Guid.NewGuid().ToString());

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task UpdatePasswordHashAsync(string userId, string passwordHash, CancellationToken cancellationToken = default)
    {
        const string sql = "UPDATE AspNetUsers SET PasswordHash = @PasswordHash, SecurityStamp = @SecurityStamp WHERE Id = @Id;";
        await using var connection = connectionFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@Id", userId);
        command.Parameters.AddWithValue("@PasswordHash", passwordHash);
        command.Parameters.AddWithValue("@SecurityStamp", Guid.NewGuid().ToString());
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static ApplicationUser MapUser(SqlDataReader reader)
    {
        return new ApplicationUser
        {
            Id = reader.GetRequiredString("Id"),
            Role = Enum.TryParse<UserRole>(reader.GetRequiredString("Role"), out var role)
                ? role
                : UserRole.Student,
            UserName = reader.GetNullableString("UserName"),
            NormalizedUserName = reader.GetNullableString("NormalizedUserName"),
            Email = reader.GetNullableString("Email"),
            NormalizedEmail = reader.GetNullableString("NormalizedEmail"),
            EmailConfirmed = reader.GetBoolean(reader.GetOrdinal("EmailConfirmed")),
            PasswordHash = reader.GetNullableString("PasswordHash"),
            SecurityStamp = reader.GetNullableString("SecurityStamp"),
            ConcurrencyStamp = reader.GetNullableString("ConcurrencyStamp"),
            PhoneNumber = reader.GetNullableString("PhoneNumber"),
            PhoneNumberConfirmed = reader.GetBoolean(reader.GetOrdinal("PhoneNumberConfirmed")),
            TwoFactorEnabled = reader.GetBoolean(reader.GetOrdinal("TwoFactorEnabled")),
            LockoutEnd = reader.IsDBNull(reader.GetOrdinal("LockoutEnd"))
                ? null
                : reader.GetFieldValue<DateTimeOffset>(reader.GetOrdinal("LockoutEnd")),
            LockoutEnabled = reader.GetBoolean(reader.GetOrdinal("LockoutEnabled")),
            AccessFailedCount = reader.GetInt32(reader.GetOrdinal("AccessFailedCount"))
        };
    }

    private static string Normalize(string value) => value.Trim().ToUpperInvariant();
}

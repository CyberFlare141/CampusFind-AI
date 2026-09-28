using Npgsql;

namespace CampusFindAI.Api.Data;

public class DbConnectionFactory(IConfiguration configuration) : IDbConnectionFactory
{
    private readonly string _connectionString = PostgreSqlConnection.Resolve(configuration);

    public NpgsqlConnection CreateConnection() => new(_connectionString);
}
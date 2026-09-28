using Microsoft.Data.SqlClient;

namespace CampusFindAI.Api.Data;

public class SqlConnectionFactory(IConfiguration configuration) : ISqlConnectionFactory
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("DefaultConnection is missing.");

    public SqlConnection CreateConnection() => new(_connectionString);
}

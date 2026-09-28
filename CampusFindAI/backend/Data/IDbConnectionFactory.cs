using Npgsql;

namespace CampusFindAI.Api.Data;

public interface IDbConnectionFactory
{
    NpgsqlConnection CreateConnection();
}
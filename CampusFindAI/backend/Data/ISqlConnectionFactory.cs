using Microsoft.Data.SqlClient;

namespace CampusFindAI.Api.Data;

public interface ISqlConnectionFactory
{
    SqlConnection CreateConnection();
}

using Microsoft.Data.SqlClient;

namespace CampusFindAI.Api.Data;

public interface ISqlConnectionFactory
{
    SqlConnection CreateConnection();
}


//Server=tcp:campusfindai-server.database.windows.net,1433;Initial Catalog=campusfindai-database;Persist Security Info=False;User ID=campusfindai-server-admin;Password=gadgagagadgeraradxcasa213123!;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
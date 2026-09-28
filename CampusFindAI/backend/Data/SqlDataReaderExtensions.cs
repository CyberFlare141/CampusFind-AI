using Microsoft.Data.SqlClient;

namespace CampusFindAI.Api.Data;

public static class SqlDataReaderExtensions
{
    public static string GetRequiredString(this SqlDataReader reader, string columnName)
        => reader.GetString(reader.GetOrdinal(columnName));

    public static string? GetNullableString(this SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    public static Guid GetGuid(this SqlDataReader reader, string columnName)
        => reader.GetGuid(reader.GetOrdinal(columnName));

    public static Guid? GetNullableGuid(this SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);
    }

    public static DateTime GetDateTime(this SqlDataReader reader, string columnName)
        => reader.GetDateTime(reader.GetOrdinal(columnName));

    public static DateTime? GetNullableDateTime(this SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
    }

    public static decimal GetDecimal(this SqlDataReader reader, string columnName)
        => reader.GetDecimal(reader.GetOrdinal(columnName));
}

using Npgsql;

namespace CampusFindAI.Api.Data;

public static class DbDataReaderExtensions
{
    public static string GetRequiredString(this NpgsqlDataReader reader, string columnName)
        => reader.GetString(reader.GetOrdinal(columnName));

    public static string? GetNullableString(this NpgsqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    public static Guid GetGuid(this NpgsqlDataReader reader, string columnName)
        => reader.GetGuid(reader.GetOrdinal(columnName));

    public static Guid? GetNullableGuid(this NpgsqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);
    }

    public static DateTime GetDateTime(this NpgsqlDataReader reader, string columnName)
        => reader.GetDateTime(reader.GetOrdinal(columnName));

    public static DateTime? GetNullableDateTime(this NpgsqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
    }

    public static decimal GetDecimal(this NpgsqlDataReader reader, string columnName)
        => reader.GetDecimal(reader.GetOrdinal(columnName));
}
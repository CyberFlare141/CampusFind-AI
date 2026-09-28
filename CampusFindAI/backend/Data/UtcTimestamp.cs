namespace CampusFindAI.Api.Data;

/// <summary>
/// PostgreSQL maps <see cref="DateTime"/> to <c>timestamp with time zone</c>, and Npgsql only accepts
/// <see cref="DateTimeKind.Utc"/> values for that type. Values coming from clients arrive as
/// <see cref="DateTimeKind.Unspecified"/> (for example the date <c>2026-09-28</c> that an HTML date input posts),
/// which Npgsql rejects, so every client-supplied timestamp is normalized here before it reaches the database.
/// A value with no explicit offset is interpreted as UTC, which is the contract the API documents.
/// </summary>
public static class UtcTimestamp
{
    public static DateTime Normalize(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };

    public static DateTime? Normalize(DateTime? value) => value.HasValue ? Normalize(value.Value) : null;
}

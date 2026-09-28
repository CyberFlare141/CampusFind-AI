using System.Globalization;
using Npgsql;

namespace CampusFindAI.Api.Data;

/// <summary>
/// Resolves the single PostgreSQL connection string used by the whole backend from the shapes a hosting
/// provider publishes:
/// <list type="bullet">
///   <item><description><c>ConnectionStrings:DefaultConnection</c> (local development),</description></item>
///   <item><description><c>DATABASE_URL</c> — Render's PostgreSQL URL, e.g. <c>postgresql://user:pass@host:5432/db</c>,</description></item>
///   <item><description>the discrete <c>PGHOST</c>/<c>PGPORT</c>/<c>PGUSER</c>/<c>PGPASSWORD</c>/<c>PGDATABASE</c> variables Render also exports.</description></item>
/// </list>
/// Credentials only ever come from configuration, never from source code.
/// </summary>
public static class PostgreSqlConnection
{
    public static string Resolve(IConfiguration configuration)
    {
        // Platform-provided URLs win: they are only ever present in a hosted environment, so a developer machine that
        // happens to have the variable set can never silently point the app at the wrong database.
        var url = FirstNonEmpty(configuration, "DATABASE_URL", "DATABASE_URL_INTERNAL", "POSTGRES_URL");
        if (url is not null) return Normalize(url);

        var configuredValue = configuration.GetConnectionString("DefaultConnection");
        if (!string.IsNullOrWhiteSpace(configuredValue)) return Normalize(configuredValue);

        var discreteVariables = FromDiscreteVariables(configuration);
        if (discreteVariables is not null) return Normalize(discreteVariables);

        throw new InvalidOperationException(
            "No PostgreSQL connection is configured. Set DATABASE_URL (or ConnectionStrings__DefaultConnection) to the database " +
            "connection string, for example postgresql://user:password@host:5432/database.");
    }

    /// <summary>
    /// Accepts either a URL (<c>postgres://</c>/<c>postgresql://</c>) or an Npgsql key/value connection string and
    /// always returns a connection string Npgsql can consume.
    /// </summary>
    public static string Normalize(string value)
    {
        var trimmed = value.Trim();
        if (trimmed.Length == 0) throw new InvalidOperationException("The configured PostgreSQL connection string is empty.");

        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) || !IsPostgresUri(uri))
        {
            // Already an Npgsql key/value connection string.
            return trimmed;
        }

        var userInfo = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = Uri.UnescapeDataString(uri.AbsolutePath.Trim('/')),
            Username = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : null,
            Password = userInfo.Length == 2 ? Uri.UnescapeDataString(userInfo[1]) : null,
            // Npgsql's own default: encrypt when the server offers TLS (Render's endpoints do), plaintext otherwise
            // (a local server without TLS). Prefer and Require encrypt without validating the certificate, mirroring
            // libpq - append "?sslmode=verify-full" (plus sslrootcert when the CA is private) to validate instead.
            SslMode = SslMode.Prefer
        };

        ApplyQueryOptions(builder, uri.Query);

        return builder.ConnectionString;
    }

    /// <summary>
    /// Applies the PostgreSQL URL query options that matter for a hosted deployment (Render's URLs may carry
    /// <c>sslmode</c>, and self-hosted databases sometimes add <c>search_path</c> or <c>connect_timeout</c>).
    /// </summary>
    private static void ApplyQueryOptions(NpgsqlConnectionStringBuilder builder, string query)
    {
        if (string.IsNullOrWhiteSpace(query)) return;

        foreach (var pair in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = pair.Split('=', 2);
            var key = Uri.UnescapeDataString(parts[0]).Trim().ToLowerInvariant();
            var value = parts.Length == 2 ? Uri.UnescapeDataString(parts[1]).Trim() : string.Empty;

            switch (key)
            {
                case "sslmode" when TryParseSslMode(value, out var sslMode):
                    builder.SslMode = sslMode;
                    break;
                case "sslrootcert" when value.Length > 0:
                    builder.RootCertificate = value;
                    break;
                case "search_path" when value.Length > 0:
                case "searchpath" when value.Length > 0:
                    builder.SearchPath = value;
                    break;
                case "application_name" when value.Length > 0:
                case "applicationname" when value.Length > 0:
                    builder.ApplicationName = value;
                    break;
                case "connect_timeout" when int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var connectTimeout):
                case "timeout" when int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out connectTimeout):
                    builder.Timeout = connectTimeout;
                    break;
            }
        }
    }

    // PostgreSQL URLs spell the modes "verify-ca"/"verify-full" while the Npgsql enum uses "VerifyCA"/"VerifyFull".
    private static bool TryParseSslMode(string value, out SslMode sslMode) =>
        Enum.TryParse(value.Replace("-", string.Empty).Replace("_", string.Empty), ignoreCase: true, out sslMode);

    /// <summary>
    /// Render (and libpq) also publish the same database as discrete environment variables.
    /// </summary>
    private static string? FromDiscreteVariables(IConfiguration configuration)
    {
        var host = configuration["PGHOST"];
        if (string.IsNullOrWhiteSpace(host)) return null;

        return new NpgsqlConnectionStringBuilder
        {
            Host = host,
            Port = int.TryParse(configuration["PGPORT"], NumberStyles.Integer, CultureInfo.InvariantCulture, out var port) ? port : 5432,
            Database = configuration["PGDATABASE"] ?? "postgres",
            Username = configuration["PGUSER"],
            Password = configuration["PGPASSWORD"]
        }.ConnectionString;
    }

    private static string? FirstNonEmpty(IConfiguration configuration, params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = configuration[key];
            if (!string.IsNullOrWhiteSpace(value)) return value;
        }

        return null;
    }

    private static bool IsPostgresUri(Uri uri) =>
        string.Equals(uri.Scheme, "postgres", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(uri.Scheme, "postgresql", StringComparison.OrdinalIgnoreCase);

}
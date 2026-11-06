using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;

namespace Costalito.Api.Data;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(
        string connectionString,
        string scriptsDirectory,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var masterConnection = new SqlConnectionStringBuilder(connectionString)
        {
            InitialCatalog = "master",
        };

        await using var connection = new SqlConnection(masterConnection.ConnectionString);
        await connection.OpenAsync(cancellationToken);

        await AttachExistingDatabaseAsync(
            connection,
            new SqlConnectionStringBuilder(connectionString).InitialCatalog,
            logger,
            cancellationToken);

        foreach (var fileName in new[] { "01_crear_estructura.sql", "02_datos_prueba.sql" })
        {
            var path = Path.Combine(scriptsDirectory, fileName);
            var script = await File.ReadAllTextAsync(path, cancellationToken);
            var batches = Regex.Split(
                script,
                @"^[\t ]*GO[\t ]*(?:--.*)?\r?$",
                RegexOptions.Multiline | RegexOptions.IgnoreCase);

            foreach (var batch in batches)
            {
                if (string.IsNullOrWhiteSpace(batch))
                    continue;

                await using var command = new SqlCommand(batch, connection)
                {
                    CommandTimeout = 60,
                };
                await command.ExecuteNonQueryAsync(cancellationToken);
            }

            logger.LogInformation("Se aplicó el script de base de datos {FileName}.", fileName);
        }
    }

    private static async Task AttachExistingDatabaseAsync(
        SqlConnection connection,
        string databaseName,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        await using var check = new SqlCommand(
            "SELECT CASE WHEN DB_ID(@name) IS NULL THEN 0 ELSE 1 END;", connection);
        check.Parameters.AddWithValue("@name", databaseName);
        if (Convert.ToInt32(await check.ExecuteScalarAsync(cancellationToken)) == 1)
            return;

        var profile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        var dataFile = Path.Combine(profile, $"{databaseName}.mdf");
        var logFile = Path.Combine(profile, $"{databaseName}_log.ldf");

        if (!File.Exists(dataFile))
            return;

        if (!File.Exists(logFile))
        {
            throw new FileNotFoundException(
                $"Existe {dataFile}, pero falta el archivo de registro {logFile}. No se modificó ni eliminó ninguno de los archivos.");
        }

        var quotedName = $"[{databaseName.Replace("]", "]]", StringComparison.Ordinal)}]";
        var dataPath = dataFile.Replace("'", "''", StringComparison.Ordinal);
        var logPath = logFile.Replace("'", "''", StringComparison.Ordinal);
        var attachSql = $"CREATE DATABASE {quotedName} ON (FILENAME = N'{dataPath}'), (FILENAME = N'{logPath}') FOR ATTACH;";

        await using var attach = new SqlCommand(attachSql, connection);
        await attach.ExecuteNonQueryAsync(cancellationToken);
        logger.LogInformation("Se volvió a asociar la base existente desde {DataFile}.", dataFile);
    }
}

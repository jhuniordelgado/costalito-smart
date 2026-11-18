using Costalito.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;

namespace Costalito.Api.Middleware;

public sealed class ApiExceptionMiddleware(
    RequestDelegate next,
    ILogger<ApiExceptionMiddleware> logger)
{
    /// <summary>Angular lo reconoce para recargar los datos que quedaron desactualizados.</summary>
    public const string CodigoConflictoConcurrencia = "conflicto-concurrencia";

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ApiException error)
        {
            await EscribirErrorAsync(context, error.StatusCode, error.Message);
        }
        catch (DbUpdateConcurrencyException error)
        {
            // Va antes que DbUpdateException porque hereda de ella.
            logger.LogWarning(error, "Conflicto de concurrencia al guardar en {Path}.", context.Request.Path);
            await EscribirErrorAsync(
                context, StatusCodes.Status409Conflict,
                "Otra persona cambió estos datos al mismo tiempo. Revisa las existencias o el saldo e intenta de nuevo.",
                DetalleEnDesarrollo(context, error), CodigoConflictoConcurrencia);
        }
        catch (DbUpdateException error)
        {
            var detalle = DetalleEnDesarrollo(context, error);
            var errorSql = BuscarErrorSql(error);
            if (errorSql is not null && TraduccionErroresSql.Traducir(errorSql) is { } traducido)
            {
                // La base rechazó los datos (repetidos, fuera de regla): es un error del
                // pedido, no del servidor.
                logger.LogWarning(error, "SQL Server rechazó los datos: {Mensaje}", traducido.Mensaje);
                await EscribirErrorAsync(context, traducido.Status, traducido.Mensaje, detalle);
            }
            else if (errorSql is not null)
            {
                logger.LogError(error, "No fue posible completar la operación en SQL Server.");
                await EscribirErrorAsync(
                    context, StatusCodes.Status500InternalServerError,
                    "No fue posible completar el cambio en la base de datos.", detalle);
            }
            else
            {
                logger.LogWarning(error, "La base de datos rechazó una operación.");
                await EscribirErrorAsync(
                    context, StatusCodes.Status409Conflict,
                    "No se pudo guardar el registro. Revisa los datos e intenta de nuevo.", detalle);
            }
        }
        catch (SqlException error) when (TraduccionErroresSql.Traducir(error) is { } traducido)
        {
            logger.LogWarning(error, "SQL Server rechazó los datos: {Mensaje}", traducido.Mensaje);
            await EscribirErrorAsync(context, traducido.Status, traducido.Mensaje, DetalleEnDesarrollo(context, error));
        }
        catch (SqlException error)
        {
            logger.LogError(error, "No fue posible conectar con SQL Server.");
            await EscribirErrorAsync(
                context, StatusCodes.Status500InternalServerError,
                "No fue posible completar el cambio en la base de datos.",
                DetalleEnDesarrollo(context, error));
        }
        catch (Exception error)
        {
            logger.LogError(error, "Error inesperado al procesar {Path}.", context.Request.Path);
            var detalle = context.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment()
                ? error.ToString()
                : null;
            await EscribirErrorAsync(
                context, StatusCodes.Status500InternalServerError,
                "Ocurrió un error interno. Intenta de nuevo más tarde.", detalle);
        }
    }

    private static SqlException? BuscarErrorSql(Exception error)
    {
        for (var actual = error; actual is not null; actual = actual.InnerException)
        {
            if (actual is SqlException sql)
                return sql;
        }
        return null;
    }

    private static string? DetalleEnDesarrollo(HttpContext context, Exception error) =>
        context.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment()
            ? error.ToString()
            : null;

    private static async Task EscribirErrorAsync(
        HttpContext context, int status, string message, string? detalle = null, string? codigo = null)
    {
        if (context.Response.HasStarted)
            return;

        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json; charset=utf-8";
        var respuesta = new Dictionary<string, object?>
        {
            ["error"] = message,
            ["status"] = status,
            ["traceId"] = context.TraceIdentifier,
        };
        if (codigo is not null)
            respuesta["codigo"] = codigo;
        if (detalle is not null)
            respuesta["detalle"] = detalle;

        await context.Response.WriteAsJsonAsync(respuesta);
    }
}

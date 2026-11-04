using Costalito.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;

namespace Costalito.Api.Middleware;

public sealed class ApiExceptionMiddleware(
    RequestDelegate next,
    ILogger<ApiExceptionMiddleware> logger)
{
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
        catch (DbUpdateException error)
        {
            if (ContieneErrorSql(error))
            {
                logger.LogError(error, "No fue posible completar la operación en SQL Server.");
                await EscribirErrorAsync(
                    context, StatusCodes.Status500InternalServerError,
                    "No fue posible conectar con la base de datos. Intenta de nuevo más tarde.");
            }
            else
            {
                logger.LogWarning(error, "La base de datos rechazó una operación.");
                await EscribirErrorAsync(
                    context, StatusCodes.Status409Conflict,
                    "No se pudo guardar el registro. Revisa que no exista un dato duplicado.");
            }
        }
        catch (SqlException error)
        {
            logger.LogError(error, "No fue posible conectar con SQL Server.");
            await EscribirErrorAsync(
                context, StatusCodes.Status500InternalServerError,
                "No fue posible conectar con la base de datos. Intenta de nuevo más tarde.");
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

    private static bool ContieneErrorSql(Exception error)
    {
        for (var actual = error; actual is not null; actual = actual.InnerException)
        {
            if (actual is SqlException)
                return true;
        }
        return false;
    }

    private static async Task EscribirErrorAsync(
        HttpContext context, int status, string message, string? detalle = null)
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
        if (detalle is not null)
            respuesta["detalle"] = detalle;

        await context.Response.WriteAsJsonAsync(respuesta);
    }
}

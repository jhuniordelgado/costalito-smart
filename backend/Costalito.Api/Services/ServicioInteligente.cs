using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Costalito.Api.DTOs;
using Microsoft.Extensions.Options;

namespace Costalito.Api.Services;

/// <summary>Sección "ServicioInteligente" de appsettings.json.</summary>
public sealed class OpcionesServicioInteligente
{
    public const string Seccion = "ServicioInteligente";

    /// <summary>Dirección de la API de Python (uvicorn).</summary>
    public string Url { get; set; } = "http://127.0.0.1:8000";

    /// <summary>
    /// La primera petición puede tardar mientras Python carga TensorFlow; después responde
    /// en menos de un segundo.
    /// </summary>
    public int TiempoEsperaSegundos { get; set; } = 30;
}

public interface IServicioInteligente
{
    Task<PrediccionesDto> ObtenerPrediccionesAsync(CancellationToken cancellationToken);
}

/// <summary>
/// Puente entre Angular y el servicio de Python. Angular nunca llama a Python: así la
/// sesión, el CORS y los errores se manejan en un solo lugar, y Python puede quedarse
/// escuchando solo en 127.0.0.1.
/// </summary>
public sealed class ServicioInteligente(
    HttpClient http,
    IRelojGranero reloj,
    IOptions<OpcionesServicioInteligente> opciones,
    ILogger<ServicioInteligente> logger) : IServicioInteligente
{
    // Python responde en snake_case (dias_para_agotarse); Angular recibe camelCase.
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
    };

    public async Task<PrediccionesDto> ObtenerPrediccionesAsync(CancellationToken cancellationToken)
    {
        var consultado = reloj.Ahora;
        try
        {
            // Las consultas van en paralelo: la página espera solo a la más lenta
            var inicio = LeerAsync<InicioPython>("/", cancellationToken);
            var recomendaciones = LeerAsync<RecomendacionesPython>("/recomendaciones", cancellationToken);
            var estado = LeerAsync<EstadoDatosPython>("/estado-datos", cancellationToken);
            var modelo = LeerOpcionalAsync<ModeloPython>("/modelo", cancellationToken);
            await Task.WhenAll(inicio, recomendaciones, estado, modelo);

            var datos = await recomendaciones;
            var metodo = (await inicio).Metodo;
            return new PrediccionesDto(
                Disponible: true,
                Mensaje: null,
                Consultado: consultado,
                Metodo: metodo,
                UsaRedNeuronal: metodo == "red neuronal",
                Datos: AEstado(await estado),
                Modelo: await modelo is { } m
                    ? new ModeloIaDto(m.Version, m.Entrenado, m.MaeRedNeuronal, m.MaePromedioMovil, m.UsarRed)
                    : null,
                Recomendaciones: datos.Recomendaciones.Select(APrediccion).ToList(),
                SinDatosSuficientes: datos.SinDatosSuficientes);
        }
        catch (ServicioInteligenteException error)
        {
            logger.LogWarning("El servicio inteligente respondió con un error: {Mensaje}", error.Message);
            return PrediccionesDto.NoDisponible(error.Message, consultado);
        }
        catch (Exception error) when (error is HttpRequestException
                                          || (error is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            logger.LogWarning(error, "No fue posible consultar el servicio inteligente en {Url}.", opciones.Value.Url);
            return PrediccionesDto.NoDisponible(
                $"El servicio inteligente no responde en {opciones.Value.Url}. Inícialo desde la carpeta "
                + "servicio-inteligente con 'uvicorn api:app' y vuelve a consultar.", consultado);
        }
    }

    private async Task<T> LeerAsync<T>(string ruta, CancellationToken cancellationToken)
    {
        using var respuesta = await http.GetAsync(ruta, cancellationToken);
        if (!respuesta.IsSuccessStatusCode)
            throw new ServicioInteligenteException(await DetalleAsync(respuesta, cancellationToken));
        return await respuesta.Content.ReadFromJsonAsync<T>(Json, cancellationToken)
            ?? throw new ServicioInteligenteException($"El servicio inteligente devolvió una respuesta vacía en {ruta}.");
    }

    /// <summary>/modelo responde 503 cuando todavía no hay modelo entrenado: no es un error.</summary>
    private async Task<T?> LeerOpcionalAsync<T>(string ruta, CancellationToken cancellationToken) where T : class
    {
        using var respuesta = await http.GetAsync(ruta, cancellationToken);
        if (respuesta.StatusCode == HttpStatusCode.ServiceUnavailable)
            return null;
        if (!respuesta.IsSuccessStatusCode)
            throw new ServicioInteligenteException(await DetalleAsync(respuesta, cancellationToken));
        return await respuesta.Content.ReadFromJsonAsync<T>(Json, cancellationToken);
    }

    // FastAPI manda los errores como {"detail": "..."}; si SQL Server está caído, Python lo explica ahí
    private static async Task<string> DetalleAsync(HttpResponseMessage respuesta, CancellationToken cancellationToken)
    {
        try
        {
            var error = await respuesta.Content.ReadFromJsonAsync<ErrorPython>(Json, cancellationToken);
            if (!string.IsNullOrWhiteSpace(error?.Detail))
                return $"El servicio inteligente no pudo responder: {error.Detail}";
        }
        catch (JsonException)
        {
        }
        return $"El servicio inteligente respondió {(int)respuesta.StatusCode}.";
    }

    private static EstadoDatosIaDto AEstado(EstadoDatosPython estado) => new(
        estado.SemanasCompletas, estado.SemanasNecesarias, estado.SePuedeEntrenar,
        estado.PrimeraVenta, estado.UltimaVenta, estado.EntrenamientoPosibleDesde);

    private static PrediccionProductoDto APrediccion(RecomendacionPython r) => new(
        r.Codigo, r.Producto, r.Metodo, r.Urgencia, r.ComprarAhora, r.Cuando, r.FechaCompra,
        r.CantidadSugerida, r.DemandaSemanalPrevista, r.UltimasSemanas, r.SemanasDesde,
        r.Existencias, r.EnCamino, r.DiasEntrega, r.DiasParaAgotarse, r.Explicacion);

    // Formas de las respuestas de Python (api.py)
    private sealed record InicioPython(string? Metodo);
    private sealed record ErrorPython(string? Detail);
    private sealed record RecomendacionesPython(
        List<RecomendacionPython> Recomendaciones, List<string> SinDatosSuficientes);
    private sealed record RecomendacionPython(
        string Codigo, string Producto, string Metodo, string Urgencia, bool ComprarAhora, string Cuando,
        DateOnly? FechaCompra, decimal CantidadSugerida, decimal DemandaSemanalPrevista,
        List<decimal> UltimasSemanas, DateOnly? SemanasDesde, decimal Existencias, decimal EnCamino,
        int DiasEntrega, decimal? DiasParaAgotarse, string Explicacion);
    private sealed record EstadoDatosPython(
        int SemanasCompletas, int SemanasNecesarias, bool SePuedeEntrenar,
        DateOnly? PrimeraVenta, DateOnly? UltimaVenta, DateOnly? EntrenamientoPosibleDesde);
    private sealed record ModeloPython(
        string? Version, DateTime? Entrenado, decimal? MaeRedNeuronal, decimal? MaePromedioMovil, bool UsarRed);
}

internal sealed class ServicioInteligenteException(string mensaje) : Exception(mensaje);

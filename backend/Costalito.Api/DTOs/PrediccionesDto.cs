namespace Costalito.Api.DTOs;

/// <summary>Lo que Angular recibe en GET /api/intelligence.</summary>
public sealed record PrediccionesDto(
    // false cuando el servicio de Python no responde: la página muestra Mensaje y sigue funcionando
    bool Disponible,
    string? Mensaje,
    DateTime Consultado,
    // "red neuronal" o "promedio de 4 semanas (...)"
    string? Metodo,
    bool UsaRedNeuronal,
    EstadoDatosIaDto? Datos,
    ModeloIaDto? Modelo,
    IReadOnlyList<PrediccionProductoDto> Recomendaciones,
    IReadOnlyList<string> SinDatosSuficientes)
{
    public static PrediccionesDto NoDisponible(string mensaje, DateTime consultado) =>
        new(false, mensaje, consultado, null, false, null, null, [], []);
}

public sealed record EstadoDatosIaDto(
    int SemanasCompletas,
    int SemanasNecesarias,
    bool SePuedeEntrenar,
    DateOnly? PrimeraVenta,
    DateOnly? UltimaVenta,
    DateOnly? EntrenamientoPosibleDesde);

public sealed record ModeloIaDto(
    string? Version,
    DateTime? Entrenado,
    decimal? MaeRedNeuronal,
    decimal? MaePromedioMovil,
    bool UsarRed);

public sealed record PrediccionProductoDto(
    string Codigo,
    string Producto,
    string Metodo,
    // "agotado" | "alta" | "media" | "baja" | "sin movimiento"
    string Urgencia,
    bool ComprarAhora,
    string Cuando,
    DateOnly? FechaCompra,
    decimal CantidadSugerida,
    decimal DemandaSemanalPrevista,
    IReadOnlyList<decimal> UltimasSemanas,
    DateOnly? SemanasDesde,
    decimal Existencias,
    decimal EnCamino,
    int DiasEntrega,
    decimal? DiasParaAgotarse,
    string Explicacion);

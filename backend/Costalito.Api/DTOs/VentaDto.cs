using System.ComponentModel.DataAnnotations;

namespace Costalito.Api.DTOs;

public sealed record CrearVentaDto(
    int? ClienteId,
    [property: Required] string Pago,
    [property: Required, MinLength(1)] List<CrearLineaVentaDto> Lineas);

public sealed record CrearLineaVentaDto(
    [property: Range(1, int.MaxValue)] int ProductoId,
    [property: Range(typeof(decimal), "0.001", "999999999")] decimal Cantidad);

public sealed record LineaVentaDto(int ProductoId, string Nombre, decimal Cantidad, decimal Precio);

public sealed record VentaDto(
    int Id,
    string Codigo,
    string Cliente,
    int? ClienteId,
    DateTime Hora,
    decimal Total,
    string Pago,
    IReadOnlyList<LineaVentaDto> Lineas);

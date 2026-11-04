using System.ComponentModel.DataAnnotations;

namespace Costalito.Api.DTOs;

public sealed record CrearCompraDto(
    [property: Range(1, int.MaxValue)] int ProveedorId,
    [property: Range(1, int.MaxValue)] int ProductoId,
    [property: Range(typeof(decimal), "0.001", "999999999")] decimal Cantidad,
    [property: Range(typeof(decimal), "0.01", "999999999")] decimal CostoUnitario,
    [property: Required] string Estado,
    [property: StringLength(40)] string? Codigo = null,
    DateOnly? FechaVencimiento = null);

public sealed record CompraDto(
    int Id,
    string Codigo,
    int ProveedorId,
    DateOnly Fecha,
    decimal Total,
    string Estado,
    string Detalle,
    int? ProductoId,
    decimal? Cantidad);

public sealed record CambiarEstadoCompraDto([property: Required] string Estado);

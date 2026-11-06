using System.ComponentModel.DataAnnotations;

namespace Costalito.Api.DTOs;

public sealed class CrearVentaDto
{
    public int? ClienteId { get; init; }

    [Required]
    public string Pago { get; init; } = string.Empty;

    [Required, MinLength(1)]
    public List<CrearLineaVentaDto> Lineas { get; init; } = [];
}

public sealed class CrearLineaVentaDto
{
    public CrearLineaVentaDto() { }

    public CrearLineaVentaDto(int productoId, decimal cantidad)
    {
        ProductoId = productoId;
        Cantidad = cantidad;
    }

    [Range(1, int.MaxValue)]
    public int ProductoId { get; init; }

    [Range(typeof(decimal), "0.001", "999999999",
        ParseLimitsInInvariantCulture = true,
        ConvertValueInInvariantCulture = true)]
    public decimal Cantidad { get; init; }
}

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

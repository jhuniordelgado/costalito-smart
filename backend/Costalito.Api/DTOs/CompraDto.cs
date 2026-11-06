using System.ComponentModel.DataAnnotations;

namespace Costalito.Api.DTOs;

public sealed class CrearCompraDto
{
    [Range(1, int.MaxValue)]
    public int ProveedorId { get; init; }

    [Range(1, int.MaxValue)]
    public int ProductoId { get; init; }

    [Range(typeof(decimal), "0.001", "999999999",
        ParseLimitsInInvariantCulture = true,
        ConvertValueInInvariantCulture = true)]
    public decimal Cantidad { get; init; }

    [Range(typeof(decimal), "0.01", "999999999",
        ParseLimitsInInvariantCulture = true,
        ConvertValueInInvariantCulture = true)]
    public decimal CostoUnitario { get; init; }

    [Required]
    public string Estado { get; init; } = string.Empty;

    [StringLength(40)]
    public string? Codigo { get; init; }

    public DateOnly? FechaVencimiento { get; init; }
}

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

public sealed class CambiarEstadoCompraDto
{
    [Required]
    public string Estado { get; init; } = string.Empty;
}

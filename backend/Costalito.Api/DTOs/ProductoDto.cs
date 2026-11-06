using System.ComponentModel.DataAnnotations;

namespace Costalito.Api.DTOs;

public sealed class CrearProductoDto
{
    [Required, StringLength(30)]
    public string Codigo { get; init; } = string.Empty;

    [Required, StringLength(120)]
    public string Nombre { get; init; } = string.Empty;

    [Required, StringLength(80)]
    public string Categoria { get; init; } = string.Empty;

    [Required, StringLength(80)]
    public string Presentacion { get; init; } = string.Empty;

    [Required, StringLength(30)]
    public string UnidadMedida { get; init; } = string.Empty;

    [Range(typeof(decimal), "0", "999999999",
        ParseLimitsInInvariantCulture = true,
        ConvertValueInInvariantCulture = true)]
    public decimal Existencias { get; init; }

    [Range(typeof(decimal), "0", "999999999",
        ParseLimitsInInvariantCulture = true,
        ConvertValueInInvariantCulture = true)]
    public decimal StockMinimo { get; init; }

    [Range(typeof(decimal), "0.01", "999999999",
        ParseLimitsInInvariantCulture = true,
        ConvertValueInInvariantCulture = true)]
    public decimal PrecioCompra { get; init; }

    [Range(typeof(decimal), "0.01", "999999999",
        ParseLimitsInInvariantCulture = true,
        ConvertValueInInvariantCulture = true)]
    public decimal PrecioVenta { get; init; }

    [Range(typeof(decimal), "0.01", "999999999",
        ParseLimitsInInvariantCulture = true,
        ConvertValueInInvariantCulture = true)]
    public decimal PrecioMayorista { get; init; }
}

public sealed record ProductoDto(
    int Id,
    string Codigo,
    string Nombre,
    string Categoria,
    string Presentacion,
    string Unidad,
    decimal Existencias,
    decimal Minimo,
    decimal Precio,
    decimal PrecioCompra,
    decimal PrecioMayorista);

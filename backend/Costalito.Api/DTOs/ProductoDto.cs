using System.ComponentModel.DataAnnotations;

namespace Costalito.Api.DTOs;

public sealed record CrearProductoDto(
    [property: Required, StringLength(30)] string Codigo,
    [property: Required, StringLength(120)] string Nombre,
    [property: Required, StringLength(80)] string Categoria,
    [property: Required, StringLength(80)] string Presentacion,
    [property: Required, StringLength(30)] string UnidadMedida,
    [property: Range(typeof(decimal), "0", "999999999")] decimal Existencias,
    [property: Range(typeof(decimal), "0", "999999999")] decimal StockMinimo,
    [property: Range(typeof(decimal), "0.01", "999999999")] decimal PrecioCompra,
    [property: Range(typeof(decimal), "0.01", "999999999")] decimal PrecioVenta,
    [property: Range(typeof(decimal), "0.01", "999999999")] decimal PrecioMayorista);

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

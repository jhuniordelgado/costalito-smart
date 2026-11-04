using System.ComponentModel.DataAnnotations;

namespace Costalito.Api.DTOs;

public sealed record GraneroDto(
    [property: Required, StringLength(120)] string Nombre,
    [property: Required, StringLength(200)] string Direccion,
    [property: Required] string Apertura,
    [property: Required] string Cierre);

public sealed record DatosInicialesDto(
    GraneroDto Granero,
    IReadOnlyList<ProductoDto> Productos,
    IReadOnlyList<ClienteDto> Clientes,
    IReadOnlyList<ProveedorDto> Proveedores,
    IReadOnlyList<VentaDto> Ventas,
    IReadOnlyList<CompraDto> Compras,
    IReadOnlyList<AbonoDto> Abonos);

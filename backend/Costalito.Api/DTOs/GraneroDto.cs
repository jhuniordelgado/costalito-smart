using System.ComponentModel.DataAnnotations;

namespace Costalito.Api.DTOs;

public sealed class GraneroDto
{
    public GraneroDto() { }

    public GraneroDto(string nombre, string direccion, string apertura, string cierre)
    {
        Nombre = nombre;
        Direccion = direccion;
        Apertura = apertura;
        Cierre = cierre;
    }

    [Required, StringLength(120)]
    public string Nombre { get; init; } = string.Empty;

    [Required, StringLength(200)]
    public string Direccion { get; init; } = string.Empty;

    [Required]
    public string Apertura { get; init; } = string.Empty;

    [Required]
    public string Cierre { get; init; } = string.Empty;
}

public sealed record DatosInicialesDto(
    GraneroDto Granero,
    IReadOnlyList<ProductoDto> Productos,
    IReadOnlyList<ClienteDto> Clientes,
    IReadOnlyList<ProveedorDto> Proveedores,
    IReadOnlyList<VentaDto> Ventas,
    IReadOnlyList<CompraDto> Compras,
    IReadOnlyList<AbonoDto> Abonos);

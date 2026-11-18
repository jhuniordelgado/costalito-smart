using Costalito.Api.DTOs;

namespace Costalito.Api.Services;

public interface IGraneroService
{
    Task<DatosInicialesDto> ObtenerDatosInicialesAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<ProductoDto>> ObtenerProductosAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<ClienteDto>> ObtenerClientesAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<ProveedorDto>> ObtenerProveedoresAsync(CancellationToken cancellationToken);
    /// <summary>Ventas entre dos días, ambos incluidos. Sin fechas, todas.</summary>
    Task<IReadOnlyList<VentaDto>> ObtenerVentasAsync(DateOnly? desde, DateOnly? hasta, CancellationToken cancellationToken);
    Task<IReadOnlyList<CompraDto>> ObtenerComprasAsync(CancellationToken cancellationToken);
    /// <summary>Abonos entre dos días, ambos incluidos. Sin fechas, todos.</summary>
    Task<IReadOnlyList<AbonoDto>> ObtenerAbonosAsync(DateOnly? desde, DateOnly? hasta, CancellationToken cancellationToken);
    Task<GraneroDto> ObtenerGraneroAsync(CancellationToken cancellationToken);

    Task<ProductoDto> RegistrarProductoAsync(CrearProductoDto datos, CancellationToken cancellationToken);
    Task<ClienteDto> RegistrarClienteAsync(CrearClienteDto datos, CancellationToken cancellationToken);
    Task<ProveedorDto> RegistrarProveedorAsync(CrearProveedorDto datos, CancellationToken cancellationToken);
    Task<VentaDto> RegistrarVentaAsync(CrearVentaDto datos, CancellationToken cancellationToken);
    Task<CompraDto> RegistrarCompraAsync(CrearCompraDto datos, CancellationToken cancellationToken);
    Task CambiarEstadoCompraAsync(int id, string estado, CancellationToken cancellationToken);
    Task<AbonoDto> RegistrarAbonoAsync(CrearAbonoDto datos, CancellationToken cancellationToken);
    Task<GraneroDto> ActualizarGraneroAsync(GraneroDto datos, CancellationToken cancellationToken);
}

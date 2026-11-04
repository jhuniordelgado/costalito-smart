using Costalito.Api.DTOs;

namespace Costalito.Api.Services;

public interface IGraneroService
{
    Task<DatosInicialesDto> ObtenerDatosInicialesAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<ProductoDto>> ObtenerProductosAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<ClienteDto>> ObtenerClientesAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<ProveedorDto>> ObtenerProveedoresAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<VentaDto>> ObtenerVentasAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<CompraDto>> ObtenerComprasAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<AbonoDto>> ObtenerAbonosAsync(CancellationToken cancellationToken);
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

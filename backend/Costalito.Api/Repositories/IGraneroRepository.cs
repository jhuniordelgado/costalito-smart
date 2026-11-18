using Costalito.Api.Models;

namespace Costalito.Api.Repositories;

public interface IGraneroRepository
{
    Task<List<Producto>> ObtenerProductosAsync(CancellationToken cancellationToken);
    Task<List<Cliente>> ObtenerClientesAsync(CancellationToken cancellationToken);
    Task<List<Proveedor>> ObtenerProveedoresAsync(CancellationToken cancellationToken);
    /// <param name="desde">Incluido. Null = sin límite.</param>
    /// <param name="hastaSin">Excluido (el día siguiente al último que se quiere). Null = sin límite.</param>
    Task<List<Venta>> ObtenerVentasAsync(DateTime? desde, DateTime? hastaSin, CancellationToken cancellationToken);
    Task<List<Compra>> ObtenerComprasAsync(CancellationToken cancellationToken);
    Task<List<AbonoCliente>> ObtenerAbonosClientesAsync(DateTime? desde, DateTime? hastaSin, CancellationToken cancellationToken);
    Task<ConfiguracionNegocio?> ObtenerConfiguracionAsync(CancellationToken cancellationToken);

    Task<Producto?> BuscarProductoAsync(int id, CancellationToken cancellationToken);
    Task<Categoria?> BuscarCategoriaAsync(string nombre, CancellationToken cancellationToken);
    Task<Cliente?> BuscarClienteAsync(int id, CancellationToken cancellationToken);
    Task<Proveedor?> BuscarProveedorAsync(int id, CancellationToken cancellationToken);
    Task<Compra?> BuscarCompraAsync(int id, CancellationToken cancellationToken);
    Task<bool> ExisteCodigoProductoAsync(string codigo, CancellationToken cancellationToken);
    Task<bool> ExisteNombreClienteAsync(string nombre, CancellationToken cancellationToken);
    Task<bool> ExisteCedulaClienteAsync(string cedula, CancellationToken cancellationToken);
    Task<bool> ExisteNombreProveedorAsync(string nombre, CancellationToken cancellationToken);
    Task<decimal> SaldoClienteAsync(int clienteId, CancellationToken cancellationToken);

    Task GuardarProductoAsync(Producto producto, CancellationToken cancellationToken);
    Task GuardarClienteAsync(Cliente cliente, CancellationToken cancellationToken);
    Task GuardarProveedorAsync(Proveedor proveedor, CancellationToken cancellationToken);
    Task RegistrarVentaAsync(Venta venta, CancellationToken cancellationToken);
    Task RegistrarCompraAsync(Compra compra, CancellationToken cancellationToken);
    Task GuardarAbonoClienteAsync(AbonoCliente abono, CancellationToken cancellationToken);
    Task GuardarConfiguracionAsync(ConfiguracionNegocio configuracion, CancellationToken cancellationToken);
    Task GuardarCambiosAsync(CancellationToken cancellationToken);

    /// <summary>Olvida las entidades cargadas para volver a leerlas frescas de la base.</summary>
    void DescartarCambios();
}

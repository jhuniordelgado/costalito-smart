using Costalito.Api.Data;
using Costalito.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Costalito.Api.Repositories;

public sealed class GraneroRepository(CostalitoDbContext db) : IGraneroRepository
{
    public Task<List<Producto>> ObtenerProductosAsync(CancellationToken cancellationToken) =>
        db.Productos.AsNoTracking().Include(producto => producto.Categoria)
            .Where(producto => producto.Activo)
            .OrderBy(producto => producto.Nombre).ToListAsync(cancellationToken);

    public Task<List<Cliente>> ObtenerClientesAsync(CancellationToken cancellationToken) =>
        db.Clientes.AsNoTracking().Where(cliente => cliente.Activo)
            .OrderBy(cliente => cliente.Nombre).ToListAsync(cancellationToken);

    public Task<List<Proveedor>> ObtenerProveedoresAsync(CancellationToken cancellationToken) =>
        db.Proveedores.AsNoTracking().Where(proveedor => proveedor.Activo)
            .OrderBy(proveedor => proveedor.Nombre).ToListAsync(cancellationToken);

    public Task<List<Venta>> ObtenerVentasAsync(CancellationToken cancellationToken) =>
        db.Ventas.AsNoTracking().Include(venta => venta.Cliente)
            .Include(venta => venta.Detalles).ThenInclude(detalle => detalle.Producto)
            .OrderByDescending(venta => venta.FechaHora).ToListAsync(cancellationToken);

    public Task<List<Compra>> ObtenerComprasAsync(CancellationToken cancellationToken) =>
        db.Compras.AsNoTracking().Include(compra => compra.Detalles)
            .ThenInclude(detalle => detalle.Producto)
            .OrderByDescending(compra => compra.FechaFactura).ToListAsync(cancellationToken);

    public Task<List<AbonoCliente>> ObtenerAbonosClientesAsync(CancellationToken cancellationToken) =>
        db.AbonosClientes.AsNoTracking().OrderByDescending(abono => abono.FechaHora)
            .ToListAsync(cancellationToken);

    public Task<ConfiguracionNegocio?> ObtenerConfiguracionAsync(CancellationToken cancellationToken) =>
        db.ConfiguracionNegocio.AsNoTracking().SingleOrDefaultAsync(cancellationToken);

    public Task<Producto?> BuscarProductoAsync(int id, CancellationToken cancellationToken) =>
        db.Productos.SingleOrDefaultAsync(producto => producto.ProductoId == id && producto.Activo, cancellationToken);

    public Task<Categoria?> BuscarCategoriaAsync(string nombre, CancellationToken cancellationToken) =>
        db.Categorias.SingleOrDefaultAsync(categoria => categoria.Nombre == nombre && categoria.Activa, cancellationToken);

    public Task<Cliente?> BuscarClienteAsync(int id, CancellationToken cancellationToken) =>
        db.Clientes.SingleOrDefaultAsync(cliente => cliente.ClienteId == id && cliente.Activo, cancellationToken);

    public Task<Proveedor?> BuscarProveedorAsync(int id, CancellationToken cancellationToken) =>
        db.Proveedores.SingleOrDefaultAsync(proveedor => proveedor.ProveedorId == id && proveedor.Activo, cancellationToken);

    public Task<Compra?> BuscarCompraAsync(int id, CancellationToken cancellationToken) =>
        db.Compras.Include(compra => compra.Detalles)
            .SingleOrDefaultAsync(compra => compra.CompraId == id, cancellationToken);

    public Task<bool> ExisteCodigoProductoAsync(string codigo, CancellationToken cancellationToken) =>
        db.Productos.AnyAsync(producto => producto.Codigo == codigo, cancellationToken);

    public Task<bool> ExisteNombreClienteAsync(string nombre, CancellationToken cancellationToken) =>
        db.Clientes.AnyAsync(cliente => cliente.Nombre == nombre && cliente.Activo, cancellationToken);

    public Task<bool> ExisteCedulaClienteAsync(string cedula, CancellationToken cancellationToken) =>
        db.Clientes.AnyAsync(cliente => cliente.Cedula == cedula, cancellationToken);

    public Task<bool> ExisteNombreProveedorAsync(string nombre, CancellationToken cancellationToken) =>
        db.Proveedores.AnyAsync(proveedor => proveedor.Nombre == nombre, cancellationToken);

    public async Task<decimal> SaldoClienteAsync(int clienteId, CancellationToken cancellationToken)
    {
        var cliente = await db.Clientes.SingleOrDefaultAsync(
            item => item.ClienteId == clienteId, cancellationToken);
        if (cliente is null)
            return 0;

        var fiados = await db.Ventas.Where(venta => venta.ClienteId == clienteId
                && venta.MedioPago == "Fiado" && venta.Estado == "Vigente")
            .SumAsync(venta => (decimal?)venta.Total, cancellationToken) ?? 0;
        var abonos = await db.AbonosClientes.Where(abono => abono.ClienteId == clienteId)
            .SumAsync(abono => (decimal?)abono.Monto, cancellationToken) ?? 0;

        return cliente.SaldoInicial + fiados - abonos;
    }

    public async Task GuardarProductoAsync(Producto producto, CancellationToken cancellationToken)
    {
        db.Productos.Add(producto);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task GuardarClienteAsync(Cliente cliente, CancellationToken cancellationToken)
    {
        db.Clientes.Add(cliente);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task GuardarProveedorAsync(Proveedor proveedor, CancellationToken cancellationToken)
    {
        db.Proveedores.Add(proveedor);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task RegistrarVentaAsync(Venta venta, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        db.Ventas.Add(venta);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task RegistrarCompraAsync(Compra compra, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        db.Compras.Add(compra);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    public async Task GuardarAbonoClienteAsync(AbonoCliente abono, CancellationToken cancellationToken)
    {
        db.AbonosClientes.Add(abono);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task GuardarConfiguracionAsync(
        ConfiguracionNegocio configuracion, CancellationToken cancellationToken)
    {
        db.ConfiguracionNegocio.Update(configuracion);
        await db.SaveChangesAsync(cancellationToken);
    }

    public Task GuardarCambiosAsync(CancellationToken cancellationToken) =>
        db.SaveChangesAsync(cancellationToken);
}

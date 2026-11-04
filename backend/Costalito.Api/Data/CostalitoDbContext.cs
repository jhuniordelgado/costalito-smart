using Costalito.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Costalito.Api.Data;

public sealed class CostalitoDbContext(DbContextOptions<CostalitoDbContext> options) : DbContext(options)
{
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Producto> Productos => Set<Producto>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Proveedor> Proveedores => Set<Proveedor>();
    public DbSet<Venta> Ventas => Set<Venta>();
    public DbSet<DetalleVenta> DetallesVenta => Set<DetalleVenta>();
    public DbSet<Compra> Compras => Set<Compra>();
    public DbSet<DetalleCompra> DetallesCompra => Set<DetalleCompra>();
    public DbSet<AbonoCliente> AbonosClientes => Set<AbonoCliente>();
    public DbSet<AbonoProveedor> AbonosProveedores => Set<AbonoProveedor>();
    public DbSet<Gasto> Gastos => Set<Gasto>();
    public DbSet<AjusteInventario> AjustesInventario => Set<AjusteInventario>();
    public DbSet<ConfiguracionNegocio> ConfiguracionNegocio => Set<ConfiguracionNegocio>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Categoria>().ToTable("Categorias");
        modelBuilder.Entity<Producto>(entity =>
        {
            entity.ToTable("Productos");
            entity.HasIndex(producto => producto.Codigo).IsUnique();
            entity.Property(producto => producto.PrecioCompra).HasPrecision(12, 2);
            entity.Property(producto => producto.PrecioVenta).HasPrecision(12, 2);
            entity.Property(producto => producto.PrecioMayorista).HasPrecision(12, 2);
            entity.Property(producto => producto.Existencias).HasPrecision(12, 3);
            entity.Property(producto => producto.StockMinimo).HasPrecision(12, 3);
        });
        modelBuilder.Entity<Cliente>(entity =>
        {
            entity.ToTable("Clientes");
            entity.HasIndex(cliente => cliente.Cedula).IsUnique().HasFilter("[Cedula] IS NOT NULL");
            entity.Property(cliente => cliente.LimiteFiado).HasPrecision(12, 2);
            entity.Property(cliente => cliente.SaldoInicial).HasPrecision(12, 2);
        });
        modelBuilder.Entity<Proveedor>().ToTable("Proveedores");
        modelBuilder.Entity<Venta>(entity =>
        {
            entity.ToTable("Ventas");
            entity.HasIndex(venta => venta.Codigo).IsUnique();
            entity.Property(venta => venta.Total).HasPrecision(12, 2);
        });
        modelBuilder.Entity<DetalleVenta>(entity =>
        {
            entity.ToTable("DetallesVenta");
            entity.Property(detalle => detalle.Cantidad).HasPrecision(12, 3);
            entity.Property(detalle => detalle.PrecioUnitario).HasPrecision(12, 2);
            entity.Property(detalle => detalle.TotalLinea)
                .HasComputedColumnSql("CONVERT(decimal(12,2), Cantidad * PrecioUnitario)", stored: true);
        });
        modelBuilder.Entity<Compra>(entity =>
        {
            entity.ToTable("Compras");
            entity.HasIndex(compra => new { compra.ProveedorId, compra.Codigo }).IsUnique();
            entity.Property(compra => compra.Total).HasPrecision(12, 2);
        });
        modelBuilder.Entity<DetalleCompra>(entity =>
        {
            entity.ToTable("DetallesCompra");
            entity.Property(detalle => detalle.Cantidad).HasPrecision(12, 3);
            entity.Property(detalle => detalle.CostoUnitario).HasPrecision(12, 2);
            entity.Property(detalle => detalle.TotalLinea)
                .HasComputedColumnSql("CONVERT(decimal(12,2), Cantidad * CostoUnitario)", stored: true);
        });
        modelBuilder.Entity<AbonoCliente>(entity =>
        {
            entity.ToTable("AbonosClientes");
            entity.Property(abono => abono.Monto).HasPrecision(12, 2);
        });
        modelBuilder.Entity<AbonoProveedor>(entity =>
        {
            entity.ToTable("AbonosProveedores");
            entity.Property(abono => abono.Monto).HasPrecision(12, 2);
        });
        modelBuilder.Entity<Gasto>(entity =>
        {
            entity.ToTable("Gastos");
            entity.Property(gasto => gasto.Monto).HasPrecision(12, 2);
        });
        modelBuilder.Entity<AjusteInventario>(entity =>
        {
            entity.ToTable("AjustesInventario");
            entity.Property(ajuste => ajuste.Cantidad).HasPrecision(12, 3);
        });
        modelBuilder.Entity<ConfiguracionNegocio>(entity =>
        {
            entity.ToTable("ConfiguracionNegocio");
            entity.HasKey(configuracion => configuracion.ConfiguracionId);
        });
    }
}

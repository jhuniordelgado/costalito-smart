namespace Costalito.Api.Models;

public sealed class Categoria
{
    public int CategoriaId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public bool Activa { get; set; } = true;
    public List<Producto> Productos { get; set; } = [];
}

public sealed class Producto
{
    public int ProductoId { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public int CategoriaId { get; set; }
    public string Presentacion { get; set; } = string.Empty;
    public string UnidadMedida { get; set; } = string.Empty;
    public decimal Existencias { get; set; }
    public decimal StockMinimo { get; set; }
    public decimal PrecioCompra { get; set; }
    public decimal PrecioVenta { get; set; }
    public decimal PrecioMayorista { get; set; }
    public bool Activo { get; set; } = true;
    public Categoria? Categoria { get; set; }
    public List<DetalleVenta> DetallesVenta { get; set; } = [];
    public List<DetalleCompra> DetallesCompra { get; set; } = [];
}

public sealed class Cliente
{
    public int ClienteId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Cedula { get; set; }
    public string Telefono { get; set; } = string.Empty;
    public decimal LimiteFiado { get; set; }
    public decimal SaldoInicial { get; set; }
    public bool Activo { get; set; } = true;
    public List<Venta> Ventas { get; set; } = [];
    public List<AbonoCliente> Abonos { get; set; } = [];
}

public sealed class Proveedor
{
    public int ProveedorId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Contacto { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string ProductosQueSurte { get; set; } = string.Empty;
    public bool Activo { get; set; } = true;
    public List<Compra> Compras { get; set; } = [];
    public List<AbonoProveedor> Abonos { get; set; } = [];
}

public sealed class Venta
{
    public int VentaId { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public int? ClienteId { get; set; }
    public DateTime FechaHora { get; set; }
    public string MedioPago { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public string Estado { get; set; } = "Vigente";
    public Cliente? Cliente { get; set; }
    public List<DetalleVenta> Detalles { get; set; } = [];
    public List<AbonoCliente> Abonos { get; set; } = [];
}

public sealed class DetalleVenta
{
    public int DetalleVentaId { get; set; }
    public int VentaId { get; set; }
    public int ProductoId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal TotalLinea { get; private set; }
    public Venta? Venta { get; set; }
    public Producto? Producto { get; set; }
}

public sealed class Compra
{
    public int CompraId { get; set; }
    public string Codigo { get; set; } = string.Empty;
    public int ProveedorId { get; set; }
    public DateOnly FechaFactura { get; set; }
    public DateOnly? FechaRecepcion { get; set; }
    public string Estado { get; set; } = "En camino";
    public decimal Total { get; set; }
    public Proveedor? Proveedor { get; set; }
    public List<DetalleCompra> Detalles { get; set; } = [];
    public List<AbonoProveedor> Abonos { get; set; } = [];
}

public sealed class DetalleCompra
{
    public int DetalleCompraId { get; set; }
    public int CompraId { get; set; }
    public int ProductoId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal CostoUnitario { get; set; }
    public DateOnly? FechaVencimiento { get; set; }
    public decimal TotalLinea { get; private set; }
    public Compra? Compra { get; set; }
    public Producto? Producto { get; set; }
}

public sealed class AbonoCliente
{
    public int AbonoClienteId { get; set; }
    public int ClienteId { get; set; }
    public int? VentaId { get; set; }
    public DateTime FechaHora { get; set; }
    public decimal Monto { get; set; }
    public Cliente? Cliente { get; set; }
    public Venta? Venta { get; set; }
}

public sealed class AbonoProveedor
{
    public int AbonoProveedorId { get; set; }
    public int ProveedorId { get; set; }
    public int? CompraId { get; set; }
    public DateTime FechaHora { get; set; }
    public decimal Monto { get; set; }
    public Proveedor? Proveedor { get; set; }
    public Compra? Compra { get; set; }
}

public sealed class Gasto
{
    public int GastoId { get; set; }
    public string Concepto { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public DateTime FechaHora { get; set; }
    public decimal Monto { get; set; }
    public string? Observacion { get; set; }
}

public sealed class AjusteInventario
{
    public int AjusteInventarioId { get; set; }
    public int ProductoId { get; set; }
    public DateTime FechaHora { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public decimal Cantidad { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public Producto? Producto { get; set; }
}

public sealed class ConfiguracionNegocio
{
    public byte ConfiguracionId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Direccion { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public TimeOnly HoraApertura { get; set; }
    public TimeOnly HoraCierre { get; set; }
}

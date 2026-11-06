using Costalito.Api.DTOs;
using Costalito.Api.Models;
using Costalito.Api.Repositories;

namespace Costalito.Api.Services;

public sealed class GraneroService(IGraneroRepository repository) : IGraneroService
{
    private static readonly HashSet<string> MediosPago = ["Efectivo", "Nequi", "Fiado"];
    private static readonly HashSet<string> EstadosCompra = ["En camino", "Recibida", "Pendiente de pago"];

    public async Task<DatosInicialesDto> ObtenerDatosInicialesAsync(CancellationToken cancellationToken)
    {
        var granero = await ObtenerGraneroAsync(cancellationToken);
        var productos = await ObtenerProductosAsync(cancellationToken);
        var clientes = await ObtenerClientesAsync(cancellationToken);
        var proveedores = await ObtenerProveedoresAsync(cancellationToken);
        var ventas = await ObtenerVentasAsync(cancellationToken);
        var compras = await ObtenerComprasAsync(cancellationToken);
        var abonos = await ObtenerAbonosAsync(cancellationToken);

        return new DatosInicialesDto(granero, productos, clientes, proveedores, ventas, compras, abonos);
    }

    public async Task<IReadOnlyList<ProductoDto>> ObtenerProductosAsync(CancellationToken cancellationToken)
    {
        var productos = await repository.ObtenerProductosAsync(cancellationToken);
        return productos.Select(AProductoDto).ToList();
    }

    public async Task<IReadOnlyList<ClienteDto>> ObtenerClientesAsync(CancellationToken cancellationToken)
    {
        var clientes = await repository.ObtenerClientesAsync(cancellationToken);
        var resultado = new List<ClienteDto>(clientes.Count);
        foreach (var cliente in clientes)
        {
            var saldo = await repository.SaldoClienteAsync(cliente.ClienteId, cancellationToken);
            resultado.Add(AClienteDto(cliente, saldo));
        }
        return resultado;
    }

    public async Task<IReadOnlyList<ProveedorDto>> ObtenerProveedoresAsync(CancellationToken cancellationToken)
    {
        var proveedores = await repository.ObtenerProveedoresAsync(cancellationToken);
        return proveedores.Select(AProveedorDto).ToList();
    }

    public async Task<IReadOnlyList<VentaDto>> ObtenerVentasAsync(CancellationToken cancellationToken)
    {
        var ventas = await repository.ObtenerVentasAsync(cancellationToken);
        return ventas.Select(AVentaDto).ToList();
    }

    public async Task<IReadOnlyList<CompraDto>> ObtenerComprasAsync(CancellationToken cancellationToken)
    {
        var compras = await repository.ObtenerComprasAsync(cancellationToken);
        return compras.Select(ACompraDto).ToList();
    }

    public async Task<IReadOnlyList<AbonoDto>> ObtenerAbonosAsync(CancellationToken cancellationToken)
    {
        var abonos = await repository.ObtenerAbonosClientesAsync(cancellationToken);
        return abonos.Select(abono => new AbonoDto(
            abono.AbonoClienteId, abono.ClienteId, abono.Monto, abono.FechaHora)).ToList();
    }

    public async Task<GraneroDto> ObtenerGraneroAsync(CancellationToken cancellationToken)
    {
        var granero = await repository.ObtenerConfiguracionAsync(cancellationToken)
            ?? throw new ApiException("Falta registrar la configuración del granero.", 500);
        return AGraneroDto(granero);
    }

    public async Task<ProductoDto> RegistrarProductoAsync(
        CrearProductoDto datos, CancellationToken cancellationToken)
    {
        var codigo = datos.Codigo.Trim().ToUpperInvariant();
        if (await repository.ExisteCodigoProductoAsync(codigo, cancellationToken))
            throw new ApiException("Ya existe un producto con ese código.", 409);

        var categoria = await repository.BuscarCategoriaAsync(datos.Categoria.Trim(), cancellationToken)
            ?? throw new ApiException("Selecciona una categoría válida.", 400);
        var producto = new Producto
        {
            Codigo = codigo,
            Nombre = datos.Nombre.Trim(),
            CategoriaId = categoria.CategoriaId,
            Presentacion = datos.Presentacion.Trim(),
            UnidadMedida = datos.UnidadMedida.Trim(),
            Existencias = datos.Existencias,
            StockMinimo = datos.StockMinimo,
            PrecioCompra = datos.PrecioCompra,
            PrecioVenta = datos.PrecioVenta,
            PrecioMayorista = datos.PrecioMayorista,
        };

        await repository.GuardarProductoAsync(producto, cancellationToken);
        producto.Categoria = categoria;
        return AProductoDto(producto);
    }

    public async Task<ClienteDto> RegistrarClienteAsync(
        CrearClienteDto datos, CancellationToken cancellationToken)
    {
        var nombre = datos.Nombre.Trim();
        var cedula = string.IsNullOrWhiteSpace(datos.Cedula) ? null : datos.Cedula.Trim();
        if (await repository.ExisteNombreClienteAsync(nombre, cancellationToken))
            throw new ApiException("Ya existe un cliente con ese nombre.", 409);
        if (cedula is not null && await repository.ExisteCedulaClienteAsync(cedula, cancellationToken))
            throw new ApiException("Ya existe un cliente con esa cédula.", 409);

        var cliente = new Cliente
        {
            Nombre = nombre,
            Cedula = cedula,
            Telefono = datos.Telefono.Trim(),
            LimiteFiado = datos.LimiteFiado,
        };
        await repository.GuardarClienteAsync(cliente, cancellationToken);
        return AClienteDto(cliente, 0);
    }

    public async Task<ProveedorDto> RegistrarProveedorAsync(
        CrearProveedorDto datos, CancellationToken cancellationToken)
    {
        var nombre = datos.Nombre.Trim();
        if (await repository.ExisteNombreProveedorAsync(nombre, cancellationToken))
            throw new ApiException("Ya existe un proveedor con ese nombre.", 409);

        var proveedor = new Proveedor
        {
            Nombre = nombre,
            Contacto = datos.Contacto.Trim(),
            Telefono = datos.Telefono.Trim(),
            ProductosQueSurte = datos.ProductosQueSurte.Trim(),
        };
        await repository.GuardarProveedorAsync(proveedor, cancellationToken);
        return AProveedorDto(proveedor);
    }

    public async Task<VentaDto> RegistrarVentaAsync(
        CrearVentaDto datos, CancellationToken cancellationToken)
    {
        if (!MediosPago.Contains(datos.Pago))
            throw new ApiException("El medio de pago no es válido.", 400);

        Cliente? cliente = null;
        if (datos.Pago == "Fiado")
        {
            if (datos.ClienteId is null)
                throw new ApiException("Elige a qué cliente se le fía.", 400);
            cliente = await repository.BuscarClienteAsync(datos.ClienteId.Value, cancellationToken)
                ?? throw new ApiException("No encontramos ese cliente.", 404);
        }

        var lineas = new List<DetalleVenta>();
        foreach (var linea in datos.Lineas.GroupBy(item => item.ProductoId)
                     .Select(grupo => new CrearLineaVentaDto(grupo.Key, grupo.Sum(item => item.Cantidad))))
        {
            var producto = await repository.BuscarProductoAsync(linea.ProductoId, cancellationToken)
                ?? throw new ApiException("No encontramos uno de los productos.", 404);
            if (producto.Existencias < linea.Cantidad)
                throw new ApiException($"No hay suficientes existencias de {producto.Nombre}.", 400);

            producto.Existencias -= linea.Cantidad;
            lineas.Add(new DetalleVenta
            {
                Producto = producto,
                ProductoId = producto.ProductoId,
                Cantidad = linea.Cantidad,
                PrecioUnitario = producto.PrecioVenta,
            });
        }

        var total = lineas.Sum(linea => linea.Cantidad * linea.PrecioUnitario);
        if (cliente is not null)
        {
            var saldo = await repository.SaldoClienteAsync(cliente.ClienteId, cancellationToken);
            if (saldo + total > cliente.LimiteFiado)
                throw new ApiException($"{cliente.Nombre} superaría su límite de fiado.", 400);
        }

        var venta = new Venta
        {
            Codigo = $"V-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
            ClienteId = cliente?.ClienteId,
            Cliente = cliente,
            FechaHora = DateTime.Now,
            MedioPago = datos.Pago,
            Total = total,
            Detalles = lineas,
        };
        await repository.RegistrarVentaAsync(venta, cancellationToken);

        return AVentaDto(venta);
    }

    public async Task<CompraDto> RegistrarCompraAsync(
        CrearCompraDto datos, CancellationToken cancellationToken)
    {
        if (!EstadosCompra.Contains(datos.Estado))
            throw new ApiException("El estado de la compra no es válido.", 400);

        var proveedor = await repository.BuscarProveedorAsync(datos.ProveedorId, cancellationToken)
            ?? throw new ApiException("Selecciona un proveedor válido.", 404);
        var producto = await repository.BuscarProductoAsync(datos.ProductoId, cancellationToken)
            ?? throw new ApiException("Selecciona un producto válido.", 404);

        var detalle = new DetalleCompra
        {
            Producto = producto,
            ProductoId = producto.ProductoId,
            Cantidad = datos.Cantidad,
            CostoUnitario = datos.CostoUnitario,
            FechaVencimiento = datos.FechaVencimiento,
        };
        var compra = new Compra
        {
            Codigo = string.IsNullOrWhiteSpace(datos.Codigo)
                ? $"FC-{DateTime.UtcNow:yyyyMMddHHmmssfff}"
                : datos.Codigo.Trim(),
            ProveedorId = proveedor.ProveedorId,
            Proveedor = proveedor,
            FechaFactura = DateOnly.FromDateTime(DateTime.Today),
            FechaRecepcion = datos.Estado == "En camino" ? null : DateOnly.FromDateTime(DateTime.Today),
            Estado = datos.Estado,
            Total = datos.Cantidad * datos.CostoUnitario,
            Detalles = [detalle],
        };

        if (datos.Estado != "En camino")
            producto.Existencias += datos.Cantidad;

        await repository.RegistrarCompraAsync(compra, cancellationToken);
        return ACompraDto(compra);
    }

    public async Task CambiarEstadoCompraAsync(
        int id, string estado, CancellationToken cancellationToken)
    {
        if (!EstadosCompra.Contains(estado))
            throw new ApiException("El estado de la compra no es válido.", 400);

        var compra = await repository.BuscarCompraAsync(id, cancellationToken)
            ?? throw new ApiException("No encontramos esa compra.", 404);
        if (compra.Estado != "En camino" && estado == "En camino")
            throw new ApiException("Una compra cerrada no puede volver a estar en camino.", 400);

        if (compra.Estado == "En camino" && estado != "En camino")
        {
            foreach (var detalle in compra.Detalles)
            {
                var producto = await repository.BuscarProductoAsync(detalle.ProductoId, cancellationToken);
                if (producto is not null)
                    producto.Existencias += detalle.Cantidad;
            }
            compra.FechaRecepcion = DateOnly.FromDateTime(DateTime.Today);
        }

        compra.Estado = estado;
        await repository.GuardarCambiosAsync(cancellationToken);
    }

    public async Task<AbonoDto> RegistrarAbonoAsync(
        CrearAbonoDto datos, CancellationToken cancellationToken)
    {
        var cliente = await repository.BuscarClienteAsync(datos.ClienteId, cancellationToken)
            ?? throw new ApiException("No encontramos ese cliente.", 404);
        var saldo = await repository.SaldoClienteAsync(cliente.ClienteId, cancellationToken);
        if (datos.Monto > saldo)
            throw new ApiException($"El abono no puede pasar del saldo ({saldo:C0}).", 400);

        var abono = new AbonoCliente
        {
            ClienteId = cliente.ClienteId,
            FechaHora = DateTime.Now,
            Monto = datos.Monto,
        };
        await repository.GuardarAbonoClienteAsync(abono, cancellationToken);
        return new AbonoDto(abono.AbonoClienteId, abono.ClienteId, abono.Monto, abono.FechaHora);
    }

    public async Task<GraneroDto> ActualizarGraneroAsync(
        GraneroDto datos, CancellationToken cancellationToken)
    {
        var configuracion = await repository.ObtenerConfiguracionAsync(cancellationToken)
            ?? throw new ApiException("Falta registrar la configuración del granero.", 500);
        configuracion.Nombre = datos.Nombre.Trim();
        configuracion.Direccion = datos.Direccion.Trim();
        if (!TimeOnly.TryParseExact(datos.Apertura, "HH:mm", out var apertura)
            || !TimeOnly.TryParseExact(datos.Cierre, "HH:mm", out var cierre))
            throw new ApiException("Las horas deben tener el formato HH:mm.", 400);
        configuracion.HoraApertura = apertura;
        configuracion.HoraCierre = cierre;
        await repository.GuardarConfiguracionAsync(configuracion, cancellationToken);
        return AGraneroDto(configuracion);
    }

    private static ProductoDto AProductoDto(Producto producto) => new(
        producto.ProductoId, producto.Codigo, producto.Nombre, producto.Categoria?.Nombre ?? string.Empty,
        producto.Presentacion, producto.UnidadMedida, producto.Existencias, producto.StockMinimo,
        producto.PrecioVenta, producto.PrecioCompra, producto.PrecioMayorista);

    private static ClienteDto AClienteDto(Cliente cliente, decimal saldo) => new(
        cliente.ClienteId, cliente.Nombre, cliente.Cedula, cliente.Telefono,
        cliente.LimiteFiado, cliente.SaldoInicial, saldo);

    private static ProveedorDto AProveedorDto(Proveedor proveedor) => new(
        proveedor.ProveedorId, proveedor.Nombre, proveedor.Contacto,
        proveedor.Telefono, proveedor.ProductosQueSurte);

    private static VentaDto AVentaDto(Venta venta) => new(
        venta.VentaId, $"#V-{venta.VentaId}", venta.Cliente?.Nombre ?? "Cliente mostrador",
        venta.ClienteId, venta.FechaHora, venta.Total, venta.MedioPago,
        venta.Detalles.Select(detalle => new LineaVentaDto(
            detalle.ProductoId, detalle.Producto?.Nombre ?? string.Empty,
            detalle.Cantidad, detalle.PrecioUnitario)).ToList());

    private static CompraDto ACompraDto(Compra compra)
    {
        var detalle = string.Join(", ", compra.Detalles.Select(item =>
            $"{item.Producto?.Nombre ?? "Producto"} × {item.Cantidad:g}"));
        var primeraLinea = compra.Detalles.FirstOrDefault();
        return new CompraDto(
            compra.CompraId, $"#C-{compra.Codigo}", compra.ProveedorId,
            compra.FechaFactura, compra.Total, compra.Estado, detalle,
            compra.Detalles.Count == 1 ? primeraLinea?.ProductoId : null,
            compra.Detalles.Count == 1 ? primeraLinea?.Cantidad : compra.Detalles.Sum(item => item.Cantidad));
    }

    private static GraneroDto AGraneroDto(ConfiguracionNegocio configuracion) => new(
        configuracion.Nombre, configuracion.Direccion,
        configuracion.HoraApertura.ToString("HH:mm"), configuracion.HoraCierre.ToString("HH:mm"));
}

using Costalito.Api.DTOs;
using Costalito.Api.Models;
using Costalito.Api.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Costalito.Api.Services;

public sealed class GraneroService(
    IGraneroRepository repository,
    IRelojGranero reloj,
    IOptions<OpcionesGranero> opciones) : IGraneroService
{
    private static readonly HashSet<string> MediosPago = ["Efectivo", "Nequi", "Fiado"];
    private static readonly HashSet<string> EstadosCompra = ["En camino", "Recibida", "Pendiente de pago"];
    private const int IntentosPorConflicto = 5;

    public async Task<DatosInicialesDto> ObtenerDatosInicialesAsync(CancellationToken cancellationToken)
    {
        // Ventas y abonos crecen todos los días: al abrir la aplicación solo viajan los
        // recientes. Los saldos no dependen de esto porque la API los calcula con todo el historial.
        var desde = reloj.Hoy.AddDays(-(opciones.Value.DiasHistorialInicial - 1));

        var granero = await ObtenerGraneroAsync(cancellationToken);
        var productos = await ObtenerProductosAsync(cancellationToken);
        var clientes = await ObtenerClientesAsync(cancellationToken);
        var proveedores = await ObtenerProveedoresAsync(cancellationToken);
        var ventas = await ObtenerVentasAsync(desde, null, cancellationToken);
        var compras = await ObtenerComprasAsync(cancellationToken);
        var abonos = await ObtenerAbonosAsync(desde, null, cancellationToken);

        return new DatosInicialesDto(granero, productos, clientes, proveedores, ventas, compras, abonos, desde);
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

    public async Task<IReadOnlyList<VentaDto>> ObtenerVentasAsync(
        DateOnly? desde, DateOnly? hasta, CancellationToken cancellationToken)
    {
        var (inicio, finSin) = Periodo(desde, hasta);
        var ventas = await repository.ObtenerVentasAsync(inicio, finSin, cancellationToken);
        return ventas.Select(AVentaDto).ToList();
    }

    public async Task<IReadOnlyList<CompraDto>> ObtenerComprasAsync(CancellationToken cancellationToken)
    {
        var compras = await repository.ObtenerComprasAsync(cancellationToken);
        return compras.Select(ACompraDto).ToList();
    }

    public async Task<IReadOnlyList<AbonoDto>> ObtenerAbonosAsync(
        DateOnly? desde, DateOnly? hasta, CancellationToken cancellationToken)
    {
        var (inicio, finSin) = Periodo(desde, hasta);
        var abonos = await repository.ObtenerAbonosClientesAsync(inicio, finSin, cancellationToken);
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

    public Task<VentaDto> RegistrarVentaAsync(
        CrearVentaDto datos, CancellationToken cancellationToken) =>
        ConReintentoAsync(() => IntentarRegistrarVentaAsync(datos, cancellationToken));

    private async Task<VentaDto> IntentarRegistrarVentaAsync(
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

        var ahora = reloj.Ahora;
        var total = lineas.Sum(linea => linea.Cantidad * linea.PrecioUnitario);
        if (cliente is not null)
        {
            var saldo = await repository.SaldoClienteAsync(cliente.ClienteId, cancellationToken);
            if (saldo + total > cliente.LimiteFiado)
                throw new ApiException($"{cliente.Nombre} superaría su límite de fiado.", 400);
            // Se actualiza la fila del cliente para que su RowVersion detecte otro fiado o
            // abono simultáneo que haya validado el saldo con el mismo dato.
            cliente.UltimoMovimiento = ahora;
        }

        var venta = new Venta
        {
            Codigo = $"V-{ahora:yyyyMMddHHmmssfff}",
            ClienteId = cliente?.ClienteId,
            Cliente = cliente,
            FechaHora = ahora,
            MedioPago = datos.Pago,
            Total = total,
            Detalles = lineas,
        };
        await repository.RegistrarVentaAsync(venta, cancellationToken);

        return AVentaDto(venta);
    }

    public Task<CompraDto> RegistrarCompraAsync(
        CrearCompraDto datos, CancellationToken cancellationToken) =>
        ConReintentoAsync(() => IntentarRegistrarCompraAsync(datos, cancellationToken));

    private async Task<CompraDto> IntentarRegistrarCompraAsync(
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
                ? $"FC-{reloj.Ahora:yyyyMMddHHmmssfff}"
                : datos.Codigo.Trim(),
            ProveedorId = proveedor.ProveedorId,
            Proveedor = proveedor,
            FechaFactura = reloj.Hoy,
            FechaRecepcion = datos.Estado == "En camino" ? null : reloj.Hoy,
            Estado = datos.Estado,
            Total = datos.Cantidad * datos.CostoUnitario,
            Detalles = [detalle],
        };

        if (datos.Estado != "En camino")
            producto.Existencias += datos.Cantidad;

        await repository.RegistrarCompraAsync(compra, cancellationToken);
        return ACompraDto(compra);
    }

    public Task CambiarEstadoCompraAsync(
        int id, string estado, CancellationToken cancellationToken) =>
        ConReintentoAsync(async () =>
        {
            await IntentarCambiarEstadoCompraAsync(id, estado, cancellationToken);
            return true;
        });

    private async Task IntentarCambiarEstadoCompraAsync(
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
            compra.FechaRecepcion = reloj.Hoy;
        }

        compra.Estado = estado;
        await repository.GuardarCambiosAsync(cancellationToken);
    }

    public Task<AbonoDto> RegistrarAbonoAsync(
        CrearAbonoDto datos, CancellationToken cancellationToken) =>
        ConReintentoAsync(() => IntentarRegistrarAbonoAsync(datos, cancellationToken));

    private async Task<AbonoDto> IntentarRegistrarAbonoAsync(
        CrearAbonoDto datos, CancellationToken cancellationToken)
    {
        var cliente = await repository.BuscarClienteAsync(datos.ClienteId, cancellationToken)
            ?? throw new ApiException("No encontramos ese cliente.", 404);
        var saldo = await repository.SaldoClienteAsync(cliente.ClienteId, cancellationToken);
        if (datos.Monto > saldo)
            throw new ApiException($"El abono no puede pasar del saldo ({saldo:C0}).", 400);

        var ahora = reloj.Ahora;
        cliente.UltimoMovimiento = ahora;
        var abono = new AbonoCliente
        {
            ClienteId = cliente.ClienteId,
            FechaHora = ahora,
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

    /// <summary>
    /// Si otra petición cambió un producto entre la lectura y el guardado (el RowVersion
    /// ya no coincide), se descarta lo cargado y se repite la operación completa con datos
    /// frescos: así la venta vuelve a revisar las existencias reales y una compra que ya se
    /// recibió no suma el stock dos veces. Si el conflicto persiste, el middleware responde 409.
    /// </summary>
    private async Task<T> ConReintentoAsync<T>(Func<Task<T>> operacion)
    {
        for (var intento = 1; ; intento++)
        {
            try
            {
                return await operacion();
            }
            catch (DbUpdateConcurrencyException) when (intento < IntentosPorConflicto)
            {
                repository.DescartarCambios();
                // Espera corta y aleatoria para que las peticiones que chocaron no vuelvan
                // a leer y guardar exactamente al mismo tiempo.
                await Task.Delay(Random.Shared.Next(10, 40) * intento);
            }
        }
    }

    /// <summary>Días incluidos → [inicio del primer día, inicio del día siguiente al último).</summary>
    private static (DateTime? Inicio, DateTime? FinSin) Periodo(DateOnly? desde, DateOnly? hasta)
    {
        if (desde is not null && hasta is not null && desde > hasta)
            throw new ApiException("La fecha inicial no puede ser posterior a la final.", 400);
        return (desde?.ToDateTime(TimeOnly.MinValue), hasta?.AddDays(1).ToDateTime(TimeOnly.MinValue));
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
            compra.CompraId, $"#{compra.Codigo}", compra.ProveedorId,
            compra.FechaFactura, compra.Total, compra.Estado, detalle,
            compra.Detalles.Count == 1 ? primeraLinea?.ProductoId : null,
            compra.Detalles.Count == 1 ? primeraLinea?.Cantidad : compra.Detalles.Sum(item => item.Cantidad));
    }

    private static GraneroDto AGraneroDto(ConfiguracionNegocio configuracion) => new(
        configuracion.Nombre, configuracion.Direccion,
        configuracion.HoraApertura.ToString("HH:mm"), configuracion.HoraCierre.ToString("HH:mm"));
}

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import {
  Abono, Cliente, Compra, EstadoCompra, EstadoStock, Granero, LineaVenta, MedioPago,
  NuevaCompra, NuevaVenta, NuevoCliente, NuevoProducto, NuevoProveedor, Producto,
  Proveedor, Senal, Venta,
} from './modelos';
import { pesos, plural } from './formato';

const API_URL = 'http://localhost:5256/api';

interface DatosIniciales {
  granero: Granero;
  productos: Producto[];
  clientes: Cliente[];
  proveedores: Proveedor[];
  ventas: Array<Omit<Venta, 'hora'> & { hora: string }>;
  compras: Array<Omit<Compra, 'fecha'> & { fecha: string }>;
  abonos: Array<Omit<Abono, 'fecha'> & { fecha: string }>;
}

export function estadoStock(producto: Producto): EstadoStock {
  if (producto.existencias <= 0) return 'Agotado';
  if (producto.existencias <= producto.minimo) return 'Stock bajo';
  if (producto.existencias <= producto.minimo * 1.5) return 'Por revisar';
  return 'Disponible';
}

@Injectable({ providedIn: 'root' })
export class DatosGranero {
  private readonly http = inject(HttpClient);

  readonly granero = signal<Granero>({ nombre: '', direccion: '', apertura: '', cierre: '' });
  readonly productos = signal<Producto[]>([]);
  readonly clientes = signal<Cliente[]>([]);
  readonly proveedores = signal<Proveedor[]>([]);
  readonly ventas = signal<Venta[]>([]);
  readonly compras = signal<Compra[]>([]);
  readonly abonos = signal<Abono[]>([]);
  readonly cargando = signal(true);
  readonly errorConexion = signal('');

  constructor() {
    void this.cargar();
  }

  readonly ventasHoy = computed(() => this.ventas().filter((venta) => this.esHoy(venta.hora)));
  readonly ventasAyer = computed(() => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    return this.ventas().filter((venta) => this.esMismoDia(venta.hora, ayer));
  });
  readonly totalHoy = computed(() => this.ventasHoy().reduce((total, venta) => total + venta.total, 0));
  readonly cantidadHoy = computed(() => this.ventasHoy().length);
  readonly ticketPromedio = computed(() =>
    this.cantidadHoy() ? Math.round(this.totalHoy() / this.cantidadHoy()) : 0);
  readonly ventasAyerHastaAhora = computed(() =>
    this.ventasAyer().reduce((total, venta) => total + venta.total, 0));
  readonly diferenciaAyer = computed(() => this.totalHoy() - this.ventasAyerHastaAhora());
  readonly porcentajeAyer = computed(() => this.ventasAyerHastaAhora()
    ? Math.round((this.diferenciaAyer() / this.ventasAyerHastaAhora()) * 100)
    : 0);

  readonly ritmo = computed(() => {
    const horas = Array.from({ length: 9 }, (_, index) => index + 8);
    const bloques = horas.map((hora) => ({ hora, total: 0 }));

    for (const venta of this.ventasHoy()) {
      const indice = Math.min(Math.max(venta.hora.getHours() - 8, 0), bloques.length - 1);
      bloques[indice].total += venta.total;
    }

    const mayor = Math.max(...bloques.map((bloque) => bloque.total), 1);
    return bloques.map((bloque) => ({
      ...bloque,
      porcentaje: Math.round((bloque.total / mayor) * 100),
    }));
  });

  readonly topProductos = computed(() => {
    const vendidos = new Map<number, { nombre: string; unidades: number; monto: number }>();
    for (const venta of this.ventasHoy()) {
      for (const linea of venta.lineas) {
        const resumen = vendidos.get(linea.productoId)
          ?? { nombre: linea.nombre, unidades: 0, monto: 0 };
        resumen.unidades += linea.cantidad;
        resumen.monto += linea.cantidad * linea.precio;
        vendidos.set(linea.productoId, resumen);
      }
    }
    return [...vendidos.values()].sort((a, b) => b.unidades - a.unidades);
  });

  readonly unidadesVendidas = computed(() =>
    this.topProductos().reduce((total, producto) => total + producto.unidades, 0));

  readonly pagosPorMedio = computed(() =>
    (['Efectivo', 'Nequi', 'Fiado'] as MedioPago[]).map((medio) => {
      const ventas = this.ventasHoy().filter((venta) => venta.pago === medio);
      return {
        medio,
        cantidad: ventas.length,
        total: ventas.reduce((suma, venta) => suma + venta.total, 0),
      };
    }));

  readonly productosBajos = computed(() => this.productos()
    .filter((producto) => ['Stock bajo', 'Agotado'].includes(estadoStock(producto)))
    .sort((a, b) => a.existencias / Math.max(a.minimo, 1) - b.existencias / Math.max(b.minimo, 1)));

  readonly saldos = computed(() => {
    const saldos = new Map<number, number>();
    for (const cliente of this.clientes()) saldos.set(cliente.id, cliente.saldoInicial);
    for (const venta of this.ventas()) {
      if (venta.pago === 'Fiado' && venta.clienteId !== null) {
        saldos.set(venta.clienteId, (saldos.get(venta.clienteId) ?? 0) + venta.total);
      }
    }
    for (const abono of this.abonos()) {
      saldos.set(abono.clienteId, (saldos.get(abono.clienteId) ?? 0) - abono.monto);
    }
    return saldos;
  });

  saldoDe(clienteId: number): number {
    return this.saldos().get(clienteId) ?? 0;
  }

  readonly clientesConSaldo = computed(() => this.clientes()
    .filter((cliente) => this.saldoDe(cliente.id) > 0)
    .sort((a, b) => this.saldoDe(b.id) - this.saldoDe(a.id)));

  readonly clientesExcedidos = computed(() => this.clientes()
    .filter((cliente) => this.saldoDe(cliente.id) > cliente.limite));

  readonly totalPorCobrar = computed(() => this.clientes()
    .reduce((total, cliente) => total + Math.max(this.saldoDe(cliente.id), 0), 0));

  readonly comprasPendientes = computed(() => this.compras()
    .filter((compra) => compra.estado !== 'Recibida'));

  readonly comprasUltimos30Dias = computed(() => {
    const desde = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return this.compras().filter((compra) => compra.fecha.getTime() >= desde)
      .reduce((total, compra) => total + compra.total, 0);
  });

  readonly senales = computed<Senal[]>(() => {
    const senales: Senal[] = [];
    const bajos = this.productosBajos();
    if (bajos.length) {
      const primero = bajos[0];
      const otros = bajos.length - 1;
      senales.push({
        clave: 'existencias',
        rotulo: 'Existencias',
        titulo: `Quedan pocas unidades de ${primero.nombre}.`,
        detalle: `Quedan ${primero.existencias} ${primero.unidad}. ` + (otros
          ? `Hay ${otros} ${plural(otros, 'producto', 'productos')} más por reponer.`
          : 'Evalúa el pedido con tu proveedor antes del próximo turno.'),
        ruta: '/inventario',
        enlace: 'Abrir inventario',
      });
    }

    const excedidos = this.clientesExcedidos();
    const conSaldo = this.clientesConSaldo();
    if (excedidos.length) {
      const otros = conSaldo.length - 1;
      senales.push({
        clave: 'fiados',
        rotulo: 'Fiados',
        titulo: 'Hay saldos que merecen una llamada.',
        detalle: `${excedidos[0].nombre} superó su límite de fiado` + (otros > 0
          ? ` y ${otros} ${plural(otros, 'cliente más tiene', 'clientes más tienen')} pagos pendientes.`
          : '.'),
        ruta: '/creditos',
        enlace: 'Ver fiados y pagos',
      });
    } else if (conSaldo.length) {
      senales.push({
        clave: 'fiados',
        rotulo: 'Fiados',
        titulo: 'Hay fiados por cobrar.',
        detalle: `${conSaldo.length} ${plural(conSaldo.length, 'cliente tiene', 'clientes tienen')} saldo pendiente: ${pesos(this.totalPorCobrar())} en total.`,
        ruta: '/creditos',
        enlace: 'Ver fiados y pagos',
      });
    }

    const top = this.topProductos();
    if (top.length) {
      senales.push({
        clave: 'movimiento',
        rotulo: 'Movimiento',
        titulo: `${top[0].nombre} es lo que más se mueve hoy.`,
        detalle: `Van ${top[0].unidades} unidades vendidas. Revisa el detalle para decidir si necesitas reforzar la exhibición.`,
        ruta: '/ventas',
        enlace: 'Ver ventas del día',
      });
    }

    const pendientes = this.comprasPendientes();
    if (pendientes.length) {
      senales.push({
        clave: 'compras',
        rotulo: 'Compras',
        titulo: `Hay ${pendientes.length} ${plural(pendientes.length, 'compra', 'compras')} sin cerrar.`,
        detalle: `La compra ${pendientes[0].codigo} está ${pendientes[0].estado.toLowerCase()}. Ciérrala para que el inventario y las cuentas queden al día.`,
        ruta: '/compras',
        enlace: 'Abrir compras',
      });
    }
    return senales;
  });

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.errorConexion.set('');
    try {
      const datos = await this.enviar(this.http.get<DatosIniciales>(`${API_URL}/bootstrap`));
      this.granero.set(datos.granero);
      this.productos.set(datos.productos);
      this.clientes.set(datos.clientes);
      this.proveedores.set(datos.proveedores);
      this.ventas.set(datos.ventas.map((venta) => ({ ...venta, hora: new Date(venta.hora) })));
      this.compras.set(datos.compras.map((compra) => ({ ...compra, fecha: this.parseFechaCompra(compra.fecha) })));
      this.abonos.set(datos.abonos.map((abono) => ({ ...abono, fecha: new Date(abono.fecha) })));
    } catch (error) {
      this.errorConexion.set(this.detalleError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  async registrarVenta(datos: NuevaVenta): Promise<Venta> {
    const respuesta = await this.enviar(
      this.http.post<Omit<Venta, 'hora'> & { hora: string }>(`${API_URL}/sales`, datos),
    );
    const venta = { ...respuesta, hora: new Date(respuesta.hora) };
    this.ventas.update((ventas) => [venta, ...ventas]);
    for (const linea of venta.lineas) {
      this.productos.update((productos) => productos.map((producto) =>
        producto.id === linea.productoId
          ? { ...producto, existencias: producto.existencias - linea.cantidad }
          : producto,
      ));
    }
    return venta;
  }

  async agregarProducto(datos: NuevoProducto): Promise<Producto> {
    const payload = {
      codigo: datos.codigo,
      nombre: datos.nombre,
      categoria: datos.categoria,
      presentacion: datos.presentacion,
      unidadMedida: datos.unidad,
      existencias: datos.existencias,
      stockMinimo: datos.minimo,
      precioCompra: datos.precioCompra,
      precioVenta: datos.precio,
      precioMayorista: datos.precioMayorista,
    };
    const producto = await this.enviar(this.http.post<Producto>(`${API_URL}/products`, payload));
    this.productos.update((productos) => [...productos, producto]);
    return producto;
  }

  async registrarCompra(datos: NuevaCompra): Promise<Compra> {
    const respuesta = await this.enviar(
      this.http.post<Omit<Compra, 'fecha'> & { fecha: string }>(`${API_URL}/purchases`, datos),
    );
    const compra = { ...respuesta, fecha: new Date(respuesta.fecha) };
    this.compras.update((compras) => [compra, ...compras]);
    if (compra.estado !== 'En camino' && compra.productoId && compra.cantidad) {
      this.sumarExistencias(compra.productoId, compra.cantidad);
    }
    return compra;
  }

  async cambiarEstadoCompra(id: number, estado: EstadoCompra): Promise<void> {
    await this.enviar(this.http.patch(`${API_URL}/purchases/${id}`, { estado }));
    const compra = this.compras().find((item) => item.id === id);
    if (compra?.estado === 'En camino' && estado !== 'En camino' && compra.productoId && compra.cantidad) {
      this.sumarExistencias(compra.productoId, compra.cantidad);
    }
    this.compras.update((compras) => compras.map((item) =>
      item.id === id ? { ...item, estado } : item,
    ));
  }

  async registrarCliente(datos: NuevoCliente): Promise<Cliente> {
    const payload = {
      nombre: datos.nombre,
      cedula: datos.cedula || null,
      telefono: datos.telefono,
      limiteFiado: datos.limite,
    };
    const cliente = await this.enviar(this.http.post<Cliente>(`${API_URL}/customers`, payload));
    this.clientes.update((clientes) => [...clientes, cliente]);
    return cliente;
  }

  async registrarProveedor(datos: NuevoProveedor): Promise<Proveedor> {
    const payload = {
      nombre: datos.nombre,
      contacto: datos.contacto,
      telefono: datos.telefono,
      productosQueSurte: datos.surte,
    };
    const proveedor = await this.enviar(this.http.post<Proveedor>(`${API_URL}/suppliers`, payload));
    this.proveedores.update((proveedores) => [...proveedores, proveedor]);
    return proveedor;
  }

  async registrarAbono(clienteId: number, monto: number): Promise<Abono> {
    const respuesta = await this.enviar(
      this.http.post<Omit<Abono, 'fecha'> & { fecha: string }>(`${API_URL}/payments`, { clienteId, monto }),
    );
    const abono = { ...respuesta, fecha: new Date(respuesta.fecha) };
    this.abonos.update((abonos) => [...abonos, abono]);
    return abono;
  }

  async guardarGranero(datos: Granero): Promise<void> {
    const granero = await this.enviar(this.http.put<Granero>(`${API_URL}/settings`, datos));
    this.granero.set(granero);
  }

  private async enviar<T>(request: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (error) {
      throw new Error(this.detalleError(error));
    }
  }

  private detalleError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const detalle = error.error?.error;
      if (typeof detalle === 'string') return detalle;
      if (error.status === 0) {
        return 'No hay conexión con el servidor. Revisa que el backend esté iniciado e inténtalo de nuevo.';
      }
      return 'No se pudo completar la operación. Inténtalo de nuevo.';
    }
    return error instanceof Error ? error.message : 'Ocurrió un problema inesperado.';
  }

  private esHoy(fecha: Date): boolean {
    return this.esMismoDia(fecha, new Date());
  }

  private esMismoDia(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  private parseFechaCompra(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private sumarExistencias(productoId: number, cantidad: number): void {
    this.productos.update((productos) => productos.map((producto) =>
      producto.id === productoId
        ? { ...producto, existencias: producto.existencias + cantidad }
        : producto,
    ));
  }
}

import { Injectable, computed, signal } from '@angular/core';
import {
  Abono, Cliente, Compra, EstadoCompra, EstadoStock, Granero, LineaVenta, MedioPago,
  NuevaCompra, NuevaVenta, NuevoCliente, NuevoProducto, NuevoProveedor, Producto,
  Proveedor, Senal, Venta,
} from './modelos';
import { pesos, plural } from './formato';

/* ------------------------------------------------------------------ */
/*  Datos de ejemplo para que la app se vea viva mientras no hay       */
/*  backend. Cuando la API esté lista, esto se cambia por lo que ella  */
/*  responda (los métodos que devuelven promesas están más abajo).     */
/* ------------------------------------------------------------------ */

// Una fecha de hoy a una hora exacta: hoyA(9, 30) es "hoy a las 9:30 a. m."
function hoyA(hora: number, minuto: number): Date {
  const fecha = new Date();
  fecha.setHours(hora, minuto, 0, 0);
  return fecha;
}

// Una fecha de hace unos días (para las compras y abonos viejos)
function haceDias(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  fecha.setHours(10, 0, 0, 0);
  return fecha;
}

// El estado sale de comparar lo que hay con el mínimo que definió el tendero.
// "Por revisar" es cuando ya se está acercando (hasta 1,5 veces el mínimo).
export function estadoStock(p: Producto): EstadoStock {
  if (p.existencias <= 0) return 'Agotado';
  if (p.existencias <= p.minimo) return 'Stock bajo';
  if (p.existencias <= p.minimo * 1.5) return 'Por revisar';
  return 'Disponible';
}

function productosIniciales(): Producto[] {
  return [
    { id: 1, nombre: 'Arroz Diana 500 g', categoria: 'Granos y abarrotes', unidad: 'unidades', existencias: 86, minimo: 30, precio: 3400 },
    { id: 2, nombre: 'Frijol cargamanto 500 g', categoria: 'Granos y abarrotes', unidad: 'unidades', existencias: 33, minimo: 12, precio: 6900 },
    { id: 3, nombre: 'Panela cuadrada', categoria: 'Granos y abarrotes', unidad: 'unidades', existencias: 40, minimo: 15, precio: 2800 },
    { id: 4, nombre: 'Sal 500 g', categoria: 'Granos y abarrotes', unidad: 'unidades', existencias: 50, minimo: 15, precio: 1800 },
    { id: 5, nombre: 'Aceite vegetal 1 L', categoria: 'Granos y abarrotes', unidad: 'unidades', existencias: 24, minimo: 18, precio: 11900 },
    { id: 6, nombre: 'Café de Huila 250 g', categoria: 'Granos y abarrotes', unidad: 'unidades', existencias: 28, minimo: 12, precio: 9500 },
    { id: 7, nombre: 'Leche entera 1 L', categoria: 'Lácteos', unidad: 'unidades', existencias: 8, minimo: 10, precio: 4800 },
    { id: 8, nombre: 'Queso campesino 500 g', categoria: 'Lácteos', unidad: 'unidades', existencias: 14, minimo: 6, precio: 12500 },
    { id: 9, nombre: 'Huevos AA x 30', categoria: 'Alimentos', unidad: 'cubetas', existencias: 35, minimo: 15, precio: 21500 },
    { id: 10, nombre: 'Pan tajado', categoria: 'Alimentos', unidad: 'unidades', existencias: 12, minimo: 6, precio: 5200 },
    { id: 11, nombre: 'Gaseosa 1,5 L', categoria: 'Bebidas', unidad: 'unidades', existencias: 30, minimo: 12, precio: 6200 },
    { id: 12, nombre: 'Jugo de naranja 1 L', categoria: 'Bebidas', unidad: 'unidades', existencias: 22, minimo: 10, precio: 4500 },
    { id: 13, nombre: 'Jabón líquido 1 L', categoria: 'Aseo', unidad: 'unidades', existencias: 17, minimo: 8, precio: 10900 },
    { id: 14, nombre: 'Papel higiénico x 4', categoria: 'Aseo', unidad: 'unidades', existencias: 20, minimo: 8, precio: 7800 },
  ];
}

// María arranca pasada del límite a propósito, para que se vean las alertas desde el principio
function clientesIniciales(): Cliente[] {
  return [
    { id: 1, nombre: 'María Gómez', telefono: '310 555 0148', limite: 200000, saldoInicial: 236000 },
    { id: 2, nombre: 'Carlos Rojas', telefono: '311 555 0193', limite: 150000, saldoInicial: 64000 },
    { id: 3, nombre: 'Luz Marina Pérez', telefono: '312 555 0127', limite: 120000, saldoInicial: 92500 },
    { id: 4, nombre: 'Hernán Cuéllar', telefono: '314 555 0166', limite: 100000, saldoInicial: 0 },
    { id: 5, nombre: 'Rosalba Trujillo', telefono: '315 555 0182', limite: 80000, saldoInicial: 0 },
  ];
}

function proveedoresIniciales(): Proveedor[] {
  return [
    { id: 1, nombre: 'Distribuciones La 14', contacto: 'Jorge Salazar', telefono: '310 555 0172', surte: 'Arroz, frijol, sal y aceite' },
    { id: 2, nombre: 'Lácteos del Valle', contacto: 'Marcela Ortiz', telefono: '311 555 0129', surte: 'Leche y queso' },
    { id: 3, nombre: 'Aseo Total', contacto: 'Andrés Cabrera', telefono: '312 555 0186', surte: 'Jabón y papel higiénico' },
    { id: 4, nombre: 'Granos del Sur', contacto: 'Yamile Perdomo', telefono: '314 555 0113', surte: 'Café, panela y huevos' },
    { id: 5, nombre: 'Bebidas El Paso', contacto: 'Camilo Díaz', telefono: '315 555 0155', surte: 'Gaseosas y jugos' },
  ];
}

// Arma una venta de ejemplo a partir de pares [id del producto, cantidad].
// El total no se escribe a mano: se calcula, así nunca se descuadra con las líneas.
function crearVenta(
  id: number, hora: Date, cliente: Cliente | null, pago: MedioPago,
  items: [number, number][], productos: Producto[],
): Venta {
  const lineas: LineaVenta[] = items.map(([productoId, cantidad]) => {
    const p = productos.find((x) => x.id === productoId) as Producto;
    return { productoId, nombre: p.nombre, cantidad, precio: p.precio };
  });
  return {
    id,
    codigo: '#V-' + id,
    cliente: cliente ? cliente.nombre : 'Cliente mostrador',
    clienteId: cliente ? cliente.id : null,
    hora,
    total: lineas.reduce((suma, l) => suma + l.cantidad * l.precio, 0),
    pago,
    lineas,
  };
}

// Ventas repartidas durante el día para que la gráfica de "ritmo de la jornada" no salga vacía
function ventasIniciales(): Venta[] {
  const p = productosIniciales();
  const c = clientesIniciales();
  const lista = [
    crearVenta(1017, hoyA(8, 5), null, 'Efectivo', [[1, 2], [3, 1], [4, 1]], p),
    crearVenta(1018, hoyA(8, 21), null, 'Efectivo', [[7, 2], [10, 1]], p),
    crearVenta(1019, hoyA(8, 43), null, 'Efectivo', [[5, 1], [2, 2]], p),
    crearVenta(1020, hoyA(9, 2), null, 'Nequi', [[9, 1], [11, 1]], p),
    crearVenta(1021, hoyA(9, 22), c[1], 'Fiado', [[1, 3], [5, 1], [7, 1]], p),
    crearVenta(1022, hoyA(9, 50), c[0], 'Nequi', [[8, 1], [6, 2], [13, 1]], p),
    crearVenta(1023, hoyA(10, 15), null, 'Efectivo', [[9, 1], [12, 2]], p),
    crearVenta(1024, hoyA(10, 40), c[2], 'Fiado', [[14, 1], [13, 1], [1, 1]], p),
    crearVenta(1025, hoyA(11, 5), null, 'Efectivo', [[11, 2], [10, 1]], p),
    crearVenta(1026, hoyA(11, 32), null, 'Nequi', [[6, 1], [3, 2]], p),
    crearVenta(1027, hoyA(12, 20), null, 'Efectivo', [[1, 3], [4, 2], [3, 2]], p),
    crearVenta(1028, hoyA(13, 10), null, 'Nequi', [[9, 1], [7, 2], [10, 1]], p),
    crearVenta(1029, hoyA(14, 35), null, 'Efectivo', [[5, 2], [6, 1]], p),
  ];
  // la más reciente primero, como se ve en la tabla
  return lista.reverse();
}

function comprasIniciales(): Compra[] {
  return [
    { id: 205, codigo: '#C-205', proveedorId: 5, fecha: haceDias(2), total: 190000, estado: 'En camino', detalle: 'Gaseosa 1,5 L × 24', productoId: 11, cantidad: 24 },
    { id: 204, codigo: '#C-204', proveedorId: 1, fecha: haceDias(14), total: 840000, estado: 'Recibida', detalle: 'Arroz y aceite' },
    { id: 203, codigo: '#C-203', proveedorId: 2, fecha: haceDias(16), total: 426500, estado: 'Recibida', detalle: 'Leche y queso' },
    { id: 202, codigo: '#C-202', proveedorId: 3, fecha: haceDias(19), total: 318000, estado: 'Pendiente de pago', detalle: 'Jabón y papel higiénico' },
    { id: 201, codigo: '#C-201', proveedorId: 4, fecha: haceDias(23), total: 520000, estado: 'Recibida', detalle: 'Café y panela' },
    { id: 200, codigo: '#C-200', proveedorId: 1, fecha: haceDias(28), total: 655500, estado: 'Recibida', detalle: 'Arroz, frijol y sal' },
  ];
}

function abonosIniciales(): Abono[] {
  return [{ id: 1, clienteId: 3, monto: 30000, fecha: haceDias(3) }];
}

function graneroInicial(): Granero {
  return { nombre: 'Granero Costalito', direccion: 'Barrio Los Pinos, Neiva', apertura: '06:00', cierre: '20:00' };
}

/* ------------------------------------------------------------------ */

@Injectable({ providedIn: 'root' })
export class DatosGranero {
  // Cada dato vive en una "signal": cuando cambia, todas las pantallas que lo usan se
  // actualizan solas. Por eso al cobrar una venta suben el total del dashboard y las
  // alertas sin que tengamos que avisarle a nadie.
  readonly granero = signal<Granero>(graneroInicial());
  readonly productos = signal<Producto[]>(productosIniciales());
  readonly clientes = signal<Cliente[]>(clientesIniciales());
  readonly proveedores = signal<Proveedor[]>(proveedoresIniciales());
  readonly ventas = signal<Venta[]>(ventasIniciales());
  readonly compras = signal<Compra[]>(comprasIniciales());
  readonly abonos = signal<Abono[]>(abonosIniciales());

  // Interruptor de la pantalla Ajustes. Sirve para la prueba de integración
  // de "qué pasa si se cae la conexión".
  readonly fallaSimulada = signal(false);

  // Cifras de comparación inventadas (ayer, semana pasada). Después vendrán del backend.
  readonly ventasAyerHastaAhora = 299300;
  readonly ventasDiasAnteriores = [465400, 518200, 487600, 556900, 601300, 574800];
  readonly ventasSemanaAnterior = 3280000;

  /* ---------- Ventas del día ---------- */

  // Todo lo que sigue son "computed": se recalculan solos cuando cambia algo de lo que leen.
  readonly totalHoy = computed(() => this.ventas().reduce((s, v) => s + v.total, 0));
  readonly cantidadHoy = computed(() => this.ventas().length);
  readonly ticketPromedio = computed(() =>
    this.cantidadHoy() ? Math.round(this.totalHoy() / this.cantidadHoy()) : 0);
  readonly diferenciaAyer = computed(() => this.totalHoy() - this.ventasAyerHastaAhora);
  readonly porcentajeAyer = computed(() =>
    Math.round((this.diferenciaAyer() / this.ventasAyerHastaAhora) * 100));

  // Lo vendido hora por hora, de 8 a. m. a 4 p. m., para la gráfica de barras del dashboard.
  // "porcentaje" es qué tan alta se dibuja la barra comparada con la hora más fuerte.
  readonly ritmo = computed(() => {
    const horas = [8, 9, 10, 11, 12, 13, 14, 15, 16];
    const cubos = horas.map((hora) => ({ hora, total: 0 }));
    for (const venta of this.ventas()) {
      // si una venta cae fuera de ese rango, la metemos en la primera o última barra
      const indice = Math.min(Math.max(venta.hora.getHours() - 8, 0), cubos.length - 1);
      cubos[indice].total += venta.total;
    }
    const mayor = Math.max(...cubos.map((c) => c.total), 1);
    return cubos.map((c) => ({ ...c, porcentaje: Math.round((c.total / mayor) * 100) }));
  });

  // Los productos más vendidos hoy, de mayor a menor
  readonly topProductos = computed(() => {
    const mapa = new Map<number, { nombre: string; unidades: number; monto: number }>();
    for (const venta of this.ventas()) {
      for (const l of venta.lineas) {
        const actual = mapa.get(l.productoId) ?? { nombre: l.nombre, unidades: 0, monto: 0 };
        actual.unidades += l.cantidad;
        actual.monto += l.cantidad * l.precio;
        mapa.set(l.productoId, actual);
      }
    }
    return [...mapa.values()].sort((a, b) => b.unidades - a.unidades);
  });

  readonly unidadesVendidas = computed(() =>
    this.topProductos().reduce((s, p) => s + p.unidades, 0));

  // Cuánto se vendió en efectivo, por Nequi y fiado
  readonly pagosPorMedio = computed(() =>
    (['Efectivo', 'Nequi', 'Fiado'] as MedioPago[]).map((medio) => {
      const ventas = this.ventas().filter((v) => v.pago === medio);
      return { medio, cantidad: ventas.length, total: ventas.reduce((s, v) => s + v.total, 0) };
    }));

  /* ---------- Inventario ---------- */

  // Lo que hay que reponer, con el más urgente de primero
  // (urgente = el que lleva menos existencias comparado con su mínimo)
  readonly productosBajos = computed(() =>
    this.productos()
      .filter((p) => { const e = estadoStock(p); return e === 'Stock bajo' || e === 'Agotado'; })
      .sort((a, b) => a.existencias / Math.max(a.minimo, 1) - b.existencias / Math.max(b.minimo, 1)));

  /* ---------- Fiados ---------- */

  // El saldo de cada cliente = lo que ya debía + lo que se le ha fiado - lo que ha abonado.
  // No se guarda en ningún lado: se calcula siempre, así nunca queda desactualizado.
  readonly saldos = computed(() => {
    const mapa = new Map<number, number>();
    for (const c of this.clientes()) mapa.set(c.id, c.saldoInicial);
    for (const v of this.ventas()) {
      if (v.pago === 'Fiado' && v.clienteId !== null) {
        mapa.set(v.clienteId, (mapa.get(v.clienteId) ?? 0) + v.total);
      }
    }
    for (const a of this.abonos()) mapa.set(a.clienteId, (mapa.get(a.clienteId) ?? 0) - a.monto);
    return mapa;
  });

  saldoDe(clienteId: number): number {
    return this.saldos().get(clienteId) ?? 0;
  }

  readonly clientesConSaldo = computed(() =>
    this.clientes().filter((c) => this.saldoDe(c.id) > 0)
      .sort((a, b) => this.saldoDe(b.id) - this.saldoDe(a.id)));

  readonly clientesExcedidos = computed(() =>
    this.clientes().filter((c) => this.saldoDe(c.id) > c.limite));

  readonly totalPorCobrar = computed(() =>
    this.clientes().reduce((s, c) => s + Math.max(this.saldoDe(c.id), 0), 0));

  /* ---------- Compras ---------- */

  readonly comprasPendientes = computed(() =>
    this.compras().filter((c) => c.estado !== 'Recibida'));

  readonly comprasUltimos30Dias = computed(() => {
    const desde = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return this.compras().filter((c) => c.fecha.getTime() >= desde)
      .reduce((s, c) => s + c.total, 0);
  });

  /* ---------- Señales del negocio ---------- */

  // Las alertas de la pantalla "Señales del negocio" salen de los datos de arriba.
  // Si no hay nada que avisar en un tema, ese aviso simplemente no aparece.
  readonly senales = computed<Senal[]>(() => {
    const lista: Senal[] = [];

    const bajos = this.productosBajos();
    if (bajos.length > 0) {
      const primero = bajos[0];
      const otros = bajos.length - 1;
      lista.push({
        clave: 'existencias',
        rotulo: 'Existencias',
        titulo: `Quedan pocas unidades de ${primero.nombre}.`,
        detalle: `Quedan ${primero.existencias} ${primero.unidad}. ` + (otros > 0
          ? `Hay ${otros} ${plural(otros, 'producto', 'productos')} más por reponer.`
          : 'Evalúa el pedido con tu proveedor antes del próximo turno.'),
        ruta: '/inventario',
        enlace: 'Abrir inventario',
      });
    }

    const excedidos = this.clientesExcedidos();
    const conSaldo = this.clientesConSaldo();
    if (excedidos.length > 0) {
      const otros = conSaldo.length - 1;
      lista.push({
        clave: 'fiados',
        rotulo: 'Fiados',
        titulo: 'Hay saldos que merecen una llamada.',
        detalle: `${excedidos[0].nombre} superó su límite de fiado` + (otros > 0
          ? ` y ${otros} ${plural(otros, 'cliente más tiene', 'clientes más tienen')} pagos pendientes.`
          : '.'),
        ruta: '/creditos',
        enlace: 'Ver fiados y pagos',
      });
    } else if (conSaldo.length > 0) {
      lista.push({
        clave: 'fiados',
        rotulo: 'Fiados',
        titulo: 'Hay fiados por cobrar.',
        detalle: `${conSaldo.length} ${plural(conSaldo.length, 'cliente tiene', 'clientes tienen')} saldo pendiente: ${pesos(this.totalPorCobrar())} en total.`,
        ruta: '/creditos',
        enlace: 'Ver fiados y pagos',
      });
    }

    const top = this.topProductos();
    if (top.length > 0) {
      lista.push({
        clave: 'movimiento',
        rotulo: 'Movimiento',
        titulo: `${top[0].nombre} es lo que más se mueve hoy.`,
        detalle: `Van ${top[0].unidades} unidades vendidas. Revisa el detalle para decidir si necesitas reforzar la exhibición.`,
        ruta: '/ventas',
        enlace: 'Ver ventas del día',
      });
    }

    const pendientes = this.comprasPendientes();
    if (pendientes.length > 0) {
      lista.push({
        clave: 'compras',
        rotulo: 'Compras',
        titulo: `Hay ${pendientes.length} ${plural(pendientes.length, 'compra', 'compras')} sin cerrar.`,
        detalle: `La compra ${pendientes[0].codigo} está ${pendientes[0].estado.toLowerCase()}. Ciérrala para que el inventario y las cuentas queden al día.`,
        ruta: '/compras',
        enlace: 'Abrir compras',
      });
    }

    return lista;
  });

  /* ------------------------------------------------------------------ */
  /*  Operaciones (guardar, cambiar). Todas devuelven una promesa, igual */
  /*  que una llamada HTTP de verdad. Quien haga el backend cambia lo    */
  /*  de adentro de cada método por algo como                            */
  /*  firstValueFrom(this.http.post(...)) y las pantallas no se enteran. */
  /* ------------------------------------------------------------------ */

  // Hace como si el servidor se demorara (casi medio segundo) y, si está activada la
  // falla simulada de Ajustes, responde con error. Así se ven los mensajes de "Guardando…"
  // y los de error sin necesitar backend.
  private async conexion<T>(accion: () => T): Promise<T> {
    await new Promise((resolver) => setTimeout(resolver, 450));
    if (this.fallaSimulada()) {
      throw new Error('No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.');
    }
    return accion();
  }

  // Aquí también se validan las cosas, no solo en el formulario: un backend de verdad
  // nunca debería confiar en lo que le mandan.
  registrarVenta(datos: NuevaVenta): Promise<Venta> {
    return this.conexion(() => {
      if (datos.lineas.length === 0) throw new Error('Agrega al menos un producto a la cuenta.');

      for (const l of datos.lineas) {
        const producto = this.productos().find((p) => p.id === l.productoId);
        if (!producto || producto.existencias < l.cantidad) {
          throw new Error(`No hay suficientes existencias de ${l.nombre}.`);
        }
      }

      const total = datos.lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
      let cliente: Cliente | null = null;
      if (datos.pago === 'Fiado') {
        cliente = this.clientes().find((c) => c.id === datos.clienteId) ?? null;
        if (!cliente) throw new Error('Elige a qué cliente se le fía.');
        if (this.saldoDe(cliente.id) + total > cliente.limite) {
          throw new Error(`${cliente.nombre} superaría su límite de fiado.`);
        }
      }

      const id = Math.max(1000, ...this.ventas().map((v) => v.id)) + 1;
      const venta: Venta = {
        id,
        codigo: '#V-' + id,
        cliente: cliente ? cliente.nombre : 'Cliente mostrador',
        clienteId: cliente ? cliente.id : null,
        hora: new Date(),
        total,
        pago: datos.pago,
        lineas: datos.lineas,
      };

      // la venta entra de primera en la lista y se descuenta del inventario
      this.ventas.update((lista) => [venta, ...lista]);
      this.productos.update((lista) => lista.map((p) => {
        const linea = datos.lineas.find((l) => l.productoId === p.id);
        return linea ? { ...p, existencias: p.existencias - linea.cantidad } : p;
      }));
      return venta;
    });
  }

  agregarProducto(datos: NuevoProducto): Promise<Producto> {
    return this.conexion(() => {
      const nombre = datos.nombre.trim();
      if (this.productos().some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())) {
        throw new Error('Ya existe un producto con ese nombre.');
      }
      const producto: Producto = {
        ...datos,
        nombre,
        categoria: datos.categoria.trim(),
        id: Math.max(0, ...this.productos().map((p) => p.id)) + 1,
      };
      this.productos.update((lista) => [...lista, producto]);
      return producto;
    });
  }

  // Si la compra ya llegó, las existencias suben de una. Si viene "En camino",
  // espera a que la marquen como recibida (ver cambiarEstadoCompra).
  registrarCompra(datos: NuevaCompra): Promise<Compra> {
    return this.conexion(() => {
      const producto = this.productos().find((p) => p.id === datos.productoId);
      if (!producto) throw new Error('Elige el producto que compraste.');
      const id = Math.max(199, ...this.compras().map((c) => c.id)) + 1;
      const compra: Compra = {
        id,
        codigo: '#C-' + id,
        proveedorId: datos.proveedorId,
        fecha: new Date(),
        total: datos.cantidad * datos.costoUnitario,
        estado: datos.estado,
        detalle: `${producto.nombre} × ${datos.cantidad}`,
        productoId: producto.id,
        cantidad: datos.cantidad,
      };
      this.compras.update((lista) => [compra, ...lista]);
      if (datos.estado !== 'En camino') this.sumarExistencias(producto.id, datos.cantidad);
      return compra;
    });
  }

  cambiarEstadoCompra(id: number, estado: EstadoCompra): Promise<void> {
    return this.conexion(() => {
      const compra = this.compras().find((c) => c.id === id);
      if (!compra) throw new Error('No encontramos esa compra.');
      // al recibir un pedido que venía en camino, ahí sí entra la mercancía al inventario
      if (compra.estado === 'En camino' && estado !== 'En camino' && compra.productoId && compra.cantidad) {
        this.sumarExistencias(compra.productoId, compra.cantidad);
      }
      this.compras.update((lista) => lista.map((c) => (c.id === id ? { ...c, estado } : c)));
    });
  }

  registrarCliente(datos: NuevoCliente): Promise<Cliente> {
    return this.conexion(() => {
      const nombre = datos.nombre.trim();
      if (this.clientes().some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
        throw new Error('Ya tienes un cliente con ese nombre.');
      }
      const cliente: Cliente = {
        id: Math.max(0, ...this.clientes().map((c) => c.id)) + 1,
        nombre,
        telefono: datos.telefono.trim(),
        limite: datos.limite,
        // un cliente nuevo empieza sin deudas
        saldoInicial: 0,
      };
      this.clientes.update((lista) => [...lista, cliente]);
      return cliente;
    });
  }

  registrarProveedor(datos: NuevoProveedor): Promise<Proveedor> {
    return this.conexion(() => {
      const nombre = datos.nombre.trim();
      if (this.proveedores().some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())) {
        throw new Error('Ya tienes un proveedor con ese nombre.');
      }
      const proveedor: Proveedor = {
        id: Math.max(0, ...this.proveedores().map((p) => p.id)) + 1,
        nombre,
        contacto: datos.contacto.trim(),
        telefono: datos.telefono.trim(),
        surte: datos.surte.trim(),
      };
      this.proveedores.update((lista) => [...lista, proveedor]);
      return proveedor;
    });
  }

  // Un abono es plata que el cliente entrega para bajar su deuda.
  // No se acepta más de lo que debe.
  registrarAbono(clienteId: number, monto: number): Promise<Abono> {
    return this.conexion(() => {
      const saldo = this.saldoDe(clienteId);
      if (monto <= 0) throw new Error('El abono debe ser mayor que cero.');
      if (monto > saldo) throw new Error(`El abono no puede pasar del saldo (${pesos(saldo)}).`);
      const abono: Abono = {
        id: Math.max(0, ...this.abonos().map((a) => a.id)) + 1,
        clienteId,
        monto,
        fecha: new Date(),
      };
      this.abonos.update((lista) => [...lista, abono]);
      return abono;
    });
  }

  guardarGranero(datos: Granero): Promise<void> {
    return this.conexion(() => {
      this.granero.set({ ...datos, nombre: datos.nombre.trim(), direccion: datos.direccion.trim() });
    });
  }

  // Botón "Restablecer datos de prueba" de Ajustes: deja todo como cuando abres la app
  restablecer(): void {
    this.granero.set(graneroInicial());
    this.productos.set(productosIniciales());
    this.clientes.set(clientesIniciales());
    this.proveedores.set(proveedoresIniciales());
    this.ventas.set(ventasIniciales());
    this.compras.set(comprasIniciales());
    this.abonos.set(abonosIniciales());
  }

  private sumarExistencias(productoId: number, cantidad: number): void {
    this.productos.update((lista) =>
      lista.map((p) => (p.id === productoId ? { ...p, existencias: p.existencias + cantidad } : p)));
  }
}

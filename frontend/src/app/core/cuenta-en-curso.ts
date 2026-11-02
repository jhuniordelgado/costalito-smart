import { Injectable, computed, inject, signal } from '@angular/core';
import { DatosGranero } from './datos-granero';
import { Avisos } from './avisos';
import { LineaVenta, MedioPago, Producto } from './modelos';
import { mensajeDe, pesos } from './formato';

/**
 * La cuenta que se está armando en el mostrador. La dejé en un servicio y no dentro del
 * componente porque la usan dos pantallas a la vez: el estante, donde se tocan los
 * productos, y la tirilla, donde se cobra. Así las dos ven siempre la misma cuenta.
 */
@Injectable({ providedIn: 'root' })
export class CuentaEnCurso {
  private readonly datos = inject(DatosGranero);
  private readonly avisos = inject(Avisos);

  readonly cuenta = signal<LineaVenta[]>([]);
  readonly pago = signal<MedioPago>('Efectivo');
  readonly clienteId = signal<number | null>(null);
  readonly recibido = signal<number | null>(null);
  readonly enviando = signal(false);
  // el id de la última venta cobrada, para resaltar su fila en el historial
  readonly ultimaVenta = signal<number | null>(null);

  readonly total = computed(() => this.cuenta().reduce((s, l) => s + l.cantidad * l.precio, 0));
  readonly unidades = computed(() => this.cuenta().reduce((s, l) => s + l.cantidad, 0));

  // La devuelta es lo que te dieron menos lo que costó la cuenta. Es null mientras
  // no hayan escrito cuánto recibieron.
  readonly devuelta = computed(() => {
    const r = this.recibido();
    return r === null ? null : r - this.total();
  });
  // Solo mostramos la devuelta cuando alcanza la plata (no queremos un "devuelta: -5.000")
  readonly devueltaValida = computed(() => {
    const d = this.devuelta();
    return d !== null && d >= 0 ? d : null;
  });

  readonly clienteElegido = computed(() =>
    this.datos.clientes().find((c) => c.id === this.clienteId()) ?? null);

  // El motivo por el que todavía no se puede cobrar. Si devuelve null, el botón se activa.
  // Va en orden: primero que haya algo en la cuenta, luego las reglas del fiado y del efectivo.
  readonly pendiente = computed<string | null>(() => {
    if (this.cuenta().length === 0) return 'Toca un producto del estante para empezar la cuenta.';
    if (this.pago() === 'Fiado') {
      const c = this.clienteElegido();
      if (!c) return 'Elige a quién se le fía.';
      if (this.datos.saldoDe(c.id) + this.total() > c.limite) {
        return `${c.nombre} superaría su límite de ${pesos(c.limite)}. Cobra otra forma de pago o una parte en efectivo.`;
      }
    }
    const devuelta = this.devuelta();
    if (this.pago() === 'Efectivo' && devuelta !== null && devuelta < 0) {
      return 'El efectivo recibido no alcanza para cubrir la cuenta.';
    }
    return null;
  });

  cantidadDe(productoId: number): number {
    return this.cuenta().find((l) => l.productoId === productoId)?.cantidad ?? 0;
  }

  // Se llama al tocar un producto del estante: si ya está en la cuenta suma uno,
  // si no, lo agrega. No deja pasar de lo que hay en el inventario.
  agregar(p: Producto): void {
    const enCuenta = this.cantidadDe(p.id);
    if (enCuenta >= p.existencias) {
      this.avisos.info('No hay más en el estante', `Solo quedan ${p.existencias} ${p.unidad} de ${p.nombre}.`);
      return;
    }
    this.cuenta.update((lineas) => enCuenta > 0
      ? lineas.map((l) => (l.productoId === p.id ? { ...l, cantidad: l.cantidad + 1 } : l))
      : [...lineas, { productoId: p.id, nombre: p.nombre, cantidad: 1, precio: p.precio }]);
  }

  // Los botones + y − de cada línea. Si la cantidad llega a 0, la línea se quita sola.
  cambiarCantidad(productoId: number, cambio: number): void {
    const producto = this.datos.productos().find((p) => p.id === productoId);
    const maximo = producto ? producto.existencias : 0;
    this.cuenta.update((lineas) => lineas
      .map((l) => (l.productoId === productoId ? { ...l, cantidad: Math.min(l.cantidad + cambio, maximo) } : l))
      .filter((l) => l.cantidad > 0));
  }

  // Al cambiar de forma de pago se limpia lo que había escrito (el efectivo recibido
  // o el cliente elegido), para que no quede información de la opción anterior.
  elegirPago(medio: MedioPago): void {
    this.pago.set(medio);
    this.recibido.set(null);
    this.clienteId.set(null);
  }

  vaciar(): void {
    this.cuenta.set([]);
    this.recibido.set(null);
    this.clienteId.set(null);
    this.pago.set('Efectivo');
  }

  async cobrar(): Promise<void> {
    // doble seguro: si algo impide cobrar, o ya se está guardando, no hacemos nada
    if (this.pendiente() !== null || this.enviando()) return;
    this.enviando.set(true);
    try {
      const venta = await this.datos.registrarVenta({
        clienteId: this.pago() === 'Fiado' ? this.clienteId() : null,
        pago: this.pago(),
        lineas: this.cuenta(),
      });
      this.ultimaVenta.set(venta.id);
      this.vaciar();
      this.avisos.ok(`Venta ${venta.codigo} registrada`, `${pesos(venta.total)} pagados con ${venta.pago.toLowerCase()}.`);
    } catch (error) {
      // si el "servidor" falla, la cuenta se queda como estaba para poder reintentar
      this.avisos.error('No se pudo registrar la venta', mensajeDe(error));
    } finally {
      this.enviando.set(false);
    }
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { Avisos } from '../../core/avisos';
import { DatosGranero } from '../../core/datos-granero';
import { EstadoCompra } from '../../core/modelos';
import { mensajeDe, pesos } from '../../core/formato';

@Component({
  selector: 'app-compras',
  imports: [],
  templateUrl: './compras.html',
  styleUrl: './compras.css',
})
export class Compras {
  readonly datos = inject(DatosGranero);
  private readonly avisos = inject(Avisos);
  readonly pesos = pesos;
  readonly termino = signal('');
  readonly filtro = signal<'Todas' | 'Recibida' | 'En camino' | 'Pendiente de pago'>('Todas');
  readonly formularioVisible = signal(false);
  readonly guardando = signal(false);
  readonly totalCompras = computed(() => this.datos.compras().reduce((suma, compra) => suma + compra.total, 0));
  readonly productosRecibidos = computed(() => this.datos.compras().reduce((suma, compra) => suma + (compra.cantidad ?? 0), 0));
  readonly comprasFiltradas = computed(() => {
    const termino = this.termino().trim().toLocaleLowerCase('es-CO');
    return this.datos.compras().filter((compra) => (this.filtro() === 'Todas' || compra.estado === this.filtro())
      && (!termino || `${compra.codigo} ${this.proveedor(compra.proveedorId)}`.toLocaleLowerCase('es-CO').includes(termino)));
  });

  buscar(evento: Event): void { this.termino.set((evento.target as HTMLInputElement).value); }
  cambiarFiltro(evento: Event): void { this.filtro.set((evento.target as HTMLSelectElement).value as 'Todas' | 'Recibida' | 'En camino' | 'Pendiente de pago'); }
  proveedor(id: number): string { return this.datos.proveedores().find((proveedor) => proveedor.id === id)?.nombre ?? 'Proveedor sin registrar'; }
  fecha(fecha: Date): string { return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }); }

  async guardarCompra(evento: SubmitEvent): Promise<void> {
    evento.preventDefault();
    if (this.guardando()) return;

    const formulario = evento.currentTarget as HTMLFormElement;
    const valores = new FormData(formulario);
    const proveedorId = Number(valores.get('proveedor'));
    const productoId = Number(valores.get('producto'));
    const cantidad = Number(valores.get('cantidad'));
    const costoUnitario = Number(valores.get('costoUnitario'));
    const estado = String(valores.get('estado')) as EstadoCompra;
    const codigo = String(valores.get('codigo') ?? '').trim();
    const fechaVencimiento = String(valores.get('fechaVencimiento') ?? '').trim();

    if (!proveedorId || !productoId || !Number.isFinite(cantidad) || cantidad <= 0
      || !Number.isFinite(costoUnitario) || costoUnitario <= 0) {
      this.avisos.error('Revisa el formulario', 'Selecciona proveedor y producto e ingresa cantidad y costo válidos.');
      return;
    }

    this.guardando.set(true);
    try {
      await this.datos.registrarCompra({
        proveedorId,
        productoId,
        cantidad,
        costoUnitario,
        estado,
        ...(codigo ? { codigo } : {}),
        ...(fechaVencimiento ? { fechaVencimiento } : {}),
      });
      formulario.reset();
      this.formularioVisible.set(false);
      this.avisos.ok('Compra registrada', 'El movimiento quedó guardado en el inventario.');
    } catch (error) {
      this.avisos.error('No se pudo registrar la compra', mensajeDe(error));
    } finally {
      this.guardando.set(false);
    }
  }

  async marcarRecibida(id: number): Promise<void> {
    try {
      await this.datos.cambiarEstadoCompra(id, 'Recibida');
      this.avisos.ok('Compra recibida', 'Las existencias se actualizaron.');
    } catch (error) {
      this.avisos.error('No se pudo actualizar la compra', mensajeDe(error));
    }
  }
}

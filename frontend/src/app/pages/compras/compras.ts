import { Component, computed, inject, signal } from '@angular/core';
import { DatosGranero } from '../../core/datos-granero';
import { pesos } from '../../core/formato';

@Component({
  selector: 'app-compras',
  imports: [],
  templateUrl: './compras.html',
  styleUrl: './compras.css',
})
export class Compras {
  readonly datos = inject(DatosGranero);
  readonly pesos = pesos;
  readonly termino = signal('');
  readonly filtro = signal<'Todas' | 'Recibida' | 'En camino' | 'Pendiente de pago'>('Todas');
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
}

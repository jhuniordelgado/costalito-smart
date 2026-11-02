import { Component, computed, inject, signal } from '@angular/core';
import { DatosGranero, estadoStock } from '../../core/datos-granero';
import { EstadoStock } from '../../core/modelos';
import { pesos } from '../../core/formato';

@Component({
  imports: [],
  selector: 'app-inventario',
  styleUrl: './inventario.css',
  templateUrl: './inventario.html',
})
export class Inventario {
  readonly datos = inject(DatosGranero);
  readonly termino = signal('');
  readonly categoria = signal('Todas');
  readonly estadoStock = estadoStock;
  readonly pesos = pesos;

  readonly categorias = computed(() => ['Todas', ...new Set(this.datos.productos().map((producto) => producto.categoria))]);
  readonly valorInventario = computed(() => this.datos.productos().reduce((suma, producto) => suma + producto.existencias * producto.precio, 0));
  readonly productosFiltrados = computed(() => {
    const termino = this.termino().trim().toLocaleLowerCase('es-CO');
    return this.datos.productos().filter((producto) =>
      (this.categoria() === 'Todas' || producto.categoria === this.categoria())
      && (!termino || producto.nombre.toLocaleLowerCase('es-CO').includes(termino)));
  });

  buscar(evento: Event): void {
    this.termino.set((evento.target as HTMLInputElement).value);
  }

  tipoSello(estado: EstadoStock): string {
    if (estado === 'Disponible') return 'bien';
    if (estado === 'Por revisar') return 'aviso';
    return 'alerta';
  }
}

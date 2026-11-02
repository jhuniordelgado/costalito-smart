import { Component, computed, inject, signal } from '@angular/core';
import { CuentaEnCurso } from '../../../../core/cuenta-en-curso';
import { DatosGranero, estadoStock } from '../../../../core/datos-granero';
import { pesos } from '../../../../core/formato';

@Component({
  selector: 'app-estante-ventas',
  templateUrl: './estante-ventas.html',
  styleUrl: './estante-ventas.css',
})
export class EstanteVentas {
  readonly datos = inject(DatosGranero);
  readonly cuenta = inject(CuentaEnCurso);
  readonly termino = signal('');
  readonly categoria = signal('Todas');
  readonly estadoStock = estadoStock;
  readonly pesos = pesos;

  readonly categorias = computed(() => [
    'Todas',
    ...new Set(this.datos.productos().map((producto) => producto.categoria)),
  ]);

  readonly productosFiltrados = computed(() => {
    const termino = this.termino().trim().toLocaleLowerCase('es-CO');
    const categoria = this.categoria();
    return this.datos.productos().filter((producto) =>
      (categoria === 'Todas' || producto.categoria === categoria)
      && (!termino || producto.nombre.toLocaleLowerCase('es-CO').includes(termino)));
  });

  buscar(evento: Event): void {
    this.termino.set((evento.target as HTMLInputElement).value);
  }
}

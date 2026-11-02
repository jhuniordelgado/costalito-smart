import { Component, computed, inject, signal } from '@angular/core';
import { DatosGranero } from '../../core/datos-granero';

@Component({
  imports: [],
  selector: 'app-proveedores',
  styleUrl: './proveedores.css',
  templateUrl: './proveedores.html',
})
export class Proveedores {
  readonly datos = inject(DatosGranero);
  readonly termino = signal('');
  readonly proveedoresFiltrados = computed(() => {
    const termino = this.termino().trim().toLocaleLowerCase('es-CO');
    return this.datos.proveedores().filter((proveedor) => !termino
      || `${proveedor.nombre} ${proveedor.surte}`.toLocaleLowerCase('es-CO').includes(termino));
  });

  buscar(evento: Event): void { this.termino.set((evento.target as HTMLInputElement).value); }
  ultimaCompra(id: number): string {
    const fecha = this.datos.compras().filter((compra) => compra.proveedorId === id)
      .map((compra) => compra.fecha).sort((a, b) => b.getTime() - a.getTime())[0];
    return fecha ? fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin compras';
  }
}

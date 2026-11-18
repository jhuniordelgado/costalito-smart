import { Component, computed, inject, signal } from '@angular/core';
import { CuentaEnCurso } from '../../../../core/cuenta-en-curso';
import { DatosGranero } from '../../../../core/datos-granero';
import { pesos } from '../../../../core/formato';

@Component({
  selector: 'app-historial-ventas',
  templateUrl: './historial-ventas.html',
  styleUrl: './historial-ventas.css',
})
export class HistorialVentas {
  readonly datos = inject(DatosGranero);
  readonly cuenta = inject(CuentaEnCurso);
  readonly pesos = pesos;
  readonly termino = signal('');
  readonly filtro = signal<'Todas' | 'Efectivo' | 'Nequi' | 'Fiado'>('Todas');

  readonly ventasFiltradas = computed(() => {
    const desdeOctubre = new Date(2026, 9, 1);
    const hastaAhora = new Date();
    const termino = this.termino().trim().toLocaleLowerCase('es-CO');
    const filtro = this.filtro();
    return this.datos.ventas().filter((venta) =>
      venta.hora >= desdeOctubre
      && venta.hora <= hastaAhora
      && (filtro === 'Todas' || venta.pago === filtro)
      && (!termino || `${venta.codigo} ${venta.cliente}`.toLocaleLowerCase('es-CO').includes(termino)));
  });

  buscar(evento: Event): void {
    this.termino.set((evento.target as HTMLInputElement).value);
  }

  cambiarFiltro(evento: Event): void {
    this.filtro.set((evento.target as HTMLSelectElement).value as 'Todas' | 'Efectivo' | 'Nequi' | 'Fiado');
  }

  hora(fecha: Date): string {
    return fecha.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  }

  fecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

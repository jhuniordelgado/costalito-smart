import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avisos } from '../../core/avisos';
import { DatosGranero } from '../../core/datos-granero';
import { pesos, plural } from '../../core/formato';
import { PrediccionesIa } from '../../core/predicciones-ia';
import { calcularResumen, hallazgoPrincipal, nombreArchivo, reporteCsv } from '../../core/reporte';

const fechaCorta = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });

@Component({
  imports: [RouterLink],
  selector: 'app-reportes',
  styleUrl: './reportes.css',
  templateUrl: './reportes.html',
})
export class Reportes {
  readonly datos = inject(DatosGranero);
  readonly ia = inject(PrediccionesIa);
  private readonly avisos = inject(Avisos);
  readonly pesos = pesos;
  readonly plural = plural;
  readonly exportando = signal(false);

  // Se recalcula solo cuando cambian las ventas (por ejemplo, al registrar una nueva)
  readonly resumen = computed(() => calcularResumen(this.datos.ventas()));
  readonly hallazgo = computed(() => hallazgoPrincipal(this.resumen()));
  readonly destacado = computed(() => this.resumen().productosMes[0] ?? null);
  readonly mejorDia = computed(() => Math.max(...this.resumen().porDiaSemana.map((d) => d.promedio), 1));
  readonly periodo = computed(() => `${fechaCorta.format(this.resumen().desde)} al ${fechaCorta.format(this.resumen().hasta)}`);
  readonly semanas = computed(() =>
    `${fechaCorta.format(this.resumen().semanasDesde)} al ${fechaCorta.format(this.resumen().semanasHasta)}`);

  constructor() {
    void this.ia.cargar();
  }

  comparacion(variacion: number | null): string {
    if (variacion === null) return 'Sin datos del mes anterior';
    const flecha = variacion >= 0 ? '↑' : '↓';
    return `${flecha} ${Math.abs(variacion)} % frente al mismo periodo del mes anterior`;
  }

  /** Descarga el reporte como CSV para Excel, con las predicciones de compra de la IA. */
  async exportar(): Promise<void> {
    if (this.exportando()) return;
    this.exportando.set(true);
    try {
      // Predicciones al día (si la última consulta tiene menos de 30 s, se reutiliza)
      await this.ia.cargar();
      const generado = new Date();
      const csv = reporteCsv(this.datos.granero().nombre || 'Costalito Smart', this.resumen(), this.ia.estado(), generado);
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombreArchivo(generado);
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.avisos.ok('Reporte descargado', `${enlace.download}: resumen del mes, ventas por día, productos y predicción de compra.`);
    } catch {
      this.avisos.error('No se pudo exportar', 'Intenta de nuevo. Si sigue fallando, recarga la página.');
    } finally {
      this.exportando.set(false);
    }
  }
}

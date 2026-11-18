import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';
import { mensajeDe } from './formato';
import { PrediccionesIa as Predicciones } from './modelos';

/** Si la última consulta tiene menos de esto, no se vuelve a pedir (salvo que se fuerce). */
const VIGENCIA_MS = 30_000;

/**
 * Predicciones de demanda y sugerencias de compra del servicio inteligente.
 * Angular no habla con Python: las pide a la API de ASP.NET Core (/api/intelligence),
 * que consulta el servicio y responde siempre, aunque Python esté apagado.
 */
@Injectable({ providedIn: 'root' })
export class PrediccionesIa {
  private readonly http = inject(HttpClient);
  private enCurso: Promise<void> | null = null;
  private ultimaConsulta = 0;

  readonly estado = signal<Predicciones | null>(null);
  readonly cargando = signal(false);
  /** Falla al hablar con la API de .NET (no con Python: eso llega en estado().mensaje). */
  readonly error = signal('');

  readonly disponible = computed(() => this.estado()?.disponible ?? false);
  readonly recomendaciones = computed(() => this.estado()?.recomendaciones ?? []);
  /** Agotados o en el punto de pedido: hay que comprar hoy. */
  readonly comprarHoy = computed(() => this.recomendaciones()
    .filter((r) => r.urgencia === 'agotado' || r.urgencia === 'alta'));
  /** Hay que pedir en los próximos 7 días. */
  readonly estaSemana = computed(() => this.recomendaciones().filter((r) => r.urgencia === 'media'));
  readonly cubiertos = computed(() => this.recomendaciones()
    .filter((r) => r.urgencia === 'baja' || r.urgencia === 'sin movimiento'));

  /**
   * Pide las predicciones. Varias llamadas seguidas comparten la misma petición, y si la
   * última respuesta es reciente no se repite, salvo con `forzar` (botón Actualizar o
   * después de registrar una venta o compra, que cambian las existencias).
   */
  cargar(forzar = false): Promise<void> {
    if (this.enCurso) return this.enCurso;
    if (!forzar && this.estado() && Date.now() - this.ultimaConsulta < VIGENCIA_MS) {
      return Promise.resolve();
    }
    this.cargando.set(true);
    this.enCurso = firstValueFrom(
      this.http.get<Omit<Predicciones, 'consultado'> & { consultado: string }>(`${API_URL}/intelligence`),
    )
      .then((respuesta) => {
        this.estado.set({ ...respuesta, consultado: new Date(respuesta.consultado) });
        this.error.set('');
        this.ultimaConsulta = Date.now();
      })
      .catch((error: unknown) => this.error.set(mensajeDe(error)))
      .finally(() => {
        this.cargando.set(false);
        this.enCurso = null;
      });
    return this.enCurso;
  }
}

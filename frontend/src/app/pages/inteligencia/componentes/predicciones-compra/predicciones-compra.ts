import { Component, computed, inject } from '@angular/core';
import { plural } from '../../../../core/formato';
import { PrediccionProducto, UrgenciaIa } from '../../../../core/modelos';
import { PrediccionesIa } from '../../../../core/predicciones-ia';

/** Cómo se ve cada urgencia de la IA: el texto del sello lleva el significado, el color lo refuerza. */
const URGENCIAS: Record<UrgenciaIa, { rotulo: string; sello: string; clase: string }> = {
  agotado: { rotulo: 'Agotado', sello: 'sello--alerta', clase: 'agotado' },
  alta: { rotulo: 'Comprar hoy', sello: 'sello--alerta', clase: 'alta' },
  media: { rotulo: 'Esta semana', sello: 'sello--aviso', clase: 'media' },
  baja: { rotulo: 'Más adelante', sello: 'sello--bien', clase: 'baja' },
  'sin movimiento': { rotulo: 'Sin movimiento', sello: 'sello--neutro', clase: 'quieto' },
};

const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const fechaCorta = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });

interface Barra {
  etiqueta: string;
  valor: number;
  altura: number;
  prevista: boolean;
}

/**
 * Tablero de predicciones del servicio inteligente: un renglón por producto con el sello de
 * urgencia, la acción (cuánto y cuándo comprar), las ventas de 4 semanas contra la prevista
 * y la explicación que da la IA.
 */
@Component({
  selector: 'app-predicciones-compra',
  styleUrl: './predicciones-compra.css',
  templateUrl: './predicciones-compra.html',
})
export class PrediccionesCompra {
  readonly ia = inject(PrediccionesIa);
  readonly plural = plural;

  readonly metodoCorto = computed(() => {
    const estado = this.ia.estado();
    if (!estado?.disponible) return 'Sin conexión';
    return estado.usaRedNeuronal ? 'Red neuronal' : 'Promedio de 4 semanas';
  });

  /** Por qué la IA usa ese método, en una frase. */
  readonly metodoDetalle = computed(() => {
    const estado = this.ia.estado();
    if (!estado?.disponible) return '';
    if (estado.usaRedNeuronal) {
      const m = estado.modelo;
      return m?.maeRedNeuronal != null
        ? `La red se equivoca en ~${numero.format(m.maeRedNeuronal)} unidades por semana; el promedio, en ${numero.format(m.maePromedioMovil ?? 0)}.`
        : 'Predice con la red neuronal entrenada con las ventas de la base.';
    }
    const m = estado.modelo;
    if (m && !m.usarRed && m.maeRedNeuronal != null) {
      return `La red entrenada se equivocó más (${numero.format(m.maeRedNeuronal)} contra ${numero.format(m.maePromedioMovil ?? 0)} unidades por semana), así que se usa el promedio.`;
    }
    const d = estado.datos;
    if (d && !d.sePuedeEntrenar && d.entrenamientoPosibleDesde) {
      return `Hay ${d.semanasCompletas} de ${d.semanasNecesarias} semanas para entrenar la red; se podrá desde el ${this.fecha(d.entrenamientoPosibleDesde)}.`;
    }
    return 'Todavía no hay una red entrenada: se usa el promedio de las últimas 4 semanas.';
  });

  constructor() {
    // Al entrar a la página se piden datos frescos (si los últimos tienen menos de 30 s, se reutilizan)
    void this.ia.cargar();
  }

  urgencia(prediccion: PrediccionProducto) {
    return URGENCIAS[prediccion.urgencia] ?? URGENCIAS.baja;
  }

  /** La acción concreta: "Compra 85 unidades hoy", "Pide 36 en 3 días"… */
  accion(prediccion: PrediccionProducto): string {
    const cantidad = `${numero.format(prediccion.cantidadSugerida)} ${plural(prediccion.cantidadSugerida, 'unidad', 'unidades')}`;
    if (prediccion.urgencia === 'sin movimiento' || prediccion.cantidadSugerida <= 0) return 'No hace falta comprar';
    if (prediccion.comprarAhora) return `Compra ${cantidad} hoy`;
    return `Pide ${cantidad} ${prediccion.cuando}`;
  }

  /** Lo que respalda la acción, en números. */
  contexto(prediccion: PrediccionProducto): string {
    const partes = [`Hay ${numero.format(prediccion.existencias)}`];
    if (prediccion.enCamino) partes[0] += ` y ${numero.format(prediccion.enCamino)} en camino`;
    if (prediccion.diasParaAgotarse != null) partes.push(`alcanza para ~${numero.format(prediccion.diasParaAgotarse)} días`);
    partes.push(`el proveedor tarda ${prediccion.diasEntrega} ${plural(prediccion.diasEntrega, 'día', 'días')}`);
    const texto = partes.join(' · ');
    return prediccion.fechaCompra && !prediccion.comprarAhora
      ? `${texto} · pedido el ${this.fecha(prediccion.fechaCompra)}`
      : texto;
  }

  /** Las 4 semanas vendidas y la prevista, a la misma escala. */
  barras(prediccion: PrediccionProducto): Barra[] {
    const valores = [...prediccion.ultimasSemanas, prediccion.demandaSemanalPrevista];
    const mayor = Math.max(...valores, 1);
    const lunes = prediccion.semanasDesde ? this.aFecha(prediccion.semanasDesde) : null;
    return valores.map((valor, indice) => {
      const prevista = indice === valores.length - 1;
      let etiqueta = prevista ? 'Esta' : `S${indice + 1}`;
      if (lunes && !prevista) {
        const dia = new Date(lunes);
        dia.setDate(dia.getDate() + 7 * indice);
        etiqueta = fechaCorta.format(dia).replace('.', '');
      }
      return { etiqueta, valor, altura: Math.max(4, Math.round((valor / mayor) * 100)), prevista };
    });
  }

  descripcionGrafica(prediccion: PrediccionProducto): string {
    return `Ventas de las últimas 4 semanas: ${prediccion.ultimasSemanas.map((v) => numero.format(v)).join(', ')}. `
      + `Previsto para esta semana: ${numero.format(prediccion.demandaSemanalPrevista)} unidades.`;
  }

  formato(valor: number): string {
    return numero.format(valor);
  }

  fecha(valor: string): string {
    return fechaCorta.format(this.aFecha(valor)).replace('.', '');
  }

  hora(valor: Date): string {
    return valor.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  }

  // "2026-11-30" como fecha local (new Date("2026-11-30") la tomaría en UTC y daría el 29)
  private aFecha(valor: string): Date {
    const [anio, mes, dia] = valor.slice(0, 10).split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }
}

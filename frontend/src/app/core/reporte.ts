import { PrediccionesIa, Venta } from './modelos';

/**
 * Cálculos de la página de Reportes y el archivo que descarga "Exportar reporte".
 * Son funciones puras (sin Angular) para poder probarlas con fechas fijas.
 */

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export interface VentasDia {
  dia: string;
  total: number;
  /** Cuántas ventas (tickets) hubo ese día de la semana en el periodo. */
  ventas: number;
  /** Promedio por cada uno de esos días (hay 4 lunes en 4 semanas). */
  promedio: number;
}

export interface ProductoVendido {
  nombre: string;
  unidades: number;
  monto: number;
}

export interface ResumenReporte {
  desde: Date;
  hasta: Date;
  totalMes: number;
  /** Mismo periodo del mes anterior: del 1 al mismo día. Así se compara parejo. */
  totalMesAnterior: number;
  variacionTotal: number | null;
  unidadesMes: number;
  unidadesMesAnterior: number;
  variacionUnidades: number | null;
  ventasMes: number;
  /** Ventas por día de la semana en las últimas 4 semanas completas. */
  porDiaSemana: VentasDia[];
  semanasDesde: Date;
  semanasHasta: Date;
  productosMes: ProductoVendido[];
}

const DIA_MS = 24 * 60 * 60 * 1000;

function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function variacion(actual: number, anterior: number): number | null {
  return anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : null;
}

function unidades(ventas: Venta[]): number {
  return ventas.reduce((suma, venta) => suma + venta.lineas.reduce((s, linea) => s + linea.cantidad, 0), 0);
}

export function calcularResumen(ventas: Venta[], hoy = new Date()): ResumenReporte {
  const finHoy = new Date(inicioDelDia(hoy).getTime() + DIA_MS);
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  // Mes anterior hasta el mismo día (o su último día, si es más corto)
  const anteriorDesde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const diasMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
  const anteriorHasta = new Date(anteriorDesde.getFullYear(), anteriorDesde.getMonth(),
    Math.min(hoy.getDate(), diasMesAnterior) + 1);

  const delMes = ventas.filter((v) => v.hora >= desde && v.hora < finHoy);
  const delMesAnterior = ventas.filter((v) => v.hora >= anteriorDesde && v.hora < anteriorHasta);
  const totalMes = delMes.reduce((s, v) => s + v.total, 0);
  const totalMesAnterior = delMesAnterior.reduce((s, v) => s + v.total, 0);
  const unidadesMes = unidades(delMes);
  const unidadesMesAnterior = unidades(delMesAnterior);

  // Últimas 4 semanas completas (lunes a domingo) antes de la semana en curso
  const lunesActual = new Date(inicioDelDia(hoy).getTime() - ((hoy.getDay() + 6) % 7) * DIA_MS);
  const semanasDesde = new Date(lunesActual.getTime() - 28 * DIA_MS);
  const porDia = DIAS_SEMANA.map((dia) => ({ dia, total: 0, ventas: 0, promedio: 0 }));
  for (const venta of ventas) {
    if (venta.hora >= semanasDesde && venta.hora < lunesActual) {
      const indice = (venta.hora.getDay() + 6) % 7;
      porDia[indice].total += venta.total;
      porDia[indice].ventas += 1;
    }
  }
  for (const dia of porDia) dia.promedio = Math.round(dia.total / 4);

  const productos = new Map<string, ProductoVendido>();
  for (const venta of delMes) {
    for (const linea of venta.lineas) {
      const producto = productos.get(linea.nombre) ?? { nombre: linea.nombre, unidades: 0, monto: 0 };
      producto.unidades += linea.cantidad;
      producto.monto += linea.cantidad * linea.precio;
      productos.set(linea.nombre, producto);
    }
  }

  return {
    desde,
    hasta: inicioDelDia(hoy),
    totalMes,
    totalMesAnterior,
    variacionTotal: variacion(totalMes, totalMesAnterior),
    unidadesMes,
    unidadesMesAnterior,
    variacionUnidades: variacion(unidadesMes, unidadesMesAnterior),
    ventasMes: delMes.length,
    porDiaSemana: porDia,
    semanasDesde,
    semanasHasta: new Date(lunesActual.getTime() - DIA_MS),
    productosMes: [...productos.values()].sort((a, b) => b.unidades - a.unidades || b.monto - a.monto),
  };
}

/** El hallazgo que más pesa en las ventas, en una frase. */
export function hallazgoPrincipal(resumen: ResumenReporte): string {
  const dias = resumen.porDiaSemana.filter((d) => d.ventas > 0);
  if (!dias.length) return 'Todavía no hay ventas suficientes en las últimas 4 semanas para sacar conclusiones.';
  const promedioGeneral = dias.reduce((s, d) => s + d.promedio, 0) / dias.length;
  const mejor = dias.reduce((a, b) => (b.promedio > a.promedio ? b : a));
  const peor = dias.reduce((a, b) => (b.promedio < a.promedio ? b : a));
  const sobre = Math.round(((mejor.promedio - promedioGeneral) / promedioGeneral) * 100);
  return `El ${mejor.dia.toLowerCase()} es el día de más ventas: ${sobre} % por encima del promedio diario `
    + `de las últimas 4 semanas. El ${peor.dia.toLowerCase()} es el más flojo.`;
}

// ----------------------------------------------------------------------------
// Archivo CSV para Excel
// ----------------------------------------------------------------------------

const URGENCIAS: Record<string, string> = {
  agotado: 'Agotado', alta: 'Comprar hoy', media: 'Esta semana', baja: 'Más adelante', 'sin movimiento': 'Sin movimiento',
};

/** Celda segura para CSV con ";" (el separador que usa Excel en español). */
export function celda(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  // Excel en español lee la coma como separador decimal
  const texto = typeof valor === 'number' ? String(Math.round(valor * 100) / 100).replace('.', ',') : valor;
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function fila(...valores: Array<string | number | null | undefined>): string {
  return valores.map(celda).join(';');
}

function fecha(valor: Date): string {
  return valor.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function porcentaje(valor: number | null): string {
  return valor === null ? 'Sin datos del mes anterior' : `${valor > 0 ? '+' : ''}${valor} % frente al mismo periodo del mes anterior`;
}

export function reporteCsv(
  granero: string,
  resumen: ResumenReporte,
  predicciones: PrediccionesIa | null,
  generado = new Date(),
): string {
  const lineas = [
    fila('Costalito Smart - Reporte del negocio'),
    fila('Granero', granero),
    fila('Generado', `${fecha(generado)} ${generado.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`),
    fila('Periodo del mes', `${fecha(resumen.desde)} al ${fecha(resumen.hasta)}`),
    '',
    fila('RESUMEN DEL MES'),
    fila('Indicador', 'Valor', 'Comparación'),
    fila('Ventas (pesos)', resumen.totalMes, porcentaje(resumen.variacionTotal)),
    fila('Unidades vendidas', resumen.unidadesMes, porcentaje(resumen.variacionUnidades)),
    fila('Número de ventas', resumen.ventasMes, ''),
    fila('Producto destacado', resumen.productosMes[0]?.nombre ?? 'Sin ventas', resumen.productosMes[0] ? `${resumen.productosMes[0].unidades} unidades` : ''),
    '',
    fila(`VENTAS POR DÍA DE LA SEMANA (${fecha(resumen.semanasDesde)} al ${fecha(resumen.semanasHasta)})`),
    fila('Día', 'Total (pesos)', 'Promedio por día (pesos)', 'Número de ventas'),
    ...resumen.porDiaSemana.map((d) => fila(d.dia, d.total, d.promedio, d.ventas)),
    fila('Hallazgo', hallazgoPrincipal(resumen)),
    '',
    fila('PRODUCTOS VENDIDOS EN EL MES'),
    fila('Producto', 'Unidades', 'Monto (pesos)'),
    ...resumen.productosMes.map((p) => fila(p.nombre, p.unidades, p.monto)),
    '',
    fila('PREDICCIÓN DE COMPRA - SERVICIO INTELIGENTE'),
  ];

  if (!predicciones?.disponible) {
    lineas.push(fila('Estado', predicciones?.mensaje ?? 'No se consultó el servicio inteligente.'));
  } else {
    lineas.push(
      fila('Método', predicciones.metodo ?? ''),
      fila('Consultado', `${fecha(predicciones.consultado)} ${predicciones.consultado.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`),
      fila('Código', 'Producto', 'Urgencia', 'Cuándo pedir', 'Cantidad sugerida', 'Demanda semanal prevista',
        'Existencias', 'En camino', 'Días para agotarse', 'Días de entrega', 'Explicación'),
      ...predicciones.recomendaciones.map((r) => fila(
        r.codigo, r.producto, URGENCIAS[r.urgencia] ?? r.urgencia, r.cuando, r.cantidadSugerida,
        r.demandaSemanalPrevista, r.existencias, r.enCamino, r.diasParaAgotarse, r.diasEntrega, r.explicacion)),
    );
    if (predicciones.sinDatosSuficientes.length) {
      lineas.push(fila('Sin predicción (menos de 4 semanas de ventas)', predicciones.sinDatosSuficientes.join(', ')));
    }
  }
  // CRLF y BOM: Excel en Windows reconoce así las tildes y los saltos de línea
  return '﻿' + lineas.join('\r\n') + '\r\n';
}

export function nombreArchivo(generado = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `reporte-costalito-${generado.getFullYear()}-${dos(generado.getMonth() + 1)}-${dos(generado.getDate())}.csv`;
}

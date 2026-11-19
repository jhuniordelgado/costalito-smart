import { describe, expect, it } from 'vitest';
import { PrediccionesIa, Venta } from './modelos';
import { calcularResumen, celda, hallazgoPrincipal, nombreArchivo, reporteCsv } from './reporte';

// Miércoles 18 de noviembre de 2026
const HOY = new Date(2026, 10, 18, 15, 0);

function venta(dia: Date, total: number, nombre = 'Arroz', cantidad = 1): Venta {
  return {
    id: Math.random(), codigo: 'V', cliente: 'Mostrador', clienteId: null, hora: dia, total, pago: 'Efectivo',
    lineas: [{ productoId: 1, nombre, cantidad, precio: total / cantidad }],
  };
}

describe('calcularResumen()', () => {
  it('compara el mes con el mismo periodo del mes anterior (del 1 al mismo día)', () => {
    const ventas = [
      venta(new Date(2026, 10, 2, 9), 1000),
      venta(new Date(2026, 10, 18, 9), 1000),   // hoy cuenta
      venta(new Date(2026, 9, 5, 9), 1000),     // octubre, dentro del 1 al 18
      venta(new Date(2026, 9, 25, 9), 9000),    // octubre, después del 18: no se compara
    ];
    const r = calcularResumen(ventas, HOY);
    expect(r.totalMes).toBe(2000);
    expect(r.totalMesAnterior).toBe(1000);
    expect(r.variacionTotal).toBe(100);
    expect(r.ventasMes).toBe(2);
  });

  it('sin ventas del mes anterior no inventa una variación', () => {
    expect(calcularResumen([venta(new Date(2026, 10, 3), 500)], HOY).variacionTotal).toBeNull();
  });

  it('agrupa por día de la semana solo las 4 semanas completas anteriores', () => {
    const ventas = [
      venta(new Date(2026, 10, 14, 10), 4000),  // sábado 14: dentro
      venta(new Date(2026, 9, 19, 10), 2000),   // lunes 19 oct: primer día de las 4 semanas
      venta(new Date(2026, 9, 18, 10), 9999),   // domingo 18 oct: antes, no cuenta
      venta(new Date(2026, 10, 16, 10), 9999),  // lunes 16 nov: semana en curso, no cuenta
    ];
    const r = calcularResumen(ventas, HOY);
    expect(r.semanasDesde).toEqual(new Date(2026, 9, 19));
    expect(r.semanasHasta).toEqual(new Date(2026, 10, 15));
    expect(r.porDiaSemana[0]).toEqual({ dia: 'Lunes', total: 2000, ventas: 1, promedio: 500 });
    expect(r.porDiaSemana[5]).toEqual({ dia: 'Sábado', total: 4000, ventas: 1, promedio: 1000 });
  });

  it('ordena los productos del mes por unidades', () => {
    const r = calcularResumen([
      venta(new Date(2026, 10, 3), 2000, 'Leche', 2),
      venta(new Date(2026, 10, 4), 9000, 'Queso', 1),
      venta(new Date(2026, 10, 5), 3000, 'Leche', 3),
    ], HOY);
    expect(r.productosMes.map((p) => [p.nombre, p.unidades])).toEqual([['Leche', 5], ['Queso', 1]]);
  });
});

describe('hallazgoPrincipal()', () => {
  it('nombra el día más fuerte y el más flojo', () => {
    const r = calcularResumen([
      venta(new Date(2026, 10, 14, 10), 3000), // sábado
      venta(new Date(2026, 10, 9, 10), 1000),  // lunes
    ], HOY);
    expect(hallazgoPrincipal(r)).toContain('El sábado es el día de más ventas: 50 %');
    expect(hallazgoPrincipal(r)).toContain('El lunes es el más flojo');
  });
});

describe('reporteCsv()', () => {
  const predicciones: PrediccionesIa = {
    disponible: true, mensaje: null, consultado: HOY, metodo: 'promedio de 4 semanas', usaRedNeuronal: false,
    datos: null, modelo: null, sinDatosSuficientes: ['Gansito'],
    recomendaciones: [{
      codigo: 'LAC-001', producto: 'Leche entera 1 L', metodo: 'promedio', urgencia: 'alta', comprarAhora: true,
      cuando: 'ahora', fechaCompra: '2026-11-18', cantidadSugerida: 85, demandaSemanalPrevista: 71.8,
      ultimasSemanas: [74, 73, 61, 79], semanasDesde: '2026-10-19', existencias: 7, enCamino: 0, diasEntrega: 1,
      diasParaAgotarse: 0.7, explicacion: 'Compra hoy; quedan "7" unidades.',
    }],
  };

  it('abre bien en Excel: BOM, ";" como separador y coma decimal', () => {
    const csv = reporteCsv('Granero Costalito', calcularResumen([], HOY), predicciones, HOY);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('Granero;Granero Costalito');
    expect(csv).toContain('LAC-001;Leche entera 1 L;Comprar hoy;ahora;85;71,8;7;0;0,7;1;');
    // la explicación lleva ";" y comillas: va entre comillas y con las comillas duplicadas
    expect(csv).toContain('"Compra hoy; quedan ""7"" unidades."');
    expect(csv).toContain('Gansito');
  });

  it('si la IA no está disponible, el reporte lo dice en lugar de fallar', () => {
    const csv = reporteCsv('G', calcularResumen([], HOY),
      { ...predicciones, disponible: false, mensaje: 'El servicio no responde', recomendaciones: [] }, HOY);
    expect(csv).toContain('Estado;El servicio no responde');
  });

  it('celda() deja intactos los textos simples', () => {
    expect(celda('Arroz')).toBe('Arroz');
    expect(celda(1500.5)).toBe('1500,5');
    expect(celda(null)).toBe('');
  });

  it('el archivo se nombra con la fecha', () => {
    expect(nombreArchivo(HOY)).toBe('reporte-costalito-2026-11-18.csv');
  });
});

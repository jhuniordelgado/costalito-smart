import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatosGranero } from '../../../../core/datos-granero';
import { pesos, plural } from '../../../../core/formato';
import { PrediccionesIa } from '../../../../core/predicciones-ia';

const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

/**
 * Lo primero que se ve al abrir la jornada: el corte de caja de hoy y lo que el servicio
 * inteligente dice que hay que pedir hoy. El ritmo por hora y el detalle quedan en Ventas.
 */
@Component({
  selector: 'app-corte-del-dia',
  imports: [RouterLink],
  templateUrl: './corte-del-dia.html',
  styleUrl: './corte-del-dia.css',
})
export class CorteDelDia {
  readonly datos = inject(DatosGranero);
  readonly ia = inject(PrediccionesIa);
  readonly pesos = pesos;
  readonly plural = plural;
  readonly abs = Math.abs;

  formato(valor: number): string {
    return numero.format(valor);
  }
}

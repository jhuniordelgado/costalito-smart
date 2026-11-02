import { Component, inject } from '@angular/core';
import { DatosGranero } from '../../core/datos-granero';
import { pesos } from '../../core/formato';
import { CuentaVenta } from './componentes/cuenta-venta/cuenta-venta';
import { EstanteVentas } from './componentes/estante-ventas/estante-ventas';
import { HistorialVentas } from './componentes/historial-ventas/historial-ventas';

@Component({
  imports: [EstanteVentas, CuentaVenta, HistorialVentas],
  selector: 'app-ventas',
  styleUrl: './ventas.css',
  templateUrl: './ventas.html',
})
export class Ventas {
  readonly datos = inject(DatosGranero);
  readonly pesos = pesos;
}

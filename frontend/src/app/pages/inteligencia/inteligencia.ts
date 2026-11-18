import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatosGranero } from '../../core/datos-granero';
import { PrediccionesCompra } from './componentes/predicciones-compra/predicciones-compra';

@Component({
  imports: [RouterLink, PrediccionesCompra],
  selector: 'app-inteligencia',
  styleUrl: './inteligencia.css',
  templateUrl: './inteligencia.html',
})
export class Inteligencia {
  readonly datos = inject(DatosGranero);
}

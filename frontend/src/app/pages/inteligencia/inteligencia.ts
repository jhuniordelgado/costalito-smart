import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatosGranero } from '../../core/datos-granero';

@Component({
  imports: [RouterLink],
  selector: 'app-inteligencia',
  styleUrl: './inteligencia.css',
  templateUrl: './inteligencia.html',
})
export class Inteligencia {
  readonly datos = inject(DatosGranero);
}

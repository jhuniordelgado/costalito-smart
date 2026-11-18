import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DatosGranero } from '../../core/datos-granero';
import { PrediccionesIa } from '../../core/predicciones-ia';
import { Sidebar } from '../sidebar/sidebar';

// El marco de las páginas del granero: menú a la izquierda y la página a la derecha.
// Solo se crea después de iniciar sesión, así que aquí se piden los datos a la API.
@Component({
  selector: 'app-principal',
  imports: [RouterOutlet, Sidebar],
  templateUrl: './principal.html',
  styleUrl: './principal.css',
})
export class Principal {
  readonly datos = inject(DatosGranero);
  private readonly ia = inject(PrediccionesIa);

  constructor() {
    void this.datos.cargar();
    // Las predicciones van aparte: si el servicio inteligente tarda, el resto ya se ve
    void this.ia.cargar();
  }
}

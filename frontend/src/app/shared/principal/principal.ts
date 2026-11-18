import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DatosGranero } from '../../core/datos-granero';
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

  constructor() {
    void this.datos.cargar();
  }
}

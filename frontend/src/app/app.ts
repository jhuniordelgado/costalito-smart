import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DatosGranero } from './core/datos-granero';
import { Sidebar } from './shared/sidebar/sidebar';
import { ListaAvisos } from './shared/lista-avisos/lista-avisos';

// Aquí no hay lógica, solo armamos las tres piezas que siempre están a la vista:
// el menú, el hueco donde cambian las páginas (RouterOutlet) y los avisos flotando.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Sidebar, ListaAvisos],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly datos = inject(DatosGranero);
}

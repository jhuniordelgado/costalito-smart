import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ListaAvisos } from './shared/lista-avisos/lista-avisos';

// Aquí no hay lógica: el RouterOutlet muestra la entrada o el marco del granero
// (ver app.routes.ts) y los avisos flotan encima de todo.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ListaAvisos],
  templateUrl: './app.html',
})
export class App {}

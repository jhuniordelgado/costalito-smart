import { Component, inject } from '@angular/core';
import { Avisos } from '../../core/avisos';

@Component({
  selector: 'app-lista-avisos',
  templateUrl: './lista-avisos.html',
  styleUrl: './lista-avisos.css',
})
export class ListaAvisos {
  readonly avisos = inject(Avisos);
}

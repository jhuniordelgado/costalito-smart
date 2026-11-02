import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type VistaJornada = 'ventas' | 'inventario' | 'fiados';

@Component({
  selector: 'app-senal-destacada',
  imports: [RouterLink],
  templateUrl: './senal-destacada.html',
  styleUrl: './senal-destacada.css',
})
export class SenalDestacada {
  vistaActiva: VistaJornada = 'ventas';

  cambiarVista(vista: VistaJornada) {
    this.vistaActiva = vista;
  }
} 

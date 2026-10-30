import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type VistaJornada = 'ventas' | 'inventario' | 'fiados';

@Component({
  imports: [RouterLink],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  vistaActiva: VistaJornada = 'ventas';

  cambiarVista(vista: VistaJornada) {
    this.vistaActiva = vista;
  }
}

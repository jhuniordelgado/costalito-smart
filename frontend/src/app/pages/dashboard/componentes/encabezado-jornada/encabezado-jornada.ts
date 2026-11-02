import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-encabezado-jornada',
  imports: [RouterLink],
  templateUrl: './encabezado-jornada.html',
  styleUrl: './encabezado-jornada.css',
})
export class EncabezadoJornada {
  private ahora = new Date();

  diaSemana = this.ahora.toLocaleDateString('es-CO', { weekday: 'long' });
  dia = this.ahora.getDate();
  mes = this.ahora.toLocaleDateString('es-CO', { month: 'long' });
  hora = this.ahora.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

  novedades = input(0);
} 

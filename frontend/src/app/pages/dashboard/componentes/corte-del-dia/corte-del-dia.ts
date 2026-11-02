import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatosGranero } from '../../../../core/datos-granero';
import { pesos } from '../../../../core/formato';

@Component({
  selector: 'app-corte-del-dia',
  imports: [RouterLink],
  templateUrl: './corte-del-dia.html',
  styleUrl: './corte-del-dia.css',
})
export class CorteDelDia {
  readonly datos = inject(DatosGranero);
  readonly pesos = pesos;
  hora(hora: number): string { return new Intl.DateTimeFormat('es-CO', { hour: 'numeric' }).format(new Date(2026, 0, 1, hora)); }
} 

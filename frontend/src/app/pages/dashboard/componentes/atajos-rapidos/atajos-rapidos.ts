import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Atajo {
  ruta: string;
  texto: string;
}

@Component({
  selector: 'app-atajos-rapidos',
  imports: [RouterLink],
  templateUrl: './atajos-rapidos.html',
  styleUrl: './atajos-rapidos.css',
})
export class AtajosRapidos {
  atajos: Atajo[] = [
    { ruta: '/ventas', texto: 'Registrar una venta' },
    { ruta: '/inventario', texto: 'Revisar inventario' },
    { ruta: '/creditos', texto: 'Cobrar un fiado' },
  ];
} 

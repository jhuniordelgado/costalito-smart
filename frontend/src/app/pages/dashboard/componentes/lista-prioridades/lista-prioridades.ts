import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Prioridad {
  titulo: string;
  detalle: string;
  ruta: string;
  enlace: string;
}

@Component({
  selector: 'app-lista-prioridades',
  imports: [RouterLink],
  templateUrl: './lista-prioridades.html',
  styleUrl: './lista-prioridades.css',
})
export class ListaPrioridades {
  prioridades: Prioridad[] = [
    { titulo: 'Reponer leche entera', detalle: 'Quedan 8 unidades. Prioridad alta.', ruta: '/inventario', enlace: 'Revisar' },
    { titulo: 'Hablar con María Gómez', detalle: 'Su fiado ya supera el límite acordado.', ruta: '/creditos', enlace: 'Ver saldo' },
    { titulo: 'Mirar el movimiento de aceite', detalle: 'Es uno de los productos con mayor salida.', ruta: '/ventas', enlace: 'Ver detalle' },
  ];
} 

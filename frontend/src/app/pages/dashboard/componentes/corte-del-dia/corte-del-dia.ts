import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-corte-del-dia',
  imports: [RouterLink],
  templateUrl: './corte-del-dia.html',
  styleUrl: './corte-del-dia.css',
})
export class CorteDelDia {
  totalVendido = '$632.700';
  cantidadVentas = 37;
  diferenciaAyer = '$46.900';
  alturasBarras = [24, 48, 35, 74, 94, 57, 39];
  horasEje = ['8 a. m.', '12 m.', '4 p. m.'];
} 

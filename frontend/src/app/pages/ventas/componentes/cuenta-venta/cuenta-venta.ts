import { Component, inject } from '@angular/core';
import { CuentaEnCurso } from '../../../../core/cuenta-en-curso';
import { DatosGranero } from '../../../../core/datos-granero';
import { MedioPago } from '../../../../core/modelos';
import { pesos } from '../../../../core/formato';

@Component({
  selector: 'app-cuenta-venta',
  templateUrl: './cuenta-venta.html',
  styleUrl: './cuenta-venta.css',
})
export class CuentaVenta {
  readonly cuenta = inject(CuentaEnCurso);
  readonly datos = inject(DatosGranero);
  readonly pesos = pesos;
  readonly medios: MedioPago[] = ['Efectivo', 'Nequi', 'Fiado'];

  seleccionarPago(medio: MedioPago): void {
    this.cuenta.elegirPago(medio);
  }

  cambiarRecibido(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).valueAsNumber;
    this.cuenta.recibido.set(Number.isFinite(valor) ? valor : null);
  }

  cambiarCliente(evento: Event): void {
    const valor = Number((evento.target as HTMLSelectElement).value);
    this.cuenta.clienteId.set(Number.isFinite(valor) && valor > 0 ? valor : null);
  }
}

import { Injectable, signal } from '@angular/core';
import { Aviso, TipoAviso } from './modelos';

@Injectable({ providedIn: 'root' })
export class Avisos {
  private siguienteId = 1;
  readonly lista = signal<Aviso[]>([]);

  ok(titulo: string, detalle: string): void {
    this.mostrar('exito', titulo, detalle);
  }

  info(titulo: string, detalle: string): void {
    this.mostrar('informacion', titulo, detalle);
  }

  error(titulo: string, detalle: string): void {
    this.mostrar('error', titulo, detalle);
  }

  cerrar(id: number): void {
    this.lista.update((avisos) => avisos.filter((aviso) => aviso.id !== id));
  }

  private mostrar(tipo: TipoAviso, titulo: string, detalle: string): void {
    const aviso = { id: this.siguienteId++, tipo, titulo, detalle };
    this.lista.update((avisos) => [...avisos, aviso]);
    window.setTimeout(() => this.cerrar(aviso.id), tipo === 'error' ? 7000 : 4500);
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { Avisos } from '../../core/avisos';
import { DatosGranero } from '../../core/datos-granero';
import { pesos, mensajeDe } from '../../core/formato';

@Component({
  imports: [],
  selector: 'app-clientes',
  styleUrl: './clientes.css',
  templateUrl: './clientes.html',
})
export class Clientes {
  readonly datos = inject(DatosGranero);
  private readonly avisos = inject(Avisos);
  readonly pesos = pesos;
  readonly termino = signal('');
  readonly soloConSaldo = signal(false);
  readonly formularioVisible = signal(false);
  readonly guardando = signal(false);

  readonly clientesFiltrados = computed(() => {
    const termino = this.termino().trim().toLocaleLowerCase('es-CO');
    return this.datos.clientes().filter((cliente) =>
      (!this.soloConSaldo() || this.datos.saldoDe(cliente.id) > 0)
      && (!termino || cliente.nombre.toLocaleLowerCase('es-CO').includes(termino)));
  });

  buscar(evento: Event): void {
    this.termino.set((evento.target as HTMLInputElement).value);
  }

  async guardar(evento: SubmitEvent): Promise<void> {
    evento.preventDefault();
    if (this.guardando()) return;
    const formulario = evento.currentTarget as HTMLFormElement;
    const valores = new FormData(formulario);
    const nombre = String(valores.get('nombre') ?? '').trim();
    const telefono = String(valores.get('telefono') ?? '').trim();
    const limite = Number(valores.get('limite'));
    if (!nombre || !telefono || !Number.isFinite(limite) || limite <= 0) {
      this.avisos.error('Revisa el formulario', 'Completa nombre, teléfono y un límite de fiado válido.');
      return;
    }
    this.guardando.set(true);
    try {
      await this.datos.registrarCliente({ nombre, telefono, limite });
      formulario.reset();
      this.formularioVisible.set(false);
      this.avisos.ok('Cliente registrado', `${nombre} ya está disponible para ventas fiadas.`);
    } catch (error) {
      this.avisos.error('No se pudo registrar el cliente', mensajeDe(error));
    } finally {
      this.guardando.set(false);
    }
  }
}

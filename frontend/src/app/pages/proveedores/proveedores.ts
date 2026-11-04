import { Component, computed, inject, signal } from '@angular/core';
import { Avisos } from '../../core/avisos';
import { DatosGranero } from '../../core/datos-granero';
import { mensajeDe } from '../../core/formato';

@Component({
  imports: [],
  selector: 'app-proveedores',
  styleUrl: './proveedores.css',
  templateUrl: './proveedores.html',
})
export class Proveedores {
  readonly datos = inject(DatosGranero);
  private readonly avisos = inject(Avisos);
  readonly termino = signal('');
  readonly formularioVisible = signal(false);
  readonly guardando = signal(false);
  readonly proveedoresFiltrados = computed(() => {
    const termino = this.termino().trim().toLocaleLowerCase('es-CO');
    return this.datos.proveedores().filter((proveedor) => !termino
      || `${proveedor.nombre} ${proveedor.surte}`.toLocaleLowerCase('es-CO').includes(termino));
  });

  buscar(evento: Event): void { this.termino.set((evento.target as HTMLInputElement).value); }

  async guardar(evento: SubmitEvent): Promise<void> {
    evento.preventDefault();
    if (this.guardando()) return;

    const formulario = evento.currentTarget as HTMLFormElement;
    const valores = new FormData(formulario);
    const datos = {
      nombre: String(valores.get('nombre') ?? '').trim(),
      contacto: String(valores.get('contacto') ?? '').trim(),
      telefono: String(valores.get('telefono') ?? '').trim(),
      surte: String(valores.get('surte') ?? '').trim(),
    };
    if (Object.values(datos).some((valor) => !valor)) {
      this.avisos.error('Revisa el formulario', 'Completa todos los datos del proveedor.');
      return;
    }

    this.guardando.set(true);
    try {
      await this.datos.registrarProveedor(datos);
      formulario.reset();
      this.formularioVisible.set(false);
      this.avisos.ok('Proveedor registrado', `${datos.nombre} quedó disponible para compras.`);
    } catch (error) {
      this.avisos.error('No se pudo registrar el proveedor', mensajeDe(error));
    } finally {
      this.guardando.set(false);
    }
  }

  ultimaCompra(id: number): string {
    const fecha = this.datos.compras().filter((compra) => compra.proveedorId === id)
      .map((compra) => compra.fecha).sort((a, b) => b.getTime() - a.getTime())[0];
    return fecha ? fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin compras';
  }
}

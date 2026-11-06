import { Component, computed, inject, signal } from '@angular/core';
import { Avisos } from '../../core/avisos';
import { DatosGranero, estadoStock } from '../../core/datos-granero';
import { EstadoStock, NuevoProducto } from '../../core/modelos';
import { mensajeDe, pesos } from '../../core/formato';

@Component({
  imports: [],
  selector: 'app-inventario',
  styleUrl: './inventario.css',
  templateUrl: './inventario.html',
})
export class Inventario {
  readonly datos = inject(DatosGranero);
  readonly termino = signal('');
  readonly categoria = signal('Todas');
  readonly formularioVisible = signal(false);
  readonly guardando = signal(false);
  readonly estadoStock = estadoStock;
  readonly pesos = pesos;
  private readonly avisos = inject(Avisos);

  readonly categorias = computed(() => ['Todas', ...new Set(this.datos.productos().map((producto) => producto.categoria))]);
  readonly valorInventario = computed(() => this.datos.productos().reduce((suma, producto) => suma + producto.existencias * producto.precio, 0));
  readonly productosFiltrados = computed(() => {
    const termino = this.termino().trim().toLocaleLowerCase('es-CO');
    return this.datos.productos().filter((producto) =>
      (this.categoria() === 'Todas' || producto.categoria === this.categoria())
      && (!termino || producto.nombre.toLocaleLowerCase('es-CO').includes(termino)));
  });

  buscar(evento: Event): void {
    this.termino.set((evento.target as HTMLInputElement).value);
  }

  async guardarProducto(evento: SubmitEvent): Promise<void> {
    evento.preventDefault();
    if (this.guardando()) return;

    const formulario = evento.currentTarget as HTMLFormElement;
    const valores = new FormData(formulario);
    const producto: NuevoProducto = {
      codigo: String(valores.get('codigo') ?? '').trim(),
      nombre: String(valores.get('nombre') ?? '').trim(),
      categoria: String(valores.get('categoria') ?? '').trim(),
      presentacion: String(valores.get('presentacion') ?? '').trim(),
      unidad: String(valores.get('unidad') ?? '').trim(),
      existencias: Number(valores.get('existencias')),
      minimo: Number(valores.get('minimo')),
      precioCompra: Number(valores.get('precioCompra')),
      precio: Number(valores.get('precio')),
      precioMayorista: Number(valores.get('precioMayorista')),
    };
    const preciosValidos = [producto.existencias, producto.minimo, producto.precioCompra,
      producto.precio, producto.precioMayorista].every(Number.isFinite);
    if (!producto.codigo || !producto.nombre || !producto.categoria || !producto.presentacion
      || !producto.unidad || !preciosValidos || producto.precioCompra <= 0
      || producto.precio <= 0 || producto.precioMayorista <= 0) {
      this.avisos.error('Revisa el formulario', 'Completa los datos y verifica existencias, mínimos y precios.');
      return;
    }

    this.guardando.set(true);
    try {
      await this.datos.agregarProducto(producto);
      formulario.reset();
      this.formularioVisible.set(false);
      this.avisos.ok('Producto registrado', `${producto.nombre} quedó agregado al inventario.`);
    } catch (error) {
      this.avisos.error('No se pudo registrar el producto', mensajeDe(error));
    } finally {
      this.guardando.set(false);
    }
  }

  tipoSello(estado: EstadoStock): string {
    if (estado === 'Disponible') return 'bien';
    if (estado === 'Por revisar') return 'aviso';
    return 'alerta';
  }
}

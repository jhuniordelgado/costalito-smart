import { Component, computed, inject, signal } from '@angular/core';
import { Avisos } from '../../core/avisos';
import { DatosGranero } from '../../core/datos-granero';
import { mensajeDe, pesos } from '../../core/formato';

interface SaldoVisible {
  responsable: string;
  tipo: 'Por cobrar' | 'Por pagar';
  documento: string;
  saldo: number;
  estado: 'Pendiente' | 'Por revisar';
}

@Component({
  selector: 'app-creditos',
  imports: [],
  templateUrl: './creditos.html',
  styleUrl: './creditos.css',
})
export class Creditos {
  readonly datos = inject(DatosGranero);
  private readonly avisos = inject(Avisos);
  readonly pesos = pesos;
  readonly termino = signal('');
  readonly filtro = signal<'Todos' | 'Por cobrar' | 'Por pagar'>('Todos');
  readonly formularioVisible = signal(false);
  readonly guardando = signal(false);

  readonly porPagar = computed(() => this.datos.compras()
    .filter((compra) => compra.estado === 'Pendiente de pago')
    .reduce((suma, compra) => suma + compra.total, 0));
  readonly abonosDelMes = computed(() => this.datos.abonos().reduce((suma, abono) => suma + abono.monto, 0));
  readonly saldos = computed<SaldoVisible[]>(() => {
    const clientes = this.datos.clientesConSaldo().map((cliente) => ({
      responsable: cliente.nombre,
      tipo: 'Por cobrar' as const,
      documento: 'Fiado acumulado',
      saldo: this.datos.saldoDe(cliente.id),
      estado: this.datos.saldoDe(cliente.id) > cliente.limite ? 'Por revisar' as const : 'Pendiente' as const,
    }));
    const compras = this.datos.compras().filter((compra) => compra.estado === 'Pendiente de pago').map((compra) => ({
      responsable: this.datos.proveedores().find((proveedor) => proveedor.id === compra.proveedorId)?.nombre ?? 'Proveedor',
      tipo: 'Por pagar' as const,
      documento: compra.codigo,
      saldo: compra.total,
      estado: 'Por revisar' as const,
    }));
    return [...clientes, ...compras];
  });
  readonly saldosFiltrados = computed(() => {
    const termino = this.termino().trim().toLocaleLowerCase('es-CO');
    return this.saldos().filter((saldo) => (this.filtro() === 'Todos' || saldo.tipo === this.filtro())
      && (!termino || `${saldo.responsable} ${saldo.documento}`.toLocaleLowerCase('es-CO').includes(termino)));
  });

  buscar(evento: Event): void { this.termino.set((evento.target as HTMLInputElement).value); }
  cambiarFiltro(evento: Event): void { this.filtro.set((evento.target as HTMLSelectElement).value as 'Todos' | 'Por cobrar' | 'Por pagar'); }

  async guardarAbono(evento: SubmitEvent): Promise<void> {
    evento.preventDefault();
    if (this.guardando()) return;
    const formulario = evento.currentTarget as HTMLFormElement;
    const valores = new FormData(formulario);
    const clienteId = Number(valores.get('cliente'));
    const monto = Number(valores.get('monto'));
    if (!clienteId || !Number.isFinite(monto) || monto <= 0) {
      this.avisos.error('Revisa el abono', 'Selecciona un cliente e ingresa un monto válido.');
      return;
    }
    this.guardando.set(true);
    try {
      await this.datos.registrarAbono(clienteId, monto);
      formulario.reset();
      this.formularioVisible.set(false);
      this.avisos.ok('Abono registrado', 'El saldo del cliente se actualizó correctamente.');
    } catch (error) {
      this.avisos.error('No se pudo registrar el abono', mensajeDe(error));
    } finally {
      this.guardando.set(false);
    }
  }
}

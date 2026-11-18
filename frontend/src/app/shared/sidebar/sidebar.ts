import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Sesion } from '../../core/sesion';

interface OpcionMenu {
  ruta: string;
  nombre: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  readonly sesion = inject(Sesion);
  private readonly router = inject(Router);
  readonly saliendo = signal(false);

  opciones: OpcionMenu[] = [
    { ruta: '/', nombre: 'Mi jornada' },
    { ruta: '/ventas', nombre: 'Ventas' },
    { ruta: '/inventario', nombre: 'Inventario' },
    { ruta: '/compras', nombre: 'Compras' },
    { ruta: '/clientes', nombre: 'Clientes' },
    { ruta: '/proveedores', nombre: 'Proveedores' },
    { ruta: '/creditos', nombre: 'Fiados y pagos' },
    { ruta: '/reportes', nombre: 'Reportes' },
    { ruta: '/inteligencia', nombre: 'Señales del negocio' },
    { ruta: '/administracion', nombre: 'Ajustes' },
  ];

  async salir(): Promise<void> {
    this.saliendo.set(true);
    try {
      await this.sesion.cerrarSesion();
    } catch {
      // aunque la API no responda, la sesión local ya se borró
    } finally {
      this.saliendo.set(false);
      await this.router.navigateByUrl('/entrar');
    }
  }
}

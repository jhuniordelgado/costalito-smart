import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

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

  numero(posicion: number): string {
    return String(posicion + 1).padStart(2, '0');
  }
}

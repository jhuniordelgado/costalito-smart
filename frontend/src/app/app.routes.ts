import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Inventario } from './pages/inventario/inventario';
import { Ventas } from './pages/ventas/ventas';
import { Clientes } from './pages/clientes/clientes';
import { Proveedores } from './pages/proveedores/proveedores';
import { Reportes } from './pages/reportes/reportes';
import { Inteligencia } from './pages/inteligencia/inteligencia';
import { Administracion } from './pages/administracion/administracion';


export const routes: Routes = [
  { path: '', component: Dashboard, title: 'Dashboard | Costalito Smart' },
  { path: 'inventario', component: Inventario, title: 'Inventario | Costalito Smart' },
  { path: 'ventas', component: Ventas, title: 'Ventas | Costalito Smart' },
  { path: 'clientes', component: Clientes, title: 'Clientes | Costalito Smart' },
  { path: 'proveedores', component: Proveedores, title: 'Proveedores | Costalito Smart' },
  { path: 'reportes', component: Reportes, title: 'Reportes | Costalito Smart' },
  { path: 'inteligencia', component: Inteligencia, title: 'Inteligencia | Costalito Smart' },
  { path: 'administracion', component: Administracion, title: 'Administración | Costalito Smart' },
  { path: '**', redirectTo: '' }
];

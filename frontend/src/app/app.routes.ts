import { Routes } from '@angular/router';
import { requiereSesion, soloSinSesion } from './core/autenticacion';
import { Login } from './pages/login/login';
import { Principal } from './shared/principal/principal';
import { Dashboard } from './pages/dashboard/dashboard';
import { Inventario } from './pages/inventario/inventario';
import { Ventas } from './pages/ventas/ventas';
import { Compras } from './pages/compras/compras';
import { Creditos } from './pages/creditos/creditos';
import { Clientes } from './pages/clientes/clientes';
import { Proveedores } from './pages/proveedores/proveedores';
import { Reportes } from './pages/reportes/reportes';
import { Inteligencia } from './pages/inteligencia/inteligencia';
import { Administracion } from './pages/administracion/administracion';

export const routes: Routes = [
  { path: 'entrar', component: Login, canActivate: [soloSinSesion], title: 'Entrar | Costalito Smart' },
  {
    // Todas las páginas del granero cuelgan de aquí y comparten la guarda de sesión
    path: '',
    component: Principal,
    canActivate: [requiereSesion],
    children: [
      { path: '', component: Dashboard, title: 'Dashboard | Costalito Smart' },
      { path: 'inventario', component: Inventario, title: 'Inventario | Costalito Smart' },
      { path: 'ventas', component: Ventas, title: 'Ventas | Costalito Smart' },
      { path: 'compras', component: Compras, title: 'Compras | Costalito Smart' },
      { path: 'clientes', component: Clientes, title: 'Clientes | Costalito Smart' },
      { path: 'proveedores', component: Proveedores, title: 'Proveedores | Costalito Smart' },
      { path: 'creditos', component: Creditos, title: 'Créditos y pagos | Costalito Smart' },
      { path: 'reportes', component: Reportes, title: 'Reportes | Costalito Smart' },
      { path: 'inteligencia', component: Inteligencia, title: 'Alertas y análisis | Costalito Smart' },
      { path: 'administracion', component: Administracion, title: 'Administración | Costalito Smart' },
    ],
  },
  { path: '**', redirectTo: '' }
];

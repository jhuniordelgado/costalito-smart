import { Component, inject } from '@angular/core';
import { DatosGranero } from '../../core/datos-granero';
import { EncabezadoJornada } from './componentes/encabezado-jornada/encabezado-jornada';
import { CorteDelDia } from './componentes/corte-del-dia/corte-del-dia';
import { AtajosRapidos } from './componentes/atajos-rapidos/atajos-rapidos';
import { SenalDestacada } from './componentes/senal-destacada/senal-destacada';
import { ListaPrioridades } from './componentes/lista-prioridades/lista-prioridades';

@Component({
  selector: 'app-dashboard',
  imports: [EncabezadoJornada, CorteDelDia, AtajosRapidos, SenalDestacada, ListaPrioridades],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  readonly datos = inject(DatosGranero);
}

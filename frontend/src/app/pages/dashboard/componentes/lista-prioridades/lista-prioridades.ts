import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatosGranero } from '../../../../core/datos-granero';

@Component({
  selector: 'app-lista-prioridades',
  imports: [RouterLink],
  templateUrl: './lista-prioridades.html',
  styleUrl: './lista-prioridades.css',
})
export class ListaPrioridades {
  private readonly datos = inject(DatosGranero);
  readonly prioridades = computed(() => this.datos.senales().slice(0, 3));
} 

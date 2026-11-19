import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api';

export interface Usuario {
  id: number;
  cedula: string;
  nombre: string;
  rol: 'ADMIN' | 'VENDEDOR';
}

/**
 * Quién está usando el sistema. La sesión real vive en una cookie HttpOnly que pone la
 * API; aquí solo guardamos los datos del usuario para mostrarlos y para las guardas.
 */
@Injectable({ providedIn: 'root' })
export class Sesion {
  private readonly http = inject(HttpClient);

  readonly usuario = signal<Usuario | null>(null);
  readonly iniciales = computed(() => (this.usuario()?.nombre ?? '')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase()).join(''));

  // La primera consulta a /auth/me se comparte: varias guardas pueden pedirla a la vez
  private restauracion: Promise<Usuario | null> | null = null;

  /** Al recargar la página, pregunta a la API si la cookie sigue siendo válida. */
  restaurar(): Promise<Usuario | null> {
    this.restauracion ??= firstValueFrom(this.http.get<Usuario>(`${API_URL}/auth/me`))
      .then((usuario) => {
        this.usuario.set(usuario);
        return usuario;
      })
      .catch((error: unknown) => {
        // 401 = no hay sesión. Cualquier otro error (p. ej. sin conexión) se vuelve a intentar
        if (!(error instanceof HttpErrorResponse && error.status === 401)) this.restauracion = null;
        this.usuario.set(null);
        return null;
      });
    return this.restauracion;
  }

  async iniciarSesion(cedula: string, contrasena: string): Promise<Usuario> {
    const usuario = await firstValueFrom(
      this.http.post<Usuario>(`${API_URL}/auth/login`, { cedula, contrasena }));
    this.usuario.set(usuario);
    this.restauracion = Promise.resolve(usuario);
    return usuario;
  }

  async cerrarSesion(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${API_URL}/auth/logout`, null));
    } finally {
      this.olvidar();
    }
  }

  /** Borra la sesión local (sin llamar a la API), p. ej. cuando la cookie ya venció. */
  olvidar(): void {
    this.usuario.set(null);
    this.restauracion = Promise.resolve(null);
  }
}

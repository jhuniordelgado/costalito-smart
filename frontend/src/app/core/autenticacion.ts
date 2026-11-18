import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from './api';
import { Sesion } from './sesion';

/**
 * Toda petición a la API viaja con la cookie de sesión. Si la API responde 401 en
 * una ruta del negocio (la sesión venció), se manda a la pantalla de entrada.
 */
export const interceptorSesion: HttpInterceptorFn = (peticion, siguiente) => {
  if (!peticion.url.startsWith(API_URL)) return siguiente(peticion);

  const sesion = inject(Sesion);
  const router = inject(Router);
  return siguiente(peticion.clone({ withCredentials: true })).pipe(
    catchError((error: unknown) => {
      const esRutaDeSesion = peticion.url.startsWith(`${API_URL}/auth/`) || peticion.url.startsWith(`${API_URL}/setup`);
      if (error instanceof HttpErrorResponse && error.status === 401 && !esRutaDeSesion && sesion.usuario()) {
        sesion.olvidar();
        void router.navigateByUrl('/entrar');
      }
      return throwError(() => error);
    }),
  );
};

/** Las páginas del granero solo se ven con sesión iniciada. */
// inject() solo funciona antes del primer await, por eso se toman Sesion y Router primero.
export const requiereSesion: CanActivateFn = async () => {
  const sesion = inject(Sesion);
  const router = inject(Router);
  return (await sesion.restaurar()) ? true : router.createUrlTree(['/entrar']);
};

/** Si ya hay sesión, la pantalla de entrada no tiene sentido: se va al inicio. */
export const soloSinSesion: CanActivateFn = async () => {
  const sesion = inject(Sesion);
  const router = inject(Router);
  return (await sesion.restaurar()) ? router.createUrlTree(['/']) : true;
};

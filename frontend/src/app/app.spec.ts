import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { App } from './app';
import { routes } from './app.routes';
import { API_URL } from './core/api';

describe('App', () => {
  function preparar() {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    return { http: TestBed.inject(HttpTestingController), router: TestBed.inject(Router) };
  }

  it('se crea', () => {
    preparar();
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('sin sesión, cualquier página del granero manda a la pantalla de entrada', async () => {
    const { http, router } = preparar();
    TestBed.createComponent(App);
    const navegacion = router.navigateByUrl('/ventas');
    await new Promise((resolver) => setTimeout(resolver));
    http.expectOne(`${API_URL}/auth/me`).flush({ error: 'Inicia sesión para continuar.' }, { status: 401, statusText: 'Unauthorized' });
    await navegacion;
    expect(router.url).toBe('/entrar');
  });

  it('con sesión, deja entrar a la página pedida', async () => {
    const { http, router } = preparar();
    TestBed.createComponent(App);
    const navegacion = router.navigateByUrl('/ventas');
    await new Promise((resolver) => setTimeout(resolver));
    http.expectOne(`${API_URL}/auth/me`).flush({ id: 1, cedula: '1000000001', nombre: 'Laura Prueba', rol: 'ADMIN' });
    await navegacion;
    expect(router.url).toBe('/ventas');
  });
});

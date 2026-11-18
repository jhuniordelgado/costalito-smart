import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { API_URL } from '../../core/api';
import { Sesion } from '../../core/sesion';
import { Login } from './login';

describe('Login (Fail-Fast)', () => {
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;
  const raiz = () => fixture.nativeElement as HTMLElement;
  const campo = (id: string) => raiz().querySelector('#' + id) as HTMLInputElement;

  async function escribir(id: string, valor: string) {
    campo(id).value = valor;
    campo(id).dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
  }
  async function enviar() {
    raiz().querySelector('form')!.dispatchEvent(new SubmitEvent('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  }
  // tras responder el servidor, la cadena de promesas del componente tarda unos ticks en terminar
  async function esperarRespuesta() {
    await new Promise((resolver) => setTimeout(resolver));
    await fixture.whenStable();
    fixture.detectChanges();
  }
  const texto = (selector: string) => raiz().querySelector(selector)?.textContent?.trim() ?? null;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    // al abrir, la pantalla pregunta si la base ya tiene usuarios
    http.expectOne(`${API_URL}/setup`).flush({ necesitaAdministrador: false });
    await esperarRespuesta();
  });

  it('en la cédula no entran letras, puntos ni espacios', async () => {
    await escribir('cedula', '12a.3 4-5');
    expect(campo('cedula').value).toBe('12345');
    expect(texto('#ayuda-cedula')).toContain('solo lleva números');
  });

  it('cédula: una letra tecleada se bloquea antes de verse y avisa', async () => {
    expect(await teclear('cedula', 'x')).toBe(true);
    expect(await teclear('cedula', '.')).toBe(true);
    expect(await teclear('cedula', '4')).toBe(false);
    expect(texto('#ayuda-cedula')).toContain('solo lleva números');
  });

  it('pegar una cédula con puntos la deja solo con dígitos', async () => {
    await escribir('cedula', '1.000.000.001');
    expect(campo('cedula').value).toBe('1000000001');
  });

  it('enviar vacío marca los dos campos y NO hace ninguna petición', async () => {
    await enviar();
    expect(texto('#ayuda-cedula')).toContain('Escribe tu cédula');
    expect(texto('#error-contrasena')).toContain('Escribe tu contraseña');
    http.expectNone(`${API_URL}/auth/login`);
  });

  it('cédula demasiado corta: se cancela sin petición', async () => {
    await escribir('cedula', '123');
    await escribir('contrasena', 'algo');
    await enviar();
    expect(texto('#ayuda-cedula')).toContain('entre 5 y 20');
    http.expectNone(`${API_URL}/auth/login`);
  });

  it('contraseña vacía: se cancela sin petición', async () => {
    await escribir('cedula', '1000000001');
    await enviar();
    expect(texto('#error-contrasena')).toContain('Escribe tu contraseña');
    http.expectNone(`${API_URL}/auth/login`);
  });

  it('datos válidos: SÍ viaja una petición POST con cédula y contraseña, y se inicia la sesión', async () => {
    await escribir('cedula', '1000000001');
    await escribir('contrasena', 'ClaveDePrueba1');
    await enviar();
    const peticion = http.expectOne(`${API_URL}/auth/login`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ cedula: '1000000001', contrasena: 'ClaveDePrueba1' });
    peticion.flush({ id: 1, cedula: '1000000001', nombre: 'Laura', rol: 'ADMIN' });
    await esperarRespuesta();
    expect(TestBed.inject(Sesion).usuario()?.nombre).toBe('Laura');
  });

  it('si la API rechaza las credenciales: muestra su mensaje, conserva la cédula y borra la contraseña', async () => {
    await escribir('cedula', '1000000001');
    await escribir('contrasena', 'mala');
    await enviar();
    http.expectOne(`${API_URL}/auth/login`).flush(
      { error: 'Cédula o contraseña incorrectos' }, { status: 401, statusText: 'Unauthorized' });
    await esperarRespuesta();
    expect(texto('.aviso-servidor')).toBe('Cédula o contraseña incorrectos');
    expect(campo('cedula').value).toBe('1000000001');
    expect(campo('contrasena').value).toBe('');
    expect(TestBed.inject(Sesion).usuario()).toBeNull();
  });

  it('si el servidor no responde: mensaje claro de conexión', async () => {
    await escribir('cedula', '1000000001');
    await escribir('contrasena', 'algo');
    await enviar();
    http.expectOne(`${API_URL}/auth/login`).error(new ProgressEvent('error'));
    await esperarRespuesta();
    expect(texto('.aviso-servidor')).toContain('No hay conexión con el servidor');
  });

  // Simula la tecla ANTES de que llegue al campo; devuelve true si el formulario la bloqueó
  async function teclear(id: string, caracter: string): Promise<boolean> {
    const evento = new InputEvent('beforeinput', { data: caracter, inputType: 'insertText', cancelable: true });
    campo(id).dispatchEvent(evento);
    await fixture.whenStable();
    fixture.detectChanges();
    return evento.defaultPrevented;
  }

  it('el botón Mostrar alterna entre ver y ocultar la contraseña', async () => {
    expect(campo('contrasena').type).toBe('password');
    (raiz().querySelector('.ver-clave') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(campo('contrasena').type).toBe('text');
  });

  describe('instalación nueva (sin usuarios)', () => {
    async function abrirSinUsuarios() {
      fixture = TestBed.createComponent(Login);
      fixture.detectChanges();
      http.expectOne(`${API_URL}/setup`).flush({ necesitaAdministrador: true });
      await esperarRespuesta();
    }
    const llenar = async (id: string, valor: string) => {
      campo(id).value = valor;
      campo(id).dispatchEvent(new Event('input'));
    };

    it('cédula del administrador: las letras se bloquean antes de verse', async () => {
      await abrirSinUsuarios();
      expect(await teclear('admin-cedula', 'a')).toBe(true);
      expect(await teclear('admin-cedula', '7')).toBe(false);
      expect(raiz().textContent).toContain('solo lleva números');
    });

    it('nombre: los números y símbolos se bloquean; letras con tilde, ñ y espacios sí entran', async () => {
      await abrirSinUsuarios();
      expect(await teclear('admin-nombre', '5')).toBe(true);
      expect(await teclear('admin-nombre', '@')).toBe(true);
      expect(raiz().textContent).toContain('solo lleva letras');
      for (const letra of ['á', 'ñ', 'Ü', ' ', 'z']) expect(await teclear('admin-nombre', letra)).toBe(false);
    });

    it('nombre: lo escrito en minúsculas se ve en MAYÚSCULAS', async () => {
      await abrirSinUsuarios();
      await escribir('admin-nombre', 'laura peña');
      expect(campo('admin-nombre').value).toBe('LAURA PEÑA');
    });

    it('al enviar, lim() quita los espacios sobrantes del nombre (trim)', async () => {
      await abrirSinUsuarios();
      await llenar('admin-cedula', '1000000001');
      await llenar('admin-nombre', 'laura prueba   ');
      await llenar('admin-contrasena', 'ClaveDePrueba1');
      await llenar('admin-repetir', 'ClaveDePrueba1');
      await enviar();
      const crear = http.expectOne(`${API_URL}/setup/admin`);
      // la contraseña viaja tal cual: lim() no la toca
      expect(crear.request.body).toEqual({ cedula: '1000000001', nombre: 'LAURA PRUEBA', contrasena: 'ClaveDePrueba1' });
    });

    it('texto mezclado de golpe (pegado o autocompletado): entra y se queda solo lo válido', async () => {
      await abrirSinUsuarios();
      expect(await teclear('admin-nombre', 'Ana2')).toBe(false);
      expect(await teclear('admin-nombre', '###')).toBe(true);
    });

    it('nombre pegado con números y espacios de más: queda solo con letras', async () => {
      await abrirSinUsuarios();
      await escribir('admin-nombre', '  Laura2   Pérez#3 ');
      expect(campo('admin-nombre').value).toBe('LAURA PÉREZ ');
      expect(raiz().textContent).toContain('solo lleva letras');
    });

    it('muestra "Crea el administrador" en vez de "Entrar"', async () => {
      await abrirSinUsuarios();
      expect(texto('h2')).toBe('Crea el administrador');
      expect(campo('cedula')).toBeNull();
    });

    it('Fail-Fast: datos malos o contraseñas distintas no viajan a la API', async () => {
      await abrirSinUsuarios();
      await llenar('admin-cedula', '12ab');
      expect(campo('admin-cedula').value).toBe('12');
      await llenar('admin-contrasena', 'ClaveLarga1');
      await llenar('admin-repetir', 'OtraClave22');
      await enviar();
      http.expectNone(`${API_URL}/setup/admin`);
      const t = raiz().textContent ?? '';
      expect(t).toContain('entre 5 y 20 dígitos');
      expect(t).toContain('Escribe el nombre completo');
      expect(t).toContain('Las contraseñas no coinciden');
    });

    it('datos válidos: crea el administrador y entra con esos mismos datos', async () => {
      await abrirSinUsuarios();
      await llenar('admin-cedula', '1000000001');
      await llenar('admin-nombre', 'Laura Prueba');
      await llenar('admin-contrasena', 'ClaveDePrueba1');
      await llenar('admin-repetir', 'ClaveDePrueba1');
      await enviar();
      const crear = http.expectOne(`${API_URL}/setup/admin`);
      expect(crear.request.body).toEqual({ cedula: '1000000001', nombre: 'LAURA PRUEBA', contrasena: 'ClaveDePrueba1' });
      crear.flush({ id: 1, cedula: '1000000001', nombre: 'Laura Prueba', rol: 'ADMIN' }, { status: 201, statusText: 'Created' });
      await esperarRespuesta();
      const entrar = http.expectOne(`${API_URL}/auth/login`);
      expect(entrar.request.body).toEqual({ cedula: '1000000001', contrasena: 'ClaveDePrueba1' });
      entrar.flush({ id: 1, cedula: '1000000001', nombre: 'Laura Prueba', rol: 'ADMIN' });
      await esperarRespuesta();
      expect(TestBed.inject(Sesion).usuario()?.nombre).toBe('Laura Prueba');
    });

    it('si alguien ya creó un usuario (409), vuelve al formulario normal con el aviso', async () => {
      await abrirSinUsuarios();
      await llenar('admin-cedula', '1000000001');
      await llenar('admin-nombre', 'Laura Prueba');
      await llenar('admin-contrasena', 'ClaveDePrueba1');
      await llenar('admin-repetir', 'ClaveDePrueba1');
      await enviar();
      http.expectOne(`${API_URL}/setup/admin`).flush({ error: 'El sistema ya tiene usuarios: inicia sesión' }, { status: 409, statusText: 'Conflict' });
      await esperarRespuesta();
      expect(texto('h2')).toBe('Entra a tu granero');
      expect(raiz().textContent).toContain('El sistema ya tiene usuarios');
    });
  });
});

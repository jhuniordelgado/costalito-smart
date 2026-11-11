import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { mensajeDe } from '../../core/format';
import { Session } from '../../core/session';
import {
  CEDULA_MAXIMA, soloDigitos, validarCedula, validarContrasena, validarContrasenaNueva, validarNombre,
} from '../../core/validators';

type ErroresAdministrador = Partial<Record<'cedula' | 'nombre' | 'contrasena' | 'repetir', string>>;

/**
 * Pantalla de entrada. Fail-Fast: cada dato se revisa en el navegador y, si algo no
 * corresponde, la operación se cancela de inmediato y NO se envía nada al servidor.
 *  - En la cédula, los caracteres que no son números ni siquiera se dejan escribir.
 *  - Al enviar, se revisa todo junto; si hay un error, se marca el campo y se frena.
 * Solo un formulario válido viaja por HTTP a Java, que vuelve a validarlo.
 *
 * Instalación nueva: si la base no tiene ningún usuario, en vez de "Entrar" se muestra
 * "Crea el administrador" (Java solo lo permite mientras no exista nadie).
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly sesion = inject(Session);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  private readonly campoCedula = viewChild<ElementRef<HTMLInputElement>>('campoCedula');
  private readonly campoContrasena = viewChild<ElementRef<HTMLInputElement>>('campoContrasena');

  // true = base recién creada, sin usuarios: toca crear el administrador
  readonly necesitaAdministrador = signal(false);
  readonly erroresAdministrador = signal<ErroresAdministrador>({});

  readonly cedulaMaxima = CEDULA_MAXIMA;
  readonly cedula = signal('');
  readonly contrasena = signal('');
  readonly verContrasena = signal(false);
  readonly enviando = signal(false);

  readonly errorCedula = signal<string | null>(null);
  readonly errorContrasena = signal<string | null>(null);
  // lo que responde Java (credenciales incorrectas, demasiados intentos, sin conexión...)
  readonly errorServidor = signal<string | null>(null);

  constructor() {
    afterNextRender(() => this.campoCedula()?.nativeElement.focus());
    void this.revisarInstalacion();
  }

  private async revisarInstalacion(): Promise<void> {
    try {
      const respuesta = await firstValueFrom(this.http.get<{ necesitaAdministrador: boolean }>('/api/setup'));
      this.necesitaAdministrador.set(respuesta.necesitaAdministrador);
    } catch {
      // sin servidor se queda el formulario normal, que muestra el error al intentar entrar
    }
  }

  // Cédula del administrador: igual que en el login, solo dígitos
  alEscribirCedulaAdministrador(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    campo.value = soloDigitos(campo.value).slice(0, CEDULA_MAXIMA);
  }

  async crearAdministrador(evento: SubmitEvent): Promise<void> {
    evento.preventDefault();
    if (this.enviando()) return;
    const v = new FormData(evento.currentTarget as HTMLFormElement);
    const cedula = String(v.get('cedula') ?? '');
    const nombre = String(v.get('nombre') ?? '');
    const contrasena = String(v.get('contrasena') ?? '');
    const repetir = String(v.get('repetir') ?? '');

    // Fail-Fast: las reglas de EmployeeService.java. Si algo falla, no viaja nada
    const errores: ErroresAdministrador = {
      cedula: validarCedula(cedula) ?? undefined,
      nombre: validarNombre(nombre) ?? undefined,
      contrasena: validarContrasenaNueva(contrasena) ?? undefined,
      repetir: contrasena !== repetir ? 'Las contraseñas no coinciden.' : undefined,
    };
    this.erroresAdministrador.set(errores);
    if (Object.values(errores).some(Boolean)) return;

    this.enviando.set(true);
    this.errorServidor.set(null);
    try {
      await firstValueFrom(this.http.post('/api/setup/admin', { cedula, nombre: nombre.trim(), contrasena }));
      // creado: se entra de una vez con esos datos
      await this.sesion.iniciarSesion(cedula, contrasena);
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.errorServidor.set(mensajeDe(error));
      // 409 = alguien ya creó un usuario: se vuelve al formulario normal
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.necesitaAdministrador.set(false);
      }
    } finally {
      this.enviando.set(false);
    }
  }

  // Se ejecuta con cada tecla: deja pasar solo dígitos
  alEscribirCedula(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const limpia = soloDigitos(campo.value).slice(0, CEDULA_MAXIMA);
    if (limpia !== campo.value) {
      campo.value = limpia;
      this.errorCedula.set('La cédula solo lleva números, sin puntos ni espacios.');
    } else {
      this.errorCedula.set(null);
    }
    this.cedula.set(limpia);
    this.errorServidor.set(null);
  }

  alEscribirContrasena(evento: Event): void {
    this.contrasena.set((evento.target as HTMLInputElement).value);
    this.errorContrasena.set(null);
    this.errorServidor.set(null);
  }

  async entrar(evento: SubmitEvent): Promise<void> {
    evento.preventDefault();
    if (this.enviando()) return;

    const errorCedula = validarCedula(this.cedula());
    const errorContrasena = validarContrasena(this.contrasena());
    this.errorCedula.set(errorCedula);
    this.errorContrasena.set(errorContrasena);
    if (errorCedula || errorContrasena) {
      // Fail-Fast: se cancela aquí. No hay petición HTTP.
      (errorCedula ? this.campoCedula() : this.campoContrasena())?.nativeElement.focus();
      return;
    }

    this.enviando.set(true);
    this.errorServidor.set(null);
    try {
      await this.sesion.iniciarSesion(this.cedula(), this.contrasena());
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.errorServidor.set(mensajeDe(error));
      // La cédula se conserva para no obligar a escribirla otra vez; la contraseña no
      this.contrasena.set('');
      this.campoContrasena()?.nativeElement.focus();
    } finally {
      this.enviando.set(false);
    }
  }
}

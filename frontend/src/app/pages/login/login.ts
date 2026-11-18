import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_URL } from '../../core/api';
import { mensajeDe } from '../../core/formato';
import { Sesion } from '../../core/sesion';
import {
  CEDULA_MAXIMA, NO_ES_DIGITO, NO_ES_LETRA, NOMBRE_MAXIMO, lim, soloDigitos, soloLetras,
  validarCedula, validarContrasena, validarContrasenaNueva, validarNombre,
} from '../../core/validaciones';

const MENSAJE_CEDULA = 'La cédula solo lleva números, sin puntos ni espacios.';
const MENSAJE_NOMBRE = 'El nombre solo lleva letras, sin números ni símbolos.';

type ErroresAdministrador = Partial<Record<'cedula' | 'nombre' | 'contrasena' | 'repetir', string>>;

/**
 * Pantalla de entrada. Fail-Fast: cada dato se revisa en el navegador y, si algo no
 * corresponde, la operación se cancela de inmediato y NO se envía nada al servidor.
 *  - En la cédula, los caracteres que no son números ni siquiera se dejan escribir.
 *  - Al enviar, se revisa todo junto; si hay un error, se marca el campo y se frena.
 * Solo un formulario válido viaja por HTTP a la API (ASP.NET Core), que vuelve a validarlo.
 *
 * Instalación nueva: si la base no tiene ningún usuario, en vez de "Entrar" se muestra
 * "Crea el administrador" (la API solo lo permite mientras no exista nadie).
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly sesion = inject(Sesion);
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
  // lo que responde la API (credenciales incorrectas, demasiados intentos, sin conexión...)
  readonly errorServidor = signal<string | null>(null);

  constructor() {
    afterNextRender(() => this.campoCedula()?.nativeElement.focus());
    void this.revisarInstalacion();
  }

  private async revisarInstalacion(): Promise<void> {
    try {
      const respuesta = await firstValueFrom(this.http.get<{ necesitaAdministrador: boolean }>(`${API_URL}/setup`));
      this.necesitaAdministrador.set(respuesta.necesitaAdministrador);
    } catch {
      // sin servidor se queda el formulario normal, que muestra el error al intentar entrar
    }
  }

  /**
   * Primera barrera, ANTES de que el carácter aparezca en el campo: si no está permitido,
   * se cancela la tecla y nunca se ve. Devuelve true si se bloqueó algo.
   * Pegar texto o el autocompletado no siempre pasan por aquí; para eso está la segunda
   * barrera en los métodos alEscribir..., que limpian el valor completo.
   */
  private bloquear(evento: Event, prohibido: RegExp): boolean {
    const datos = (evento as InputEvent).data;
    // Solo se bloquea si TODO lo que entra es inválido (una tecla suelta, normalmente).
    // Si llega texto mezclado ("12ab" pegado o autocompletado), entra y alEscribir...
    // le quita lo inválido, para no perder los caracteres buenos.
    if (datos && [...datos].every((caracter) => prohibido.test(caracter))) {
      evento.preventDefault();
      return true;
    }
    return false;
  }

  private marcarErrorAdministrador(campo: 'cedula' | 'nombre', mensaje: string | undefined): void {
    this.erroresAdministrador.update((errores) => ({ ...errores, [campo]: mensaje }));
  }

  antesDeEscribirCedula(evento: Event): void {
    if (this.bloquear(evento, NO_ES_DIGITO)) this.errorCedula.set(MENSAJE_CEDULA);
  }

  antesDeEscribirCedulaAdministrador(evento: Event): void {
    if (this.bloquear(evento, NO_ES_DIGITO)) this.marcarErrorAdministrador('cedula', MENSAJE_CEDULA);
  }

  antesDeEscribirNombre(evento: Event): void {
    if (this.bloquear(evento, NO_ES_LETRA)) this.marcarErrorAdministrador('nombre', MENSAJE_NOMBRE);
  }

  // Cédula del administrador: igual que en el login, solo dígitos
  alEscribirCedulaAdministrador(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const limpia = soloDigitos(campo.value).slice(0, CEDULA_MAXIMA);
    const habiaInvalidos = limpia !== campo.value;
    campo.value = limpia;
    if (habiaInvalidos) this.marcarErrorAdministrador('cedula', MENSAJE_CEDULA);
    else if (this.erroresAdministrador().cedula === MENSAJE_CEDULA) this.marcarErrorAdministrador('cedula', undefined);
  }

  // Nombre: solo letras (con tildes y ñ), un espacio entre palabras y en MAYÚSCULAS.
  // El trim() del final se hace al enviar con lim(): si se hiciera aquí, no se podría
  // escribir el espacio que separa el nombre del apellido.
  alEscribirNombre(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const original = campo.value;
    const limpio = soloLetras(original).toLocaleUpperCase('es-CO').slice(0, NOMBRE_MAXIMO);
    // Si solo se quitó un espacio de más no es un error, no hace falta avisar
    const habiaInvalidos = NO_ES_LETRA.test(original);
    if (limpio !== original) {
      // Al cambiar el valor el cursor saltaría al final; se deja donde estaba
      const cursor = Math.max(0, (campo.selectionStart ?? limpio.length) - (original.length - limpio.length));
      campo.value = limpio;
      campo.setSelectionRange(cursor, cursor);
    }
    if (habiaInvalidos) this.marcarErrorAdministrador('nombre', MENSAJE_NOMBRE);
    else if (this.erroresAdministrador().nombre === MENSAJE_NOMBRE) this.marcarErrorAdministrador('nombre', undefined);
  }

  async crearAdministrador(evento: SubmitEvent): Promise<void> {
    evento.preventDefault();
    if (this.enviando()) return;
    const v = new FormData(evento.currentTarget as HTMLFormElement);
    // lim() = trim() + mayúsculas. La contraseña se envía tal cual la escribió la persona
    const cedula = lim(String(v.get('cedula') ?? ''));
    const nombre = lim(String(v.get('nombre') ?? ''));
    const contrasena = String(v.get('contrasena') ?? '');
    const repetir = String(v.get('repetir') ?? '');

    // Fail-Fast: las mismas reglas de AutenticacionService.cs. Si algo falla, no viaja nada
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
      await firstValueFrom(this.http.post(`${API_URL}/setup/admin`, { cedula, nombre, contrasena }));
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
      this.errorCedula.set(MENSAJE_CEDULA);
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

    this.cedula.set(lim(this.cedula()));
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

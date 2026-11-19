// Mismas reglas que AutenticacionService.cs en la API. El navegador frena rápido (Fail-Fast)
// y la API vuelve a revisar, porque cualquiera podría saltarse el formulario.

export const CEDULA_MINIMA = 5;
export const CEDULA_MAXIMA = 20;
export const NOMBRE_MAXIMO = 100;
export const CONTRASENA_MINIMA = 8;
export const CONTRASENA_MAXIMA = 128;

// Un carácter que NO puede entrar en el campo
export const NO_ES_DIGITO = /\D/;
export const NO_ES_LETRA = /[^\p{L} ]/u; // \p{L} = cualquier letra, con tildes y ñ incluidas

export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/**
 * Limpia un texto antes de validarlo y enviarlo: trim() quita los espacios de los
 * extremos, los espacios repetidos quedan en uno solo y todo pasa a MAYÚSCULAS.
 *   lim('  ana   maría ') → 'ANA MARÍA'
 * No se usa en contraseñas: cambiarlas a mayúsculas haría que dejaran de coincidir.
 */
export function lim(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-CO');
}

/** Deja solo letras y un espacio entre palabras (sin espacio al inicio). */
export function soloLetras(valor: string): string {
  return valor.replace(/[^\p{L} ]/gu, '').replace(/ {2,}/g, ' ').replace(/^ /, '');
}

export function validarCedula(cedula: string): string | null {
  if (!cedula) return 'Escribe tu cédula.';
  if (!/^\d+$/.test(cedula)) return 'La cédula solo lleva números, sin puntos ni espacios.';
  if (cedula.length < CEDULA_MINIMA || cedula.length > CEDULA_MAXIMA) {
    return `La cédula debe tener entre ${CEDULA_MINIMA} y ${CEDULA_MAXIMA} dígitos.`;
  }
  return null;
}

export function validarContrasena(contrasena: string): string | null {
  return contrasena ? null : 'Escribe tu contraseña.';
}

export function validarContrasenaNueva(contrasena: string): string | null {
  if (contrasena.length < CONTRASENA_MINIMA) return `La contraseña debe tener mínimo ${CONTRASENA_MINIMA} caracteres.`;
  if (contrasena.length > CONTRASENA_MAXIMA) return `La contraseña admite máximo ${CONTRASENA_MAXIMA} caracteres.`;
  return null;
}

export function validarNombre(nombre: string): string | null {
  const limpio = nombre.trim();
  if (!limpio) return 'Escribe el nombre completo.';
  if (!/^\p{L}+( \p{L}+)*$/u.test(limpio)) return 'El nombre solo lleva letras, sin números ni símbolos.';
  if (limpio.length > NOMBRE_MAXIMO) return `El nombre admite máximo ${NOMBRE_MAXIMO} caracteres.`;
  return null;
}

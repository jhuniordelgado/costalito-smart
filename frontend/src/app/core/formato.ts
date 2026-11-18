import { HttpErrorResponse } from '@angular/common/http';

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function pesos(valor: number): string {
  return formatoPesos.format(valor);
}

export function plural(cantidad: number, singular: string, plural: string): string {
  return cantidad === 1 ? singular : plural;
}

/** Convierte errores de la API, de red o de JavaScript en un mensaje para el usuario. */
export function mensajeDe(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const mensaje = error.error?.error;
    const detalle = error.error?.detalle;

    if (typeof mensaje === 'string' && typeof detalle === 'string') {
      const lineaUtil = detalle
        .split(/\r?\n/)
        .map((linea: string) => linea.trim())
        .find((linea: string) =>
          /Exception:|error SQL|Cannot|Invalid|Violation|The .* statement conflicted/i.test(linea),
        );

      return lineaUtil ? `${mensaje} (${lineaUtil.slice(0, 240)})` : mensaje;
    }

    if (typeof mensaje === 'string') {
      return mensaje;
    }

    if (error.status === 0) {
      return 'No hay conexión con el servidor. Revisa que el backend esté iniciado e inténtalo de nuevo.';
    }

    return 'No se pudo completar la operación. Inténtalo de nuevo.';
  }

  return error instanceof Error
    ? error.message
    : 'Ocurrió un problema inesperado.';
}

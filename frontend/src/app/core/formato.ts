0const formatoPesos = new Intl.NumberFormat('es-CO', {
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

export function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un problema inesperado.';
}

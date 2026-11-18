export type MedioPago = 'Efectivo' | 'Nequi' | 'Fiado';
export type EstadoStock = 'Disponible' | 'Por revisar' | 'Stock bajo' | 'Agotado';
export type EstadoCompra = 'En camino' | 'Recibida' | 'Pendiente de pago';
export type TipoAviso = 'exito' | 'informacion' | 'error';

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  presentacion: string;
  unidad: string;
  existencias: number;
  minimo: number;
  precio: number;
  precioCompra: number;
  precioMayorista: number;
}

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  limite: number;
  saldoInicial: number;
  /** Lo que debe hoy. Lo calcula la API con todo el historial de fiados y abonos. */
  saldo: number;
}

export interface Proveedor {
  id: number;
  nombre: string;
  contacto: string;
  telefono: string;
  surte: string;
}

export interface LineaVenta {
  productoId: number;
  nombre: string;
  cantidad: number;
  precio: number;
}

export interface Venta {
  id: number;
  codigo: string;
  cliente: string;
  clienteId: number | null;
  hora: Date;
  total: number;
  pago: MedioPago;
  lineas: LineaVenta[];
}

export interface Compra {
  id: number;
  codigo: string;
  proveedorId: number;
  fecha: Date;
  total: number;
  estado: EstadoCompra;
  detalle: string;
  productoId?: number;
  cantidad?: number;
}

export interface Abono {
  id: number;
  clienteId: number;
  monto: number;
  fecha: Date;
}

export interface Granero {
  nombre: string;
  direccion: string;
  apertura: string;
  cierre: string;
}

export interface Senal {
  clave: 'ia' | 'existencias' | 'fiados' | 'movimiento' | 'compras';
  rotulo: string;
  titulo: string;
  detalle: string;
  ruta: string;
  enlace: string;
  /** Parte de la página a la que lleva el enlace (p. ej. 'predicciones'). */
  fragmento?: string;
}

/** Urgencias que devuelve el servicio inteligente, de mayor a menor. */
export type UrgenciaIa = 'agotado' | 'alta' | 'media' | 'baja' | 'sin movimiento';

export interface PrediccionProducto {
  codigo: string;
  producto: string;
  metodo: string;
  urgencia: UrgenciaIa;
  comprarAhora: boolean;
  /** "ahora", "hoy", "en 3 días", "no hace falta" */
  cuando: string;
  fechaCompra: string | null;
  cantidadSugerida: number;
  demandaSemanalPrevista: number;
  /** Unidades vendidas en las últimas 4 semanas completas, de la más antigua a la más reciente. */
  ultimasSemanas: number[];
  /** Lunes de la primera de esas 4 semanas (AAAA-MM-DD). */
  semanasDesde: string | null;
  existencias: number;
  enCamino: number;
  diasEntrega: number;
  diasParaAgotarse: number | null;
  explicacion: string;
}

export interface PrediccionesIa {
  /** false si el servicio de Python no responde; `mensaje` explica qué hacer. */
  disponible: boolean;
  mensaje: string | null;
  consultado: Date;
  metodo: string | null;
  usaRedNeuronal: boolean;
  datos: {
    semanasCompletas: number;
    semanasNecesarias: number;
    sePuedeEntrenar: boolean;
    primeraVenta: string | null;
    ultimaVenta: string | null;
    entrenamientoPosibleDesde: string | null;
  } | null;
  modelo: {
    version: string | null;
    entrenado: string | null;
    maeRedNeuronal: number | null;
    maePromedioMovil: number | null;
    usarRed: boolean;
  } | null;
  recomendaciones: PrediccionProducto[];
  sinDatosSuficientes: string[];
}

export interface NuevoProducto extends Omit<Producto, 'id' | 'existencias'> {
  existencias: number;
}

export interface NuevaVenta {
  clienteId: number | null;
  pago: MedioPago;
  lineas: LineaVenta[];
}

export interface NuevaCompra {
  proveedorId: number;
  productoId: number;
  cantidad: number;
  costoUnitario: number;
  estado: EstadoCompra;
  codigo?: string;
  fechaVencimiento?: string;
}

export interface NuevoCliente {
  nombre: string;
  cedula?: string;
  telefono: string;
  limite: number;
}

export interface NuevoProveedor {
  nombre: string;
  contacto: string;
  telefono: string;
  surte: string;
}

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  titulo: string;
  detalle: string;
}

export type MedioPago = 'Efectivo' | 'Nequi' | 'Fiado';
export type EstadoStock = 'Disponible' | 'Por revisar' | 'Stock bajo' | 'Agotado';
export type EstadoCompra = 'En camino' | 'Recibida' | 'Pendiente de pago';
export type TipoAviso = 'exito' | 'informacion' | 'error';

export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  unidad: string;
  existencias: number;
  minimo: number;
  precio: number;
}

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  limite: number;
  saldoInicial: number;
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
  clave: 'existencias' | 'fiados' | 'movimiento' | 'compras';
  rotulo: string;
  titulo: string;
  detalle: string;
  ruta: string;
  enlace: string;
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
}

export interface NuevoCliente {
  nombre: string;
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

// Tipos para el sistema TODAFRU

// Enums
export type TipoCliente = 'MAYORISTA' | 'MINORISTA';
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE';
export type EstadoPedido = 'PENDIENTE' | 'CONFIRMADO' | 'EN_PROCESO' | 'COMPLETADO' | 'ANULADO';
export type EstadoCuenta = 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO' | 'ANULADO';
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'TARJETA' | 'YAPE' | 'PLIN' | 'OTRO';

// Interfaces base
export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnidadMedida {
  id: string;
  nombre: string;
  simbolo: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Proveedor types moved to src/types/proveedor.ts

export interface Cliente {
  id: string;
  nombre: string;
  ruc?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string;
  tipoCliente: TipoCliente;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Producto {
  id: string;
  nombre: string;
  sku?: string;
  descripcion?: string;
  categoriaId: string;
  unidadMedidaId: string;
  precio: number;
  stock: number;
  stockMinimo: number;
  perecedero: boolean;
  diasVencimiento?: number;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  categoria?: Categoria;
  unidadMedida?: UnidadMedida;
}

export interface MovimientoInventario {
  id: string;
  productoId: string;
  tipo: TipoMovimiento;
  cantidad: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  precio?: number;
  motivo?: string;
  numeroGuia?: string;
  archivoGuia?: string;
  pedidoCompraId?: string;
  pedidoVentaId?: string;
  usuarioId: string;
  createdAt: Date;
  producto?: Producto;
}

export interface PedidoCompra {
  id: string;
  numero: string;
  proveedorId: string;
  fecha: Date;
  fechaEntrega?: Date;
  subtotal: number;
  impuestos: number;
  total: number;
  estado: EstadoPedido;
  observaciones?: string;
  numeroGuia?: string;
  archivoGuia?: string;
  usuarioId: string;
  createdAt: Date;
  updatedAt: Date;
  proveedor?: Proveedor;
  items?: PedidoCompraItem[];
}

export interface PedidoCompraItem {
  id: string;
  pedidoId: string;
  productoId: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  producto?: Producto;
}

export interface PedidoVenta {
  id: string;
  numero: string;
  clienteId: string;
  fecha: Date;
  fechaEntrega?: Date;
  subtotal: number;
  impuestos: number;
  total: number;
  estado: EstadoPedido;
  observaciones?: string;
  numeroGuia?: string;
  archivoGuia?: string;
  usuarioId: string;
  createdAt: Date;
  updatedAt: Date;
  cliente?: Cliente;
  items?: PedidoVentaItem[];
}

export interface PedidoVentaItem {
  id: string;
  pedidoId: string;
  productoId: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  producto?: Producto;
}

export interface CuentaPorPagar {
  id: string;
  numero: string;
  proveedorId: string;
  pedidoCompraId?: string;
  monto: number;
  montoAbonado: number;
  saldo: number;
  fechaEmision: Date;
  fechaVencimiento: Date;
  estado: EstadoCuenta;
  observaciones?: string;
  usuarioId: string;
  createdAt: Date;
  updatedAt: Date;
  proveedor?: Proveedor;
  pedidoCompra?: PedidoCompra;
  pagos?: PagoCuentaPorPagar[];
}

export interface CuentaPorCobrar {
  id: string;
  numero: string;
  clienteId: string;
  pedidoVentaId?: string;
  monto: number;
  montoAbonado: number;
  saldo: number;
  fechaEmision: Date;
  fechaVencimiento: Date;
  estado: EstadoCuenta;
  observaciones?: string;
  usuarioId: string;
  createdAt: Date;
  updatedAt: Date;
  cliente?: Cliente;
  pedidoVenta?: PedidoVenta;
  pagos?: PagoCuentaPorCobrar[];
}

export interface PagoCuentaPorPagar {
  id: string;
  cuentaPorPagarId: string;
  monto: number;
  fechaPago: Date;
  metodoPago: MetodoPago;
  numeroTransaccion?: string;
  observaciones?: string;
  usuarioId: string;
  createdAt: Date;
}

export interface PagoCuentaPorCobrar {
  id: string;
  cuentaPorCobrarId: string;
  monto: number;
  fechaPago: Date;
  metodoPago: MetodoPago;
  numeroTransaccion?: string;
  observaciones?: string;
  usuarioId: string;
  createdAt: Date;
}

// Tipos para formularios
export interface ProductoForm {
  nombre: string;
  sku?: string;
  descripcion?: string;
  categoriaId: string;
  unidadMedidaId: string;
  precio: number;
  stockMinimo: number;
  perecedero: boolean;
  diasVencimiento?: number;
}

// ProveedorForm types moved to src/types/proveedor.ts

export interface ClienteForm {
  nombre: string;
  ruc?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  contacto?: string;
  tipoCliente: TipoCliente;
}

export interface PedidoCompraForm {
  proveedorId: string;
  fechaEntrega?: Date;
  observaciones?: string;
  numeroGuia?: string;
  items: Array<{
    productoId: string;
    cantidad: number;
    precio: number;
  }>;
}

export interface PedidoVentaForm {
  clienteId: string;
  fechaEntrega?: Date;
  observaciones?: string;
  numeroGuia?: string;
  items: Array<{
    productoId: string;
    cantidad: number;
    precio: number;
  }>;
}

export interface CuentaForm {
  monto: number;
  fechaVencimiento: Date;
  observaciones?: string;
}

export interface PagoForm {
  monto: number;
  metodoPago: MetodoPago;
  numeroTransaccion?: string;
  observaciones?: string;
}

// Tipos para respuestas de API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Tipos para reportes
export interface ReporteInventario {
  producto: Producto;
  categoria: string;
  unidadMedida: string;
  stock: number;
  stockMinimo: number;
  valorInventario: number;
  ultimoMovimiento?: Date;
  estadoStock: 'NORMAL' | 'BAJO' | 'AGOTADO';
}

export interface ReporteVentas {
  fecha: Date;
  cliente: string;
  producto: string;
  cantidad: number;
  precio: number;
  total: number;
}

export interface ResumenCuentas {
  totalPorCobrar: number;
  totalPorPagar: number;
  vencidas: number;
  porVencer: number;
}

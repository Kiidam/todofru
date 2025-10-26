export type CategoriaSummary = {
  id: string;
  nombre: string;
};

export type UnidadMedidaSummary = {
  id: string;
  nombre: string;
  simbolo: string;
};

export type ProductoDTO = {
  id: string;
  nombre: string;
  sku: string | null;
  descripcion: string | null;
  categoria: CategoriaSummary | null;
  unidadMedida: UnidadMedidaSummary | null;
  precio: number;
  stock: number;
  stockMinimo: number;
  perecedero: boolean;
  diasVencimiento?: number | null;
  tieneIGV: boolean;
};

export type InventarioProductoDTO = ProductoDTO & {
  estado: 'Agotado' | 'Stock Bajo' | 'Normal';
  valorStock: number;
};

export type InventarioMovimientoDTO = {
  id: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  motivo?: string | null;
  numeroGuia?: string | null;
  createdAt: string | Date;
  producto: { nombre: string; sku: string | null };
  usuario: { name: string | null };
};

export type InventarioEstadisticasDTO = {
  totalProductos: number;
  productosStockBajo: number;
  productosSinStock: number;
  valorTotalInventario: number;
};

export type InventarioSyncValidationIssue = {
  code: string;
  message: string;
};

export type InventarioSyncValidationDTO = {
  ok: boolean;
  issues: InventarioSyncValidationIssue[];
  summary?: string;
};
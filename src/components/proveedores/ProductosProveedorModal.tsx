import React from 'react';
import { X, Package, Calendar, DollarSign, TrendingUp, ShoppingCart, FileText } from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  sku: string | null;
  precio: number;
  stock: number;
  stockMinimo: number;
  tieneIGV: boolean;
  activo: boolean;
  estadisticas: {
    totalCompras: number;
    cantidadTotal: number;
    precioPromedio: number;
    montoTotal: number;
    primeraCompra: string;
    ultimaCompra: string;
  };
}

interface PedidoItem {
  productoId: string;
  productoNombre: string;
  productoSku: string | null;
  cantidad: number;
  precio: number;
  subtotal: number;
}

interface Pedido {
  id: string;
  numero: string;
  fecha: string;
  fechaEntrega: string | null;
  total: number;
  observaciones: string | null;
  items: PedidoItem[];
}

interface Estadisticas {
  totalProductos: number;
  totalCompras: number;
  montoTotalCompras: number;
  cantidadTotalProductos: number;
  primeraCompra: string | null;
  ultimaCompra: string | null;
}

interface Proveedor {
  id: string;
  nombre: string;
  numeroIdentificacion: string;
  ruc: string | null;
}

export interface ProductosData {
  proveedor: Proveedor;
  productos: Producto[];
  historial: Pedido[];
  estadisticas: Estadisticas;
}

interface ProductosProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ProductosData | null;
  isLoading: boolean;
}

const ProductosProveedorModal: React.FC<ProductosProveedorModalProps> = ({
  isOpen,
  onClose,
  data,
  isLoading
}) => {
  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Productos del Proveedor
              </h2>
              {data && (
                <p className="text-sm text-gray-600">
                  {data.proveedor.nombre} - {data.proveedor.numeroIdentificacion}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Cargando productos...</span>
              </div>
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Error al cargar los datos</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Estadísticas generales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Total Productos</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {data.estadisticas.totalProductos}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Total Compras</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {data.estadisticas.totalCompras}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Cantidad Total</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900 mt-1">
                    {data.estadisticas.cantidadTotalProductos.toLocaleString()}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-5 h-5 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Monto Total</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-900 mt-1">
                    {formatCurrency(data.estadisticas.montoTotalCompras)}
                  </p>
                </div>
              </div>

              {/* Lista de productos */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Productos Suministrados ({data.productos.length})
                </h3>
                {data.productos.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No hay productos registrados</p>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Producto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Stock Actual
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Compras
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cantidad Total
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Precio Promedio
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Última Compra
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {data.productos.map((producto) => (
                            <tr key={producto.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {producto.nombre}
                                  </div>
                                  {producto.sku && (
                                    <div className="text-sm text-gray-500">
                                      SKU: {producto.sku}
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      producto.activo 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {producto.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                    {producto.tieneIGV && (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                        IGV
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {producto.stock.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Mín: {producto.stockMinimo.toLocaleString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {producto.estadisticas.totalCompras} compras
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {producto.estadisticas.cantidadTotal.toLocaleString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formatCurrency(producto.estadisticas.precioPromedio)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {formatDate(producto.estadisticas.ultimaCompra)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Historial de compras */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Historial de Compras ({data.historial.length})
                </h3>
                {data.historial.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No hay compras registradas</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.historial.slice(0, 10).map((pedido) => (
                      <div key={pedido.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-gray-400" />
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">
                                Pedido #{pedido.numero}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {formatDate(pedido.fecha)}
                                {pedido.fechaEntrega && (
                                  <span> • Entrega: {formatDate(pedido.fechaEntrega)}</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(pedido.total)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {pedido.items.length} producto{pedido.items.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        
                        {pedido.observaciones && (
                          <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                            <strong>Observaciones:</strong> {pedido.observaciones}
                          </div>
                        )}

                        <div className="space-y-2">
                          {pedido.items.map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <div className="flex-1">
                                <span className="text-gray-900">{item.productoNombre}</span>
                                {item.productoSku && (
                                  <span className="text-gray-500 ml-2">({item.productoSku})</span>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 text-gray-600">
                                <span>{item.cantidad.toLocaleString()} unid.</span>
                                <span>{formatCurrency(item.precio)}</span>
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(item.subtotal)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {data.historial.length > 10 && (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">
                          Mostrando las 10 compras más recientes de {data.historial.length} total
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductosProveedorModal;
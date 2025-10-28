'use client';

import { useState, useEffect } from 'react';
import { X, TrendingDown, Calendar, User, FileText, Users, AlertTriangle } from 'lucide-react';

interface PedidoVentaItem {
  id: string;
  producto: {
    id: string;
    nombre: string;
    sku?: string;
    categoria?: string;
  };
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  stockAnterior: number;
  stockNuevo: number;
  stockDisponible: number;
}

interface PedidoVenta {
  id: string;
  numeroFactura: string;
  numeroGuia?: string;
  fecha: string;
  cliente: {
    id: string;
    nombre: string;
    ruc?: string;
    email?: string;
  };
  usuario: {
    name: string;
  };
  items: PedidoVentaItem[];
  total: number;
  estado: string;
  motivo?: string;
  observaciones?: string;
  createdAt: string;
}

interface PedidoVentaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedidoId: string;
}

export default function PedidoVentaDetailModal({ 
  isOpen, 
  onClose, 
  pedidoId 
}: PedidoVentaDetailModalProps) {
  const [pedido, setPedido] = useState<PedidoVenta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && pedidoId) {
      loadPedidoDetails();
    }
  }, [isOpen, pedidoId]);

  const loadPedidoDetails = async () => {
    try {
      setLoading(true);
      
      // Simular llamada a API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Datos de ejemplo del pedido de venta
      const mockPedido: PedidoVenta = {
        id: pedidoId,
        numeroFactura: 'FV-001-00045',
        numeroGuia: 'GV-001-2024',
        fecha: '2024-01-15',
        cliente: {
          id: 'cli-1',
          nombre: 'Supermercados Plaza Vea',
          ruc: '20987654321',
          email: 'compras@plazavea.com.pe'
        },
        usuario: {
          name: 'Admin'
        },
        items: [
          {
            id: 'item-1',
            producto: {
              id: 'prod-1',
              nombre: 'Naranja Valencia',
              sku: 'NAR-VAL-001',
              categoria: 'Cítricos'
            },
            cantidad: 25,
            precioUnitario: 3.50,
            subtotal: 87.50,
            stockAnterior: 70,
            stockNuevo: 45,
            stockDisponible: 45
          },
          {
            id: 'item-2',
            producto: {
              id: 'prod-2',
              nombre: 'Mango Kent',
              sku: 'MAN-KEN-001',
              categoria: 'Frutas Tropicales'
            },
            cantidad: 15,
            precioUnitario: 5.00,
            subtotal: 75.00,
            stockAnterior: 45,
            stockNuevo: 30,
            stockDisponible: 30
          },
          {
            id: 'item-3',
            producto: {
              id: 'prod-3',
              nombre: 'Plátano Orgánico',
              sku: 'PLA-ORG-001',
              categoria: 'Frutas Tropicales'
            },
            cantidad: 20,
            precioUnitario: 2.20,
            subtotal: 44.00,
            stockAnterior: 65,
            stockNuevo: 45,
            stockDisponible: 45
          }
        ],
        total: 206.50,
        estado: 'Completado',
        motivo: 'Venta mayorista',
        observaciones: 'Entrega programada para mañana temprano',
        createdAt: '2024-01-15T16:30:00Z'
      };
      
      setPedido(mockPedido);
    } catch (error) {
      console.error('Error cargando detalles del pedido:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTotalStockReduction = () => {
    if (!pedido) return 0;
    return pedido.items.reduce((total, item) => total + item.cantidad, 0);
  };

  const hasLowStockItems = () => {
    if (!pedido) return false;
    return pedido.items.some(item => item.stockNuevo < 10);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <TrendingDown className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Detalle del Pedido de Venta
              </h2>
              <p className="text-sm text-gray-500">
                {pedido?.numeroFactura || 'Cargando...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando detalles del pedido...</p>
              </div>
            </div>
          ) : pedido ? (
            <div className="p-6 space-y-6">
              {/* Alerta de Stock Bajo */}
              {hasLowStockItems() && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <h3 className="text-sm font-medium text-yellow-800">
                      Advertencia de Stock Bajo
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-yellow-700">
                    Algunos productos tienen stock bajo después de esta venta. Considera reabastecer pronto.
                  </p>
                </div>
              )}

              {/* Información General */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-gray-600" />
                    Información del Pedido
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Número de Factura:</span>
                      <p className="text-sm text-gray-900">{pedido.numeroFactura}</p>
                    </div>
                    {pedido.numeroGuia && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Número de Guía:</span>
                        <p className="text-sm text-gray-900">{pedido.numeroGuia}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-700">Fecha:</span>
                      <p className="text-sm text-gray-900 flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                        {formatDate(pedido.fecha)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Usuario:</span>
                      <p className="text-sm text-gray-900 flex items-center">
                        <User className="h-4 w-4 mr-1 text-gray-500" />
                        {pedido.usuario.name}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Estado:</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {pedido.estado}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-gray-600" />
                    Información del Cliente
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Nombre:</span>
                      <p className="text-sm text-gray-900">{pedido.cliente.nombre}</p>
                    </div>
                    {pedido.cliente.ruc && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">RUC:</span>
                        <p className="text-sm text-gray-900">{pedido.cliente.ruc}</p>
                      </div>
                    )}
                    {pedido.cliente.email && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Email:</span>
                        <p className="text-sm text-gray-900">{pedido.cliente.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumen de Stock */}
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
                  Resumen de Reducción de Stock
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{pedido.items.length}</p>
                    <p className="text-sm text-gray-600">Productos Diferentes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">-{getTotalStockReduction()}</p>
                    <p className="text-sm text-gray-600">Unidades Vendidas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(pedido.total)}</p>
                    <p className="text-sm text-gray-600">Valor Total</p>
                  </div>
                </div>
              </div>

              {/* Productos Vendidos */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Productos Vendidos
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Producto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Precio Unit.
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock Anterior
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock Final
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pedido.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.producto.nombre}
                              </div>
                              {item.producto.sku && (
                                <div className="text-xs text-gray-500">
                                  SKU: {item.producto.sku}
                                </div>
                              )}
                              {item.producto.categoria && (
                                <div className="text-xs text-gray-500">
                                  {item.producto.categoria}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-red-600">
                              -{item.cantidad}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">
                              {formatCurrency(item.precioUnitario)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-600">
                              {item.stockAnterior}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${
                                item.stockNuevo < 10 ? 'text-red-600' : 'text-gray-900'
                              }`}>
                                {item.stockNuevo}
                              </span>
                              <div className="text-xs text-red-600">
                                (-{item.cantidad})
                              </div>
                              {item.stockNuevo < 10 && (
                                <div className="text-xs text-red-500 font-medium">
                                  Stock bajo
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(item.subtotal)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          Total del Pedido:
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-lg font-bold text-gray-900">
                            {formatCurrency(pedido.total)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Información Adicional */}
              {(pedido.motivo || pedido.observaciones) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Información Adicional
                  </h3>
                  <div className="space-y-3">
                    {pedido.motivo && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Motivo:</span>
                        <p className="text-sm text-gray-900">{pedido.motivo}</p>
                      </div>
                    )}
                    {pedido.observaciones && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Observaciones:</span>
                        <p className="text-sm text-gray-900">{pedido.observaciones}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <TrendingDown className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No se pudo cargar el pedido
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Intenta nuevamente más tarde.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
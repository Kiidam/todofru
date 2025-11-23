'use client';

import { useState, useEffect } from 'react';
import { X, Package, TrendingUp, Calendar, User, FileText, Building } from 'lucide-react';
import dynamic from 'next/dynamic';

const Modal = dynamic(() => import('../../ui/Modal'), { ssr: false });

interface PedidoCompraItem {
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
}

interface PedidoCompra {
  id: string;
  numeroFactura: string;
  fecha: string;
  proveedor: {
    id: string;
    nombre: string;
    ruc?: string;
  };
  usuario: {
    name: string;
  };
  items: PedidoCompraItem[];
  total: number;
  estado: string;
  motivo?: string;
  observaciones?: string;
  createdAt: string;
}

interface PedidoCompraDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedidoId: string;
}

export default function PedidoCompraDetailModal({ 
  isOpen, 
  onClose, 
  pedidoId 
}: PedidoCompraDetailModalProps) {
  const [pedido, setPedido] = useState<PedidoCompra | null>(null);
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
      
      // Datos de ejemplo del pedido de compra
      const mockPedido: PedidoCompra = {
        id: pedidoId,
        numeroFactura: 'FC-001-00123',
        fecha: '2024-01-15',
        proveedor: {
          id: 'prov-1',
          nombre: 'Frutas del Valle SAC',
          ruc: '20123456789'
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
            cantidad: 50,
            precioUnitario: 2.50,
            subtotal: 125.00,
            stockAnterior: 20,
            stockNuevo: 70
          },
          {
            id: 'item-2',
            producto: {
              id: 'prod-2',
              nombre: 'Mango Kent',
              sku: 'MAN-KEN-001',
              categoria: 'Frutas Tropicales'
            },
            cantidad: 30,
            precioUnitario: 4.00,
            subtotal: 120.00,
            stockAnterior: 15,
            stockNuevo: 45
          },
          {
            id: 'item-3',
            producto: {
              id: 'prod-3',
              nombre: 'Plátano Orgánico',
              sku: 'PLA-ORG-001',
              categoria: 'Frutas Tropicales'
            },
            cantidad: 40,
            precioUnitario: 1.80,
            subtotal: 72.00,
            stockAnterior: 25,
            stockNuevo: 65
          }
        ],
        total: 317.00,
        estado: 'Completado',
        motivo: 'Reposición de inventario',
        observaciones: 'Productos en excelente estado, entrega puntual',
        createdAt: '2024-01-15T10:30:00Z'
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

  const getTotalStockIncrease = () => {
    if (!pedido) return 0;
    return pedido.items.reduce((total, item) => total + item.cantidad, 0);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Detalle del Pedido de Compra">
      <div className="max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center p-6 border-b border-gray-200">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Detalle del Pedido de Compra
            </h2>
            <p className="text-sm text-gray-500">
              {pedido?.numeroFactura || 'Cargando...'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando detalles del pedido...</p>
              </div>
            </div>
          ) : pedido ? (
            <div className="p-6 space-y-6">
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
                    <Building className="h-5 w-5 mr-2 text-gray-600" />
                    Información del Proveedor
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Nombre:</span>
                      <p className="text-sm text-gray-900">{pedido.proveedor.nombre}</p>
                    </div>
                    {pedido.proveedor.ruc && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">RUC:</span>
                        <p className="text-sm text-gray-900">{pedido.proveedor.ruc}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumen de Stock */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Resumen de Aumento de Stock
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{pedido.items.length}</p>
                    <p className="text-sm text-gray-600">Productos Diferentes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">+{getTotalStockIncrease()}</p>
                    <p className="text-sm text-gray-600">Unidades Totales</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(pedido.total)}</p>
                    <p className="text-sm text-gray-600">Valor Total</p>
                  </div>
                </div>
              </div>

              {/* Productos Comprados */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Productos Comprados
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
                          Stock Nuevo
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
                            <span className="text-sm font-medium text-green-600">
                              +{item.cantidad}
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
                            <span className="text-sm font-medium text-gray-900">
                              {item.stockNuevo}
                            </span>
                            <div className="text-xs text-green-600">
                              (+{item.cantidad})
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
                <Package className="mx-auto h-12 w-12 text-gray-400" />
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
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { X, Package, User, Calendar, DollarSign, Hash, CheckCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

const Modal = dynamic(() => import('../../src/components/ui/Modal'), { ssr: false });

interface MovimientoVenta {
  id: string;
  fecha: string;
  producto: {
    id: string;
    nombre: string;
    sku?: string;
  };
  cantidad: number;
  precio: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  usuario: {
    id: string;
    name: string;
  };
}

interface PedidoVenta {
  id: string;
  numeroFactura: string;
  fecha: string;
  cliente: {
    id: string;
    nombre: string;
  };
  usuario: {
    id: string;
    name: string;
  };
  total: number;
  totalProductos: number;
  totalUnidades: number;
  estado: 'Completado' | 'Pendiente' | 'Cancelado';
  movimientos: MovimientoVenta[];
}

interface PedidoVentaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pedidoId: string | null;
}

export default function PedidoVentaDetailModal({ isOpen, onClose, pedidoId }: PedidoVentaDetailModalProps) {
  const [pedido, setPedido] = useState<PedidoVenta | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && pedidoId) {
      loadPedidoDetails();
    }
  }, [isOpen, pedidoId]);

  const loadPedidoDetails = async () => {
    setLoading(true);
    try {
      // Simulando datos del pedido con movimientos detallados
      const mockPedido: PedidoVenta = {
        id: pedidoId!,
        numeroFactura: `FAC-${pedidoId?.slice(-6).toUpperCase()}`,
        fecha: '2024-01-15T10:30:00Z',
        cliente: {
          id: '1',
          nombre: 'Supermercado Central'
        },
        usuario: {
          id: '1',
          name: 'Juan Pérez'
        },
        total: 125000,
        totalProductos: 3,
        totalUnidades: 45,
        estado: 'Completado',
        movimientos: [
          {
            id: '1',
            fecha: '2024-01-15T10:30:00Z',
            producto: {
              id: '1',
              nombre: 'Manzanas Rojas',
              sku: 'MAN-001'
            },
            cantidad: 20,
            precio: 2500,
            cantidadAnterior: 100,
            cantidadNueva: 80,
            usuario: {
              id: '1',
              name: 'Juan Pérez'
            }
          },
          {
            id: '2',
            fecha: '2024-01-15T10:30:00Z',
            producto: {
              id: '2',
              nombre: 'Bananas',
              sku: 'BAN-001'
            },
            cantidad: 15,
            precio: 1800,
            cantidadAnterior: 80,
            cantidadNueva: 65,
            usuario: {
              id: '1',
              name: 'Juan Pérez'
            }
          },
          {
            id: '3',
            fecha: '2024-01-15T10:30:00Z',
            producto: {
              id: '3',
              nombre: 'Naranjas',
              sku: 'NAR-001'
            },
            cantidad: 10,
            precio: 2200,
            cantidadAnterior: 60,
            cantidadNueva: 50,
            usuario: {
              id: '1',
              name: 'Juan Pérez'
            }
          }
        ]
      };
      
      setPedido(mockPedido);
    } catch (error) {
      console.error('Error loading pedido details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Detalles del Pedido">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">
          Detalles del Pedido
        </h3>
      </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : pedido ? (
          <div className="space-y-6">
            {/* Información del pedido */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center space-x-3">
                  <Hash className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{pedido.numeroFactura}</p>
                    <p className="text-xs text-gray-500">Número de Factura</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatDate(pedido.fecha)}</p>
                    <p className="text-xs text-gray-500">Fecha de Venta</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{pedido.cliente.nombre}</p>
                    <p className="text-xs text-gray-500">Cliente</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      pedido.estado === 'Completado' 
                        ? 'bg-green-100 text-green-800' 
                        : pedido.estado === 'Pendiente'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pedido.estado}
                    </span>
                    <p className="text-xs text-gray-500">Estado</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen del pedido */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Resumen del Pedido</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{pedido.totalProductos}</div>
                  <div className="text-sm text-gray-600">Productos Diferentes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{pedido.totalUnidades}</div>
                  <div className="text-sm text-gray-600">Unidades Totales</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(pedido.total)}</div>
                  <div className="text-sm text-gray-600">Total de la Venta</div>
                </div>
              </div>
            </div>

            {/* Detalle de productos */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Productos Vendidos</h4>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
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
                        Subtotal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock Anterior
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock Actual
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pedido.movimientos.map((movimiento) => (
                      <tr key={movimiento.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Package className="h-5 w-5 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {movimiento.producto.nombre}
                              </div>
                              {movimiento.producto.sku && (
                                <div className="text-xs text-gray-500">
                                  SKU: {movimiento.producto.sku}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {movimiento.cantidad}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(movimiento.precio)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(movimiento.precio * movimiento.cantidad)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {movimiento.cantidadAnterior}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-green-600">
                            {movimiento.cantidadNueva}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Información del usuario */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Procesado por: {pedido.usuario.name}</p>
                  <p className="text-xs text-gray-500">Usuario del sistema</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No se pudo cargar la información del pedido.</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cerrar
          </button>
        </div>
    </Modal>
  );
}
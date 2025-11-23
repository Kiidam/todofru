'use client';

import * as React from 'react';
import { X, Package, Calendar, User, FileText, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';
import type { MovimientoInventario } from '../../../types/todafru';

interface MovimientoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  movimiento: MovimientoInventario | null;
  loading?: boolean;
  error?: Error | null;
}

export default function MovimientoDetailModal({
  isOpen,
  onClose,
  movimiento,
  loading = false,
  error = null
}: MovimientoDetailModalProps) {
  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'SALIDA':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      case 'AJUSTE':
        return <RotateCcw className="h-5 w-5 text-blue-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'SALIDA':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'AJUSTE':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Package className="h-6 w-6 text-orange-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">
                  Detalles del Movimiento
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <span className="ml-3 text-gray-600">Cargando detalles del movimiento...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error al cargar el movimiento</h3>
                    <div className="mt-2 text-sm text-red-700">
                      {error.message || 'Ha ocurrido un error inesperado'}
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={() => window.location.reload()}
                        className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                      >
                        Reintentar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!loading && !error && movimiento && (
              <div className="space-y-6">
                {/* Información básica */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Información General</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                        ID del Movimiento
                      </label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">
                        {movimiento.id}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Tipo de Movimiento
                      </label>
                      <div className="mt-1 flex items-center">
                        {getTipoIcon(movimiento.tipo)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTipoColor(movimiento.tipo)}`}>
                          {movimiento.tipo}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Fecha y Hora
                      </label>
                      <div className="mt-1 flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        {formatDate(movimiento.createdAt)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Usuario
                      </label>
                      <div className="mt-1 flex items-center text-sm text-gray-900">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        {movimiento.usuarioId || 'Sistema'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Información del producto */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Producto Afectado</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Nombre del Producto
                      </label>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {movimiento.producto?.nombre || 'Producto no disponible'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                        SKU
                      </label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">
                        {movimiento.producto?.sku || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Categoría
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {movimiento.producto?.categoria?.nombre || 'Sin categoría'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Precio Unitario
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatCurrency(movimiento.producto?.precio || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detalles del movimiento */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Detalles del Movimiento</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Cantidad
                      </label>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {movimiento.cantidad} {movimiento.producto?.unidadMedida?.simbolo || ''}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Stock Anterior
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {movimiento.cantidadAnterior || 0} {movimiento.producto?.unidadMedida?.simbolo || ''}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Stock Nuevo
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {movimiento.cantidadNueva || 0} {movimiento.producto?.unidadMedida?.simbolo || ''}
                      </p>
                    </div>
                  </div>

                  {movimiento.precio && (
                    <div className="mt-4 pt-4 border-t border-orange-200">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Valor Total del Movimiento
                      </label>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {formatCurrency(movimiento.cantidad * movimiento.precio)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Motivo */}
                {movimiento.motivo && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Motivo del Movimiento
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {movimiento.motivo}
                    </p>
                  </div>
                )}

                {/* Información adicional */}
                {(movimiento.pedidoCompraId || movimiento.pedidoVentaId) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Referencias</h4>
                    <div className="space-y-2">
                      {movimiento.pedidoCompraId && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Pedido de Compra
                          </label>
                          <p className="mt-1 text-sm text-gray-900 font-mono">
                            {movimiento.pedidoCompraId}
                          </p>
                        </div>
                      )}
                      {movimiento.pedidoVentaId && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Pedido de Venta
                          </label>
                          <p className="mt-1 text-sm text-gray-900 font-mono">
                            {movimiento.pedidoVentaId}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!loading && !error && !movimiento && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No se encontró información del movimiento</p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:w-auto sm:text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { X, Package, AlertTriangle, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useErrorHandler, ErrorState } from './ErrorBoundary';
import { LoadingButton, LoadingOverlay } from './LoadingState';
import type { TipoMovimiento, Producto, MovimientoInventario } from '../../../types/todafru';

interface CreateMovimientoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    productoId: string;
    tipo: TipoMovimiento;
    cantidad: number;
    motivo: string;
  }) => Promise<boolean>;
  productos: Producto[];
  movimiento?: MovimientoInventario | null;
}

interface FormData {
  productoId: string;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
}

interface FormErrors {
  productoId?: string;
  tipo?: string;
  cantidad?: string;
  motivo?: string;
}

export default function CreateMovimientoModal({
  isOpen,
  onClose,
  onSave,
  productos,
  movimiento
}: CreateMovimientoModalProps) {
  const { handleError } = useErrorHandler();
  const [formData, setFormData] = useState<FormData>({
    productoId: '',
    tipo: 'ENTRADA',
    cantidad: 0,
    motivo: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);

  // Resetear formulario cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      if (movimiento && movimiento.producto) {
        // Modo edición
        setFormData({
          productoId: movimiento.producto.id,
          tipo: movimiento.tipo,
          cantidad: movimiento.cantidad,
          motivo: movimiento.motivo || ''
        });
        setSelectedProduct(movimiento.producto);
      } else {
        // Modo creación
        setFormData({
          productoId: '',
          tipo: 'ENTRADA',
          cantidad: 0,
          motivo: ''
        });
        setSelectedProduct(null);
      }
      setErrors({});
    }
  }, [isOpen, movimiento]);

  // Actualizar producto seleccionado cuando cambie el ID
  useEffect(() => {
    if (formData.productoId) {
      const producto = productos.find(p => p.id === formData.productoId);
      setSelectedProduct(producto || null);
    } else {
      setSelectedProduct(null);
    }
  }, [formData.productoId, productos]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.productoId) {
      newErrors.productoId = 'Debe seleccionar un producto';
    }

    if (!formData.tipo) {
      newErrors.tipo = 'Debe seleccionar un tipo de movimiento';
    }

    if (!formData.cantidad || formData.cantidad <= 0) {
      newErrors.cantidad = 'La cantidad debe ser mayor a 0';
    }

    // Validar stock para movimientos de salida
    if (formData.tipo === 'SALIDA' && selectedProduct) {
      const stockDisponible = selectedProduct.stock || 0;
      if (formData.cantidad > stockDisponible) {
        newErrors.cantidad = `Stock insuficiente. Disponible: ${stockDisponible}`;
      }
    }

    if (!formData.motivo.trim()) {
      newErrors.motivo = 'Debe proporcionar un motivo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const success = await onSave({
        ...formData,
        cantidad: Number(formData.cantidad)
      });

      if (success) {
        toast.success(
          movimiento 
            ? 'Movimiento actualizado exitosamente' 
            : 'Movimiento creado exitosamente'
        );
        onClose();
      } else {
        throw new Error('No se pudo guardar el movimiento');
      }
    } catch (error) {
      console.error('Error al guardar movimiento:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      handleError(new Error(`Error al guardar: ${errorMessage}`));
      toast.error('Error al guardar el movimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = () => {
    const form = document.querySelector('form');
    if (form) {
      form.requestSubmit();
    }
  };

  const calcularNuevoStock = () => {
    if (!selectedProduct) return null;
    
    const stockActual = selectedProduct.stock || 0;
    let nuevoStock = stockActual;
    
    switch (formData.tipo) {
      case 'ENTRADA':
        nuevoStock = stockActual + formData.cantidad;
        break;
      case 'SALIDA':
        nuevoStock = stockActual - formData.cantidad;
        break;
      case 'AJUSTE':
        nuevoStock = formData.cantidad;
        break;
    }
    
    return nuevoStock;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {loading && <LoadingOverlay isVisible={loading} />}
          
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Package className="h-6 w-6 text-orange-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">
                  {movimiento ? 'Editar Movimiento' : 'Nuevo Movimiento de Inventario'}
                </h3>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selector de producto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Producto *
                </label>
                <select
                  value={formData.productoId}
                  onChange={(e) => setFormData({ ...formData, productoId: e.target.value })}
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 ${
                    errors.productoId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar producto...</option>
                  {productos.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.nombre} {producto.sku ? `(${producto.sku})` : ''}
                    </option>
                  ))}
                </select>
                {errors.productoId && (
                  <p className="mt-1 text-sm text-red-600">{errors.productoId}</p>
                )}
              </div>

              {/* Información del producto seleccionado */}
              {selectedProduct && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Información del Producto</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Stock actual:</span>
                      <span className="ml-2 font-medium">
                        {selectedProduct.stock || 0} {selectedProduct.unidadMedida?.simbolo}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Precio:</span>
                      <span className="ml-2 font-medium">
                        €{selectedProduct.precio?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                  {formData.cantidad > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <span className="text-gray-500">Nuevo stock:</span>
                      <span className={`ml-2 font-medium ${
                        calcularNuevoStock()! < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {calcularNuevoStock()} {selectedProduct.unidadMedida?.simbolo}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Tipo de movimiento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Movimiento *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoMovimiento })}
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 ${
                    errors.tipo ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="ENTRADA">Entrada</option>
                  <option value="SALIDA">Salida</option>
                  <option value="AJUSTE">Ajuste</option>
                </select>
                {errors.tipo && (
                  <p className="mt-1 text-sm text-red-600">{errors.tipo}</p>
                )}
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({ ...formData, cantidad: parseFloat(e.target.value) || 0 })}
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 ${
                    errors.cantidad ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.cantidad && (
                  <p className="mt-1 text-sm text-red-600">{errors.cantidad}</p>
                )}
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo *
                </label>
                <textarea
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  disabled={loading}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 ${
                    errors.motivo ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe el motivo del movimiento..."
                />
                {errors.motivo && (
                  <p className="mt-1 text-sm text-red-600">{errors.motivo}</p>
                )}
              </div>

              {/* Advertencia para stock negativo */}
              {formData.tipo === 'SALIDA' && selectedProduct && calcularNuevoStock()! < 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
                    <div className="text-sm text-red-700">
                      <strong>Advertencia:</strong> Este movimiento resultará en stock negativo.
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <LoadingButton
              loading={loading}
              onClick={handleButtonClick}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {movimiento ? 'Actualizar' : 'Crear'} Movimiento
            </LoadingButton>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
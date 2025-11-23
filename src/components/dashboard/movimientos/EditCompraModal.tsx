'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, Package, User, Calendar, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Producto {
  id: string;
  nombre: string;
  sku?: string;
  precio: number;
  stock: number;
  unidadMedida: {
    simbolo: string;
  };
}

interface Proveedor {
  id: string;
  nombre: string;
  ruc?: string;
  telefono?: string;
  email?: string;
}

interface CompraItem {
  id?: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface PedidoCompra {
  id: string;
  numeroFactura: string;
  fecha: string;
  observaciones?: string;
  proveedor: {
    id: string;
    nombre: string;
  };
  items: CompraItem[];
  total: number;
}

interface EditCompraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pedido: PedidoCompra | null;
}

export default function EditCompraModal({ isOpen, onClose, onSuccess, pedido }: EditCompraModalProps) {
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [formData, setFormData] = useState({
    proveedorId: '',
    fecha: '',
    observaciones: ''
  });
  
  const [items, setItems] = useState<CompraItem[]>([
    { productoId: '', cantidad: 1, precioUnitario: 0, subtotal: 0 }
  ]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar datos iniciales
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // Cargar datos del pedido cuando se abre el modal
  useEffect(() => {
    if (isOpen && pedido) {
      setFormData({
        proveedorId: pedido.proveedor.id,
        fecha: pedido.fecha.split('T')[0], // Convertir a formato YYYY-MM-DD
        observaciones: pedido.observaciones || ''
      });
      
      setItems(pedido.items.map(item => ({
        id: item.id,
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal
      })));
    }
  }, [isOpen, pedido]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      
      const [productosRes, proveedoresRes] = await Promise.all([
        fetch('/api/productos', { cache: 'no-store' }),
        fetch('/api/proveedores?page=1&limit=50', { cache: 'no-store' })
      ]);

      if (productosRes.ok) {
        const productosData = await productosRes.json();
        setProductos(productosData);
      }

      if (proveedoresRes.ok) {
        const proveedoresData = await proveedoresRes.json().catch(() => null);
        const arr = Array.isArray(proveedoresData?.data) ? proveedoresData.data : Array.isArray(proveedoresData?.data?.data) ? proveedoresData.data.data : Array.isArray(proveedoresData) ? proveedoresData : [];
        const list = Array.isArray(arr) ? arr : [];
        const opts = (list as unknown[]).map((item) => {
          const p = item as Record<string, unknown>;
          return { id: String(p['id'] ?? ''), nombre: String(p['nombre'] ?? p['razonSocial'] ?? `${p['nombres'] ?? ''} ${p['apellidos'] ?? ''}`.toString()).trim() };
        });
        setProveedores(opts);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoadingData(false);
    }
  };

  const resetForm = () => {
    setFormData({
      proveedorId: '',
      fecha: new Date().toISOString().split('T')[0],
      observaciones: ''
    });
    setItems([{ productoId: '', cantidad: 1, precioUnitario: 0, subtotal: 0 }]);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addItem = () => {
    setItems([...items, { productoId: '', cantidad: 1, precioUnitario: 0, subtotal: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof CompraItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalcular subtotal
    if (field === 'cantidad' || field === 'precioUnitario') {
      newItems[index].subtotal = newItems[index].cantidad * newItems[index].precioUnitario;
    }
    
    setItems(newItems);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.proveedorId) {
      newErrors.proveedorId = 'Debe seleccionar un proveedor';
    }

    if (!formData.fecha) {
      newErrors.fecha = 'Debe seleccionar una fecha';
    }

    // Validar items
    items.forEach((item, index) => {
      if (!item.productoId) {
        newErrors[`item_${index}_producto`] = 'Debe seleccionar un producto';
      }
      if (item.cantidad <= 0) {
        newErrors[`item_${index}_cantidad`] = 'La cantidad debe ser mayor a 0';
      }
      if (item.precioUnitario < 0) {
        newErrors[`item_${index}_precio`] = 'El precio no puede ser negativo';
      }
    });

    if (items.length === 0) {
      newErrors.items = 'Debe agregar al menos un producto';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!pedido) {
      toast.error('No se encontró el pedido a editar');
      return;
    }

    setLoading(true);

    try {
      const compraData = {
        proveedorId: formData.proveedorId,
        fecha: formData.fecha,
        observaciones: formData.observaciones,
        items: items.map(item => ({
          id: item.id,
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario
        }))
      };

      const response = await fetch(`/api/pedidos-compra/${pedido.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(compraData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar la compra');
      }

      toast.success('Compra actualizada exitosamente');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error updating compra:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar la compra');
    } finally {
      setLoading(false);
    }
  };

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Editar Compra</h2>
              <p className="text-sm text-gray-600">
                Pedido: {pedido?.numeroFactura}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loadingData ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Cargando datos...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4 inline mr-1" />
                    Proveedor *
                  </label>
                  <select
                    value={formData.proveedorId}
                    onChange={(e) => setFormData({ ...formData, proveedorId: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.proveedorId ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  >
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map((proveedor) => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre} {proveedor.ruc && `(${proveedor.ruc})`}
                      </option>
                    ))}
                  </select>
                  {errors.proveedorId && (
                    <p className="text-red-500 text-sm mt-1">{errors.proveedorId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.fecha ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.fecha && (
                    <p className="text-red-500 text-sm mt-1">{errors.fecha}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="h-4 w-4 inline mr-1" />
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Observaciones adicionales..."
                  disabled={loading}
                />
              </div>

              {/* Productos */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Productos</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Agregar Producto</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Producto *
                          </label>
                          <select
                            value={item.productoId}
                            onChange={(e) => updateItem(index, 'productoId', e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors[`item_${index}_producto`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={loading}
                          >
                            <option value="">Seleccionar producto</option>
                            {productos.map((producto) => (
                              <option key={producto.id} value={producto.id}>
                                {producto.nombre} {producto.sku && `(${producto.sku})`}
                              </option>
                            ))}
                          </select>
                          {errors[`item_${index}_producto`] && (
                            <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_producto`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cantidad *
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.cantidad}
                            onChange={(e) => updateItem(index, 'cantidad', parseInt(e.target.value) || 0)}
                            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors[`item_${index}_cantidad`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={loading}
                          />
                          {errors[`item_${index}_cantidad`] && (
                            <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_cantidad`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Precio Unitario *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.precioUnitario}
                            onChange={(e) => updateItem(index, 'precioUnitario', parseFloat(e.target.value) || 0)}
                            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors[`item_${index}_precio`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            disabled={loading}
                          />
                          {errors[`item_${index}_precio`] && (
                            <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_precio`]}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Subtotal
                            </label>
                            <p className="text-lg font-semibold text-gray-900">
                              S/ {item.subtotal.toFixed(2)}
                            </p>
                          </div>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {errors.items && (
                  <p className="text-red-500 text-sm mt-2">{errors.items}</p>
                )}
              </div>

              {/* Total */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total de la compra</p>
                    <p className="text-2xl font-bold text-gray-900">S/ {total.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || loadingData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{loading ? 'Actualizando...' : 'Actualizar Compra'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
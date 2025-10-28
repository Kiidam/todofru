'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, ShoppingBag, User, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Producto {
  id: string;
  nombre: string;
  sku?: string;
  precio: number;
  stock: number;
  tieneIGV: boolean;
  unidadMedida: {
    simbolo: string;
  };
}

interface Cliente {
  id: string;
  nombre: string;
  ruc?: string;
  telefono?: string;
  email?: string;
  tipoCliente: string;
}

interface VentaItem {
  id?: string;
  productoId: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

interface PedidoVenta {
  id: string;
  numeroFactura: string;
  fecha: string;
  fechaEntrega?: string;
  cliente: {
    id: string;
    nombre: string;
  };
  items: VentaItem[];
  subtotal: number;
  igv: number;
  total: number;
}

interface EditVentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pedido: PedidoVenta | null;
}

export default function EditVentaModal({ isOpen, onClose, onSuccess, pedido }: EditVentaModalProps) {
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [formData, setFormData] = useState({
    clienteId: '',
    fecha: '',
    fechaEntrega: ''
  });
  
  const [items, setItems] = useState<VentaItem[]>([
    { productoId: '', cantidad: 1, precio: 0, subtotal: 0 }
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
        clienteId: pedido.cliente.id,
        fecha: pedido.fecha.split('T')[0], // Convertir a formato YYYY-MM-DD
        fechaEntrega: pedido.fechaEntrega ? pedido.fechaEntrega.split('T')[0] : ''
      });
      
      setItems(pedido.items.map(item => ({
        id: item.id,
        productoId: item.productoId,
        cantidad: item.cantidad,
        precio: item.precio,
        subtotal: item.subtotal
      })));
    }
  }, [isOpen, pedido]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      
      const [productosRes, clientesRes] = await Promise.all([
        fetch('/api/productos', { cache: 'no-store' }),
        fetch('/api/clientes?page=1&limit=100', { cache: 'no-store' })
      ]);

      if (productosRes.ok) {
        const productosData = await productosRes.json();
        setProductos(productosData);
      }

      if (clientesRes.ok) {
        const clientesData = await clientesRes.json().catch(() => null);
        const arr = Array.isArray(clientesData?.data) ? clientesData.data : Array.isArray(clientesData?.data?.data) ? clientesData.data.data : Array.isArray(clientesData) ? clientesData : [];
        const list = Array.isArray(arr) ? arr : [];
        const opts = (list as unknown[]).map((item) => {
          const c = item as Record<string, unknown>;
          return { id: String(c['id'] ?? ''), nombre: String(c['nombre'] ?? c['razonSocial'] ?? '') };
        });
        setClientes(opts as Cliente[]);
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
      clienteId: '',
      fecha: new Date().toISOString().split('T')[0],
      fechaEntrega: ''
    });
    setItems([{ productoId: '', cantidad: 1, precio: 0, subtotal: 0 }]);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addItem = () => {
    setItems([...items, { productoId: '', cantidad: 1, precio: 0, subtotal: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof VentaItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalcular subtotal
    if (field === 'cantidad' || field === 'precio') {
      newItems[index].subtotal = newItems[index].cantidad * newItems[index].precio;
    }
    
    // Auto-completar precio del producto
    if (field === 'productoId' && value) {
      const producto = productos.find(p => p.id === value);
      if (producto) {
        newItems[index].precio = producto.precio;
        newItems[index].subtotal = newItems[index].cantidad * producto.precio;
      }
    }
    
    setItems(newItems);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.clienteId) {
      newErrors.clienteId = 'Debe seleccionar un cliente';
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
      if (item.precio < 0) {
        newErrors[`item_${index}_precio`] = 'El precio no puede ser negativo';
      }

      // Validar stock disponible
      const producto = productos.find(p => p.id === item.productoId);
      if (producto && item.cantidad > producto.stock) {
        newErrors[`item_${index}_cantidad`] = `Stock insuficiente. Disponible: ${producto.stock}`;
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
      const ventaData = {
        clienteId: formData.clienteId,
        fecha: formData.fecha,
        fechaEntrega: formData.fechaEntrega || null,
        items: items.map(item => ({
          id: item.id,
          productoId: item.productoId,
          cantidad: item.cantidad,
          precio: item.precio
        }))
      };

      const response = await fetch(`/api/pedidos-venta/${pedido.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ventaData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar la venta');
      }

      toast.success('Venta actualizada exitosamente');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error updating venta:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar la venta');
    } finally {
      setLoading(false);
    }
  };

  // Calcular totales
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const igv = subtotal * 0.18; // 18% IGV
  const total = subtotal + igv;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ShoppingBag className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Editar Venta</h2>
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
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              <span className="ml-2 text-gray-600">Cargando datos...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4 inline mr-1" />
                    Cliente *
                  </label>
                  <select
                    value={formData.clienteId}
                    onChange={(e) => setFormData({ ...formData, clienteId: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.clienteId ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  >
                    <option value="">Seleccionar cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre} {cliente.ruc && `(${cliente.ruc})`}
                      </option>
                    ))}
                  </select>
                  {errors.clienteId && (
                    <p className="text-red-500 text-sm mt-1">{errors.clienteId}</p>
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
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.fecha ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.fecha && (
                    <p className="text-red-500 text-sm mt-1">{errors.fecha}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Fecha de Entrega
                  </label>
                  <input
                    type="date"
                    value={formData.fechaEntrega}
                    onChange={(e) => setFormData({ ...formData, fechaEntrega: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Productos */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Productos</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Agregar Producto</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => {
                    const producto = productos.find(p => p.id === item.productoId);
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Producto *
                            </label>
                            <select
                              value={item.productoId}
                              onChange={(e) => updateItem(index, 'productoId', e.target.value)}
                              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                                errors[`item_${index}_producto`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                              disabled={loading}
                            >
                              <option value="">Seleccionar producto</option>
                              {productos.map((producto) => (
                                <option key={producto.id} value={producto.id}>
                                  {producto.nombre} {producto.sku && `(${producto.sku})`} - Stock: {producto.stock}
                                </option>
                              ))}
                            </select>
                            {errors[`item_${index}_producto`] && (
                              <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_producto`]}</p>
                            )}
                            {producto && (
                              <p className="text-xs text-gray-500 mt-1">
                                Stock disponible: {producto.stock} {producto.unidadMedida.simbolo}
                              </p>
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
                              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 ${
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
                              value={item.precio}
                              onChange={(e) => updateItem(index, 'precio', parseFloat(e.target.value) || 0)}
                              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 ${
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
                    );
                  })}
                </div>

                {errors.items && (
                  <p className="text-red-500 text-sm mt-2">{errors.items}</p>
                )}
              </div>

              {/* Totales */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="text-right space-y-2">
                    <div className="flex justify-between items-center w-48">
                      <span className="text-sm text-gray-600">Subtotal:</span>
                      <span className="font-medium">S/ {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center w-48">
                      <span className="text-sm text-gray-600">IGV (18%):</span>
                      <span className="font-medium">S/ {igv.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center w-48 border-t pt-2">
                      <span className="text-lg font-semibold text-gray-900">Total:</span>
                      <span className="text-xl font-bold text-gray-900">S/ {total.toFixed(2)}</span>
                    </div>
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
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{loading ? 'Actualizando...' : 'Actualizar Venta'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
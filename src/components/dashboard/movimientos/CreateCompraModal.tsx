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
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface CreateCompraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCompraModal({ isOpen, onClose, onSuccess }: CreateCompraModalProps) {
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [formData, setFormData] = useState({
    proveedorId: '',
    fecha: new Date().toISOString().split('T')[0],
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

  // Escuchar eventos globales de creación para actualizar la lista mientras el modal está abierto
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const ev = e as CustomEvent;
        if (!isOpen) return;
        if (ev?.detail?.type === 'proveedor' || ev?.detail?.type === 'producto') {
          // recargar proveedores con normalización
          (async () => {
            try {
              // If event is producto, refresh productos; if proveedor, refresh proveedores.
              if (ev?.detail?.type === 'proveedor') {
                const r = await fetch('/api/proveedores?activo=true&limit=1000', { cache: 'no-store' });
                if (!r.ok) return;
                const j = await r.json().catch(() => null);
                if (!j) return;
                const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j?.data?.data) ? j.data.data : Array.isArray(j) ? j : [];
                const list = Array.isArray(arr) ? arr : [];
                const isUUID = (v: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
                const normalized = (list as unknown[]).map((item) => {
                  const p = item as Record<string, unknown>;
                  return {
                    id: String(p['id'] ?? p['proveedorId'] ?? '').trim(),
                    nombre: String(p['nombre'] ?? p['razonSocial'] ?? `${p['nombres'] ?? ''} ${p['apellidos'] ?? ''}`.toString()).trim(),
                    ruc: (p['ruc'] ?? p['numeroIdentificacion']) as string | undefined,
                    telefono: p['telefono'] as string | undefined,
                    email: p['email'] as string | undefined,
                    activo: p['activo'] === undefined ? true : Boolean(p['activo']),
                  };
                })
                .filter((p) => p.id && isUUID(p.id) && p.nombre && p.activo)
                .filter((p, idx, arr2) => arr2.findIndex(x => x.id === p.id) === idx);
                if (normalized.length === 0) return;
                setProveedores(normalized);
              } else {
                // producto created -> refresh productos list
                try {
                  const pr = await fetch('/api/inventario?action=productos', { cache: 'no-store' });
                  if (!pr.ok) return;
                  const productosData = await pr.json().catch(() => ({}));
                  const arr = productosData?.productos ?? productosData?.data?.productos ?? productosData?.data ?? productosData ?? [];
                  const maybeData = (productosData && typeof productosData === 'object' && 'data' in (productosData as Record<string, unknown>)) ? (productosData as Record<string, unknown>)['data'] : productosData;
                  const resolved = Array.isArray(maybeData?.productos) ? maybeData.productos : Array.isArray(maybeData) ? maybeData : Array.isArray(arr) ? arr : [];
                  const normalizedProductos = (resolved as unknown[]).map((p) => {
                    const it = p as Record<string, unknown>;
                    return {
                      id: String(it['id'] ?? it['ID'] ?? ''),
                      nombre: String(it['nombre'] ?? it['name'] ?? ''),
                      sku: typeof it['sku'] === 'string' ? String(it['sku']) : undefined,
                      precio: Number(it['precio'] ?? it['price'] ?? 0) || 0,
                      stock: Number(it['stock'] ?? it['cantidad'] ?? 0) || 0,
                      unidadMedida: { simbolo: String((it['unidadMedida'] as Record<string, unknown>)?.['simbolo'] ?? (it['unidad'] as Record<string, unknown>)?.['simbolo'] ?? 'und') }
                    } as Producto;
                  }).filter(p => p.id && p.nombre);
                  if (normalizedProductos.length > 0) setProductos(normalizedProductos);
                } catch (err) {
                  console.error('Error refreshing productos after producto:create event', err);
                }
              }
            } catch (e) {
              console.error('event handler refresh proveedores error', e);
            }
          })();
        }
      } catch {}
    };
    if (typeof window !== 'undefined') window.addEventListener('entity:created', handler as EventListener);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('entity:created', handler as EventListener); };
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      
      const [productosRes, proveedoresRes] = await Promise.all([
        // Use inventory endpoint (returns { productos: [...] }) and fall back to /api/productos shape
        fetch('/api/inventario?action=productos', { cache: 'no-store' }),
        // Force fresh providers list so newly created proveedores are available immediately
    fetch('/api/proveedores?simple=true&activo=true&limit=1000', { cache: 'no-store' })
      ]);

      if (productosRes.ok) {
        const productosData = await productosRes.json().catch(() => ({}));
        // Support response shapes and normalize to an array of productos
        // Common shapes:
        // - { productos: [...] }
        // - { data: { productos: [...] } }
        // - { data: [...] }
        // - [...]
        const arr = productosData?.productos ?? productosData?.data?.productos ?? productosData?.data ?? productosData ?? [];
        const maybeData = (productosData && typeof productosData === 'object' && 'data' in (productosData as Record<string, unknown>)) ? (productosData as Record<string, unknown>)['data'] : productosData;
        const resolved = Array.isArray(maybeData?.productos) ? maybeData.productos : Array.isArray(maybeData) ? maybeData : Array.isArray(arr) ? arr : [];
        // Ensure shape matches Producto[] expected by component
        const normalizedProductos = (resolved as unknown[]).map((p) => {
          const it = p as Record<string, unknown>;
          return {
            id: String(it['id'] ?? it['ID'] ?? ''),
            nombre: String(it['nombre'] ?? it['name'] ?? ''),
            sku: typeof it['sku'] === 'string' ? String(it['sku']) : undefined,
            precio: Number(it['precio'] ?? it['price'] ?? 0) || 0,
            stock: Number(it['stock'] ?? it['cantidad'] ?? 0) || 0,
            unidadMedida: { simbolo: String((it['unidadMedida'] as Record<string, unknown>)?.['simbolo'] ?? (it['unidad'] as Record<string, unknown>)?.['simbolo'] ?? 'und') }
          } as Producto;
        }).filter(p => p.id && p.nombre);
        setProductos(normalizedProductos);
      } else {
        // Fallback: try the legacy /api/productos endpoint which may be public or return a different shape
        try {
          const fallback = await fetch('/api/productos?simple=true&limit=1000', { cache: 'no-store' });
          if (fallback.ok) {
            const raw = await fallback.json().catch(() => ({}));
            const arr = raw?.data?.data ?? raw?.data ?? raw ?? [];
            const list = Array.isArray(arr) ? arr : [];
            const normalizedProductos = (list as unknown[]).map((p) => {
              const it = p as Record<string, unknown>;
              return {
                id: String(it['id'] ?? it['ID'] ?? ''),
                nombre: String(it['nombre'] ?? it['name'] ?? ''),
                sku: typeof it['sku'] === 'string' ? String(it['sku']) : undefined,
                precio: Number(it['precio'] ?? it['price'] ?? 0) || 0,
                stock: Number(it['stock'] ?? it['cantidad'] ?? 0) || 0,
                unidadMedida: { simbolo: String((it['unidadMedida'] as Record<string, unknown>)?.['simbolo'] ?? (it['unidad'] as Record<string, unknown>)?.['simbolo'] ?? 'und') }
              } as Producto;
            }).filter(p => p.id && p.nombre);
            if (normalizedProductos.length > 0) setProductos(normalizedProductos);
          }
        } catch (err) {
          console.warn('No se pudo obtener productos por fallback', err);
        }
        // final fallback to public endpoint
        if ((productos.length === 0)) {
          try {
            const pub = await fetch('/api/public/productos', { cache: 'no-store' });
            if (pub.ok) {
              const raw = await pub.json().catch(() => ({}));
              const list = raw?.data ?? raw ?? [];
              const normalized = (Array.isArray(list) ? list : []).map((it: unknown) => {
                const obj = it as Record<string, unknown>;
                return {
                  id: String(obj['id'] ?? obj['ID'] ?? ''),
                  nombre: String(obj['nombre'] ?? obj['name'] ?? ''),
                  sku: typeof obj['sku'] === 'string' ? String(obj['sku']) : undefined,
                  precio: Number(obj['precio'] ?? obj['price'] ?? 0) || 0,
                  stock: Number(obj['stock'] ?? obj['cantidad'] ?? 0) || 0,
                  unidadMedida: { simbolo: String(((obj['unidadMedida'] as Record<string, unknown>)?.['simbolo']) ?? ((obj['unidad'] as Record<string, unknown>)?.['simbolo']) ?? 'und') }
                } as Producto;
              }).filter((p: Producto) => p.id && p.nombre);
              if (normalized.length > 0) setProductos(normalized as Producto[]);
            }
          } catch (e) {
            // ignore
          }
        }
      }

      if (proveedoresRes.ok) {
        const proveedoresData = await proveedoresRes.json().catch(() => null);
        const arr = proveedoresData?.data?.data ?? proveedoresData?.data ?? proveedoresData?.proveedores ?? proveedoresData ?? [];
        const list = Array.isArray(arr) ? arr : [];
        const isUUID = (v: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
        const normalized = (list as unknown[]).map((item) => {
          const p = item as Record<string, unknown>;
          return {
            id: String(p['id'] ?? p['proveedorId'] ?? '').trim(),
            nombre: String(p['nombre'] ?? p['razonSocial'] ?? `${p['nombres'] ?? ''} ${p['apellidos'] ?? ''}`.toString()).trim(),
            ruc: (p['ruc'] ?? p['numeroIdentificacion']) as string | undefined,
            telefono: p['telefono'] as string | undefined,
            email: p['email'] as string | undefined,
            activo: p['activo'] === undefined ? true : Boolean(p['activo']),
          };
        })
        .filter((p) => p.id && isUUID(p.id) && p.nombre && p.activo)
        .filter((p, idx, arr2) => arr2.findIndex(x => x.id === p.id) === idx);

        setProveedores(normalized);
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

    // Verificar productos duplicados
    const productosUsados = items.map(item => item.productoId).filter(Boolean);
    const duplicados = productosUsados.filter((id, index) => productosUsados.indexOf(id) !== index);
    if (duplicados.length > 0) {
      newErrors.duplicados = 'No puede agregar el mismo producto múltiples veces';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor corrija los errores en el formulario');
      return;
    }

    try {
      setLoading(true);

      const compraData = {
        proveedorId: formData.proveedorId,
        fecha: formData.fecha,
        observaciones: formData.observaciones || undefined,
        items: items.map(item => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario
        }))
      };

      const response = await fetch('/api/pedidos-compra', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(compraData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la compra');
      }

      const result = await response.json();
      toast.success('Compra creada exitosamente');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error creating compra:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear la compra');
    } finally {
      setLoading(false);
    }
  };

  const getProductoById = (id: string) => productos.find(p => p.id === id);
  const getProveedorById = (id: string) => proveedores.find(p => p.id === id);

  const totalCompra = items.reduce((sum, item) => sum + item.subtotal, 0);

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
            <h2 className="text-xl font-bold text-gray-900">Nueva Compra</h2>
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
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {loadingData ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Cargando datos...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Información general */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    Proveedor *
                  </label>
                  <select
                    value={formData.proveedorId}
                    onChange={(e) => setFormData({ ...formData, proveedorId: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.proveedorId ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.map((proveedor) => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre} {proveedor.ruc ? `(${proveedor.ruc})` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.proveedorId && (
                    <p className="mt-1 text-sm text-red-600">{errors.proveedorId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.fecha ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.fecha && (
                    <p className="mt-1 text-sm text-red-600">{errors.fecha}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Observaciones adicionales..."
                  disabled={loading}
                />
              </div>

              {/* Items */}
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

                {errors.duplicados && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{errors.duplicados}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Producto *
                          </label>
                          <select
                            value={item.productoId}
                            onChange={(e) => updateItem(index, 'productoId', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors[`item_${index}_producto`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                            disabled={loading}
                          >
                            <option value="">Seleccionar producto...</option>
                            {productos.map((producto) => (
                              <option key={producto.id} value={producto.id}>
                                {producto.nombre} {producto.sku ? `(${producto.sku})` : ''}
                              </option>
                            ))}
                          </select>
                          {errors[`item_${index}_producto`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_producto`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cantidad *
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.cantidad}
                            onChange={(e) => updateItem(index, 'cantidad', parseFloat(e.target.value) || 0)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors[`item_${index}_cantidad`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                            disabled={loading}
                          />
                          {errors[`item_${index}_cantidad`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_cantidad`]}</p>
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
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors[`item_${index}_precio`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                            disabled={loading}
                          />
                          {errors[`item_${index}_precio`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`item_${index}_precio`]}</p>
                          )}
                        </div>

                        <div className="flex items-end">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Subtotal
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                              S/ {item.subtotal.toFixed(2)}
                            </div>
                          </div>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Información del producto seleccionado */}
                      {item.productoId && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          {(() => {
                            const producto = getProductoById(item.productoId);
                            return producto ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Stock actual:</span>
                                  <span className="ml-2 font-medium">{producto.stock} {producto.unidadMedida.simbolo}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Precio sugerido:</span>
                                  <span className="ml-2 font-medium">S/ {producto.precio.toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">SKU:</span>
                                  <span className="ml-2 font-medium">{producto.sku || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Unidad:</span>
                                  <span className="ml-2 font-medium">{producto.unidadMedida.simbolo}</span>
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Show helpful message if no products were loaded */}
                {(!loadingData && productos.length === 0) && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">No se cargaron productos. Es posible que no tenga permisos para ver el inventario en este momento.</p>
                    <p className="text-sm text-yellow-700 mt-2">Puede crear productos desde el botón &quot;Agregar Producto&quot; o contactar al administrador para obtener acceso.</p>
                  </div>
                )}

                {/* Total */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total de la Compra:</span>
                    <span className="text-xl font-bold text-blue-600">S/ {totalCompra.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!loadingData && (
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
              disabled={loading || items.length === 0}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{loading ? 'Creando...' : 'Crear Compra'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
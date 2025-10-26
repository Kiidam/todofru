"use client";

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Eye, Printer, Edit2 } from 'lucide-react';
import { emitirInventarioEvento } from '@/lib/inventory-channel';
import Filters, { MovimientosFiltersState } from '@/components/dashboard/movimientos/Filters';
import { useAuth } from '@/hooks/useAuth';

const Modal = dynamic(() => import('@/components/ui/Modal'), { ssr: false });

type ProductoOption = {
  id: string;
  nombre: string;
  sku: string | null;
  unidadMedida?: { simbolo: string } | null;
};

type ProveedorOption = {
  id: string;
  nombre: string;
  ruc?: string | null;
};

type PurchaseItem = {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  unidad?: string | null;
};

type Purchase = {
  id: string;
  numero: string;
  fecha: string; // ISO
  proveedorId: string;
  proveedorNombre: string;
  usuario: string;
  items: PurchaseItem[];
  total: number;
};

function formatDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function formatDateLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function currency(num: number) {
  try {
    return num.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' });
  } catch {
    return `S/ ${num.toFixed(2)}`;
  }
}

function GuiaRemisionPreview({
  fecha,
  producto,
  precio,
  cantidad,
  usuario,
}: {
  fecha: string;
  producto: ProductoOption | null;
  precio: number;
  cantidad: number;
  usuario?: string | null;
}) {
  const total = precio * cantidad;
  return (
    <div className="bg-white rounded-lg shadow border" id="print-area">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">Guía de Remisión - Compra</h2>
        <p className="text-gray-600">Documento de remisión para ingreso por compras</p>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium text-gray-800 mb-2">Datos del Movimiento</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-600">Fecha</dt><dd className="text-gray-900">{new Date(fecha).toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Responsable</dt><dd className="text-gray-900">{usuario ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Producto</dt><dd className="text-gray-900">{producto ? producto.nombre : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">SKU</dt><dd className="text-gray-900">{producto?.sku ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Unidad</dt><dd className="text-gray-900">{producto?.unidadMedida?.simbolo ?? '—'}</dd></div>
          </dl>
        </div>
        <div>
          <h3 className="font-medium text-gray-800 mb-2">Detalle</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-600">Precio de Compra</dt><dd className="text-gray-900">{currency(precio)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Cantidad</dt><dd className="text-gray-900">{cantidad}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-600">Total</dt><dd className="text-gray-900 font-semibold">{currency(total)}</dd></div>
          </dl>
        </div>
      </div>
      <div className="px-6 pb-6">
        <p className="text-xs text-gray-500">Nota: Este documento es una representación de guía de remisión para registro interno de compras.</p>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}

export default function MovimientosComprasPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<MovimientosFiltersState>({
    searchTerm: '',
    fechaDesde: '',
    fechaHasta: '',
    pageSize: 10,
  });

  // Compras registradas (mock inicial + registros locales)
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);

  // Selectores
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorOption[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [loadingProveedores, setLoadingProveedores] = useState(false);

  // Formulario principal de compra
  const [form, setForm] = useState({
    fecha: formatDateLocal(new Date()),
    proveedorId: '',
  });

  // Entrada de ítem actual
  const [entry, setEntry] = useState({
    productoId: '',
    cantidad: 1,
    precioCompraTotal: 0,
    precioUnitario: 0,
  });

  // Ítems agregados a la compra actual
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);

  // Estado del modal
  const [registerOpen, setRegisterOpen] = useState(false);

  // Formulario simple de orden (solo los campos solicitados)
  const [simpleEntry, setSimpleEntry] = useState({
    productoId: '',
    cantidad: 1,
    precioCompraTotal: 0,
    precioUnitario: 0,
    calcularAutomatico: true,
  });
  const [simpleOrders, setSimpleOrders] = useState<PurchaseItem[]>([]);

  // Función para cargar pedidos de compra
  const fetchPurchases = async (showLoading = true) => {
    try {
      if (showLoading) setLoadingPurchases(true);
      const res = await fetch('/api/pedidos-compra?page=1&limit=50');
      if (res.ok) {
        const json = await res.json();
        const arr = Array.isArray(json?.data) ? json.data : [];
        const purchasesList: Purchase[] = arr.map((p: any) => ({
          id: p.id,
          numero: p.numero || `PC-${p.id}`,
          fecha: p.fecha || new Date().toISOString(),
          proveedorId: p.proveedorId || '',
          proveedorNombre: p.proveedor?.nombre || 'Proveedor',
          usuario: p.usuario?.name || 'Sistema',
          items: Array.isArray(p.items) ? p.items.map((item: any) => ({
            productoId: item.productoId || '',
            nombre: item.producto?.nombre || 'Producto',
            cantidad: Number(item.cantidad) || 0,
            precioUnitario: Number(item.precio) || 0,
            unidad: item.producto?.unidadMedida?.simbolo || 'unidad',
          })) : [],
          total: Number(p.total) || 0,
          subtotal: Number(p.subtotal) || 0,
          impuestos: Number(p.impuestos) || 0,
          observaciones: p.observaciones || '',
          fechaEntrega: p.fechaEntrega || null,
        }));
        setPurchases(purchasesList);
      }
    } catch (error) {
      console.error('Error al cargar pedidos de compra:', error);
    } finally {
      if (showLoading) setLoadingPurchases(false);
    }
  };

  useEffect(() => {
    // Cargar datos iniciales
    fetchPurchases();

    const fetchProductos = async () => {
      try {
        setLoadingProductos(true);
        const res = await fetch('/api/inventario?action=productos');
        if (res.ok) {
          const json = await res.json();
          const arr = json?.productos || [];
          const opts: ProductoOption[] = arr.map((p: any) => ({
            id: p.id,
            nombre: p.nombre,
            sku: p.sku ?? null,
            unidadMedida: p.unidadMedida ?? null,
          }));
          setProductos(opts);
        } else {
          console.warn('No se encontraron productos en la API');
          setProductos([]);
        }
      } catch (error) {
        console.error('Error al cargar productos:', error);
        setProductos([]);
      } finally {
        setLoadingProductos(false);
      }
    };
    const fetchProveedores = async () => {
      try {
        setLoadingProveedores(true);
        const res = await fetch('/api/proveedores?page=1&limit=50');
        if (!res.ok) {
          console.error('Error al obtener proveedores:', res.status, res.statusText);
          setProveedores([]);
          return;
        }
        const json = await res.json();
        const arr = Array.isArray(json?.data) ? json.data : [];
        if (arr.length > 0) {
          const opts: ProveedorOption[] = arr.map((p: any) => ({
            id: p.id,
            nombre: p.nombre || p.razonSocial || `${p.nombres || ''} ${p.apellidos || ''}`.trim() || 'Sin nombre',
            ruc: p.numeroIdentificacion || p.ruc || null
          }));
          setProveedores(opts);
        } else {
          // Solo usar fallback si realmente no hay datos en la base de datos
          console.warn('No se encontraron proveedores en la base de datos');
          setProveedores([]);
        }
      } catch (error) {
        console.error('Error al cargar proveedores:', error);
        setProveedores([]);
      } finally {
        setLoadingProveedores(false);
      }
    };
    fetchPurchases();
    fetchProductos();
    fetchProveedores();
  }, []);

  const selectedProducto = useMemo(
    () => productos.find(p => p.id === entry.productoId) || null,
    [productos, entry.productoId]
  );

  const selectedProveedor = useMemo(
    () => proveedores.find(p => p.id === form.proveedorId) || null,
    [proveedores, form.proveedorId]
  );

  const selectedSimpleProducto = useMemo(
    () => productos.find(p => p.id === simpleEntry.productoId) || null,
    [productos, simpleEntry.productoId]
  );

  // Actualización en línea de ítems
  const updateItemQty = (idx: number, qty: number) => {
    setPurchaseItems(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: Math.max(1, qty) } : it));
  };
  const updateItemPrice = (idx: number, price: number) => {
    setPurchaseItems(prev => prev.map((it, i) => i === idx ? { ...it, precioUnitario: Math.max(0, Number(price)) } : it));
  };
  const updateItemUnit = (idx: number, unidad: string) => {
    setPurchaseItems(prev => prev.map((it, i) => i === idx ? { ...it, unidad } : it));
  };

  const purchaseTotalTemp = useMemo(() => purchaseItems.reduce((sum, it) => sum + (it.cantidad * it.precioUnitario), 0), [purchaseItems]);

  const canRegisterPurchase = Boolean(form.fecha && form.proveedorId && purchaseItems.length > 0);

  const [registering, setRegistering] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Cálculo automático para el formulario simple
  useEffect(() => {
    if (simpleEntry.calcularAutomatico) {
      const unit = simpleEntry.cantidad > 0 ? (simpleEntry.precioCompraTotal / simpleEntry.cantidad) : 0;
      setSimpleEntry(s => ({ ...s, precioUnitario: Number.isFinite(unit) ? Number(unit.toFixed(4)) : 0 }));
    }
  }, [simpleEntry.precioCompraTotal, simpleEntry.cantidad, simpleEntry.calcularAutomatico]);

  const canSaveSimple = Boolean(simpleEntry.productoId && simpleEntry.cantidad > 0 && (simpleEntry.calcularAutomatico ? simpleEntry.precioCompraTotal > 0 : simpleEntry.precioUnitario > 0));

  // Filtrar compras directamente
  const filteredPurchases = useMemo(() => {
    let rs = purchases;
    const { searchTerm, fechaDesde, fechaHasta } = filters;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rs = rs.filter(purchase => 
        purchase.numero.toLowerCase().includes(term) ||
        purchase.proveedorNombre.toLowerCase().includes(term) ||
        purchase.items.some(item => item.nombre.toLowerCase().includes(term))
      );
    }
    
    if (fechaDesde) {
      const desde = new Date(fechaDesde).getTime();
      rs = rs.filter(purchase => new Date(purchase.fecha).getTime() >= desde);
    }
    
    if (fechaHasta) {
      const hasta = new Date(fechaHasta).getTime();
      rs = rs.filter(purchase => new Date(purchase.fecha).getTime() <= hasta);
    }
    
    return rs;
  }, [purchases, filters]);

  // Auto-agregar item al seleccionar producto
  const autoAddFromSelection = (prod: ProductoOption) => {
    const unidad = prod?.unidadMedida?.simbolo ?? 'unidad';
    const item: PurchaseItem = {
      productoId: prod.id,
      nombre: prod.nombre,
      cantidad: 1,
      precioUnitario: 0,
      unidad,
    };
    setPurchaseItems(prev => [...prev, item]);
    setEntry(e => ({ ...e, productoId: '', cantidad: 1, precioCompraTotal: 0, precioUnitario: 0 }));
  };

  const removeItemAt = (idx: number) => {
    setPurchaseItems(prev => prev.filter((_, i) => i !== idx));
  };

  const registerPurchase = async () => {
    if (!canRegisterPurchase || registering) return;
    setSubmitError(null);
    setRegistering(true);
    try {
      const payload = {
        proveedorId: form.proveedorId,
        fecha: form.fecha,
        observaciones: undefined,
        items: purchaseItems.map(it => ({
          productoId: it.productoId,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
          unidad: it.unidad ?? undefined,
        })),
      };

      let res: Response;
      try {
        res = await fetch('/api/pedidos-compra', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (err: any) {
        const msg = (err && typeof err.message === 'string') ? err.message : 'Error de red al contactar el servidor';
        setSubmitError(msg);
        alert(`No se pudo registrar la compra: ${msg}`);
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        const msg = json?.error || `Error ${res.status}`;
        setSubmitError(msg);
        alert(`No se pudo registrar la compra: ${msg}`);
        return;
      }

      // Recargar la lista de compras después de registrar exitosamente
      await fetchPurchases(false);

      // Emitir eventos de inventario por cada ítem (ENTRADA) para refrescos locales
      try {
        purchaseItems.forEach((it: PurchaseItem) => {
          if (it.productoId && it.cantidad > 0) {
            emitirInventarioEvento({ tipo: 'ENTRADA', productoId: it.productoId, delta: it.cantidad });
          }
        });
      } catch {}

      setPurchaseItems([]);
      setRegisterOpen(false);
      setForm({ fecha: formatDateLocal(new Date()), proveedorId: '' });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Movimientos - Compras</h1>
        <p className="text-gray-600">Entradas al inventario derivadas de compras</p>
      </div>

      {/* Acción principal: solo el botón */}
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={() => {
            setEntry({ productoId: '', cantidad: 1, precioCompraTotal: 0, precioUnitario: 0 });
            // Iniciar sin ítems predefinidos; el usuario agregará productos manualmente
            setPurchaseItems([]);
            setForm({ fecha: formatDateLocal(new Date()), proveedorId: '' });
            setRegisterOpen(true);
          }}
          className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
        >
          Registrar compra
        </button>
      </div>

      {/* Lista y filtros (atributos solicitados) */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <Filters state={filters} onChange={(next) => setFilters(prev => ({ ...prev, ...next }))} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Compra</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de compra</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total de la compra</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingPurchases ? (
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-600" colSpan={5}>Cargando compras...</td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td className="px-4 py-2 text-sm text-gray-600" colSpan={5}>
                    {purchases.length === 0 ? 'Sin compras registradas' : 'No se encontraron compras con los filtros aplicados'}
                  </td>
                </tr>
              ) : filteredPurchases.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-900">{c.numero}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{c.proveedorNombre}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{new Date(c.fecha).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(c.total)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    <div className="flex items-center gap-3">
                      <button type="button" title="Ver" className="text-green-600 hover:text-green-800"><Eye className="h-5 w-5" /></button>
                      <button type="button" title="Imprimir" onClick={() => setTimeout(() => window.print(), 300)} className="text-gray-700 hover:text-gray-900"><Printer className="h-5 w-5" /></button>
                      <button type="button" title="Editar" onClick={() => alert('Edición de compra pendiente')} className="text-blue-600 hover:text-blue-800"><Edit2 className="h-5 w-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar Compra */}
      <Modal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} ariaLabel="Registrar compra">
        <form className="w-full" onSubmit={(e) => { e.preventDefault(); registerPurchase(); }}>
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-bold text-gray-900">Registrar Compra</h3>
          </div>

          {/* Datos generales */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de compra</label>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <select value={form.proveedorId} onChange={(e) => setForm({ ...form, proveedorId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" required>
                <option value="" disabled>
                  {loadingProveedores 
                    ? 'Cargando proveedores...' 
                    : proveedores.length === 0 
                      ? 'No hay proveedores disponibles' 
                      : 'Seleccione un proveedor'
                  }
                </option>
                {proveedores.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
              </select>
              {!loadingProveedores && proveedores.length === 0 && (
                <p className="mt-1 text-sm text-amber-600">
                  No se encontraron proveedores. <a href="/dashboard/proveedores" className="text-blue-600 hover:text-blue-800 underline">Agregar proveedor</a>
                </p>
              )}
            </div>
          </div>

          {/* Ítem de compra - selector de producto (sin unidad redundante) */}
          <div className="mt-6">
            <div className="grid grid-cols-1 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                <select
                  value={entry.productoId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const prod = productos.find(p => p.id === id);
                    if (!prod) return;
                    const unidad = prod?.unidadMedida?.simbolo ?? 'unidad';
                    const item: PurchaseItem = {
                      productoId: prod.id,
                      nombre: prod.nombre,
                      cantidad: 1,
                      precioUnitario: 0,
                      unidad,
                    };
                    setPurchaseItems(prev => [...prev, item]);
                    setEntry({ productoId: '', cantidad: 1, precioCompraTotal: 0, precioUnitario: 0 });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  // Solo requerir selección si aún no hay ítems agregados
                  required={purchaseItems.length === 0}
                >
                  <option value="" disabled>{loadingProductos ? 'Cargando productos...' : 'Seleccione un producto'}</option>
                  {productos.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
                </select>
              </div>
            </div>
          </div>

          {/* Items agregados */}
          <div className="mt-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">P. Unitario</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseItems.length === 0 ? (
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-600" colSpan={6}>Sin productos agregados</td>
                  </tr>
                ) : purchaseItems.map((it, idx) => (
                  <tr key={`it-${idx}`}>
                    <td className="px-4 py-2 text-sm text-gray-900">{it.nombre}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={it.cantidad}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateItemQty(idx, Number(e.target.value))}
                        className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <select
                        value={it.unidad ?? 'unidad'}
                        onChange={(e) => updateItemUnit(idx, e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="unidad">unidad</option>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="t">t</option>
                        <option value="lt">lt</option>
                        <option value="ml">ml</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <input
                        type="number"
                        min={0}
                        step={0.0001}
                        value={it.precioUnitario}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateItemPrice(idx, Number(e.target.value))}
                        className="w-32 px-2 py-1 border border-gray-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(it.cantidad * it.precioUnitario)}</td>
                    <td className="px-4 py-2 text-sm">
                      <button type="button" onClick={() => removeItemAt(idx)} className="text-red-600 hover:text-red-800">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex justify-end">
              <div className="text-sm text-gray-700">Total compra: <span className="font-semibold">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(purchaseTotalTemp)}</span></div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setRegisterOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100">Cancelar</button>
            <button type="submit" disabled={!canRegisterPurchase || registering} className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
              {registering ? 'Registrando…' : 'Registrar compra'}
            </button>
          </div>
        </form>
      </Modal>

      {/* El formulario simple se ha eliminado para evitar duplicidad y confusión */}

    </div>
  );
}